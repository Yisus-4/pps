import os
from pathlib import Path
import pytest
from app.models.escuela import Escuela
from app.models.propuesta import PropuestaFormativa
from app.models.alumno import Alumno

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_parse_and_upload_xlsx(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    assert esc_ing is not None

    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"
    assert xlsx_path.exists()

    with open(xlsx_path, "rb") as f:
        response = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["escuela"] == "Escuela de Ingeniería"
    assert "Mecatrónica" in data["propuesta"] or "Mecatr" in data["propuesta"]
    # Total rows in SIU: 278 (275 unique students, 3 duplicate inscription rows updated)
    assert data["total_procesados"] == 278
    assert data["nuevos"] == 275
    assert data["actualizados"] == 3

    # Verify database state
    propuesta = db_session.query(PropuestaFormativa).filter(
        PropuestaFormativa.escuela_id == esc_ing.id
    ).first()
    assert propuesta is not None
    assert propuesta.plan_codigo == "02317"
    assert propuesta.version_plan == "02317-5"
    assert propuesta.ubicacion == "Campus Universitario-Los Sarmientos"

    alumnos_count = db_session.query(Alumno).filter(Alumno.propuesta_id == propuesta.id).count()
    assert alumnos_count == 275

    # Verify a specific student
    alumno_aballay = db_session.query(Alumno).filter(
        Alumno.documento == "DNI 35541439"
    ).first()
    assert alumno_aballay is not None
    assert alumno_aballay.apellido_nombre == "ABALLAY, Kevin Paul"
    assert alumno_aballay.email == "aballaykevin@yahoo.com"
    assert alumno_aballay.legajo == "410047"
    assert alumno_aballay.anio_ingreso == 2019

    # Verify footer row was not inserted
    footer_row = db_session.query(Alumno).filter(
        Alumno.apellido_nombre.ilike("%Total Propuesta%")
    ).first()
    assert footer_row is None


def test_parse_and_upload_csv(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    csv_path = FIXTURES_DIR / "sample_meca.csv"
    assert csv_path.exists()

    with open(csv_path, "rb") as f:
        response = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.csv", f, "text/csv")}
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total_procesados"] == 278
    assert data["nuevos"] == 275
    assert data["actualizados"] == 3


def test_upsert_idempotency_and_update(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"

    # First upload
    with open(xlsx_path, "rb") as f:
        res1 = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
    assert res1.status_code == 200
    assert res1.json()["total_procesados"] == 278
    assert res1.json()["nuevos"] == 275
    assert res1.json()["actualizados"] == 3

    total_first = db_session.query(Alumno).count()
    assert total_first == 275

    # Second upload with the same file -> 0 nuevos, 278 actualizados
    with open(xlsx_path, "rb") as f:
        res2 = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
    assert res2.status_code == 200
    assert res2.json()["total_procesados"] == 278
    assert res2.json()["nuevos"] == 0
    assert res2.json()["actualizados"] == 278

    # Ensure count in DB did not duplicate
    total_second = db_session.query(Alumno).count()
    assert total_second == 275


def test_upload_mismatched_escuela_raises_400(client, admin_headers, db_session):
    # The file is for "Escuela de Ingeniería", but we select "Escuela de Ciencias Sociales"
    esc_soc = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ciencias Sociales").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"

    with open(xlsx_path, "rb") as f:
        response = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_soc.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

    assert response.status_code == 400
    assert "corresponde a la Responsable Académica" in response.json()["detail"]


def test_upload_unauthorized_school_user_raises_403(client, sociales_headers, db_session):
    # User is responsible for Escuela de Ciencias Sociales, tries to upload to Escuela de Ingeniería
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"

    with open(xlsx_path, "rb") as f:
        response = client.post(
            "/api/upload",
            headers={"Authorization": sociales_headers["Authorization"]},
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

    assert response.status_code == 403
    assert "No tiene permisos" in response.json()["detail"]
