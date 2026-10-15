from pathlib import Path
import pytest
from app.models.escuela import Escuela
from app.models.propuesta import PropuestaFormativa
from app.models.alumno import Alumno
from app.models.carga import CargaHistorial

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_upload_creates_historial_and_assigns_carga_id(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"
    assert xlsx_path.exists()

    with open(xlsx_path, "rb") as f:
        res = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

    assert res.status_code == 200, res.text
    data = res.json()
    assert "carga_id" in data
    assert data["carga_id"] is not None

    carga_id = data["carga_id"]

    # Verify CargaHistorial in DB
    carga = db_session.query(CargaHistorial).filter(CargaHistorial.id == carga_id).first()
    assert carga is not None
    assert carga.filename == "sample_meca.xlsx"
    assert carga.escuela_id == esc_ing.id
    assert carga.total_filas == 278
    assert carga.nuevos == 275
    assert carga.actualizados == 3
    assert carga.usuario is not None
    assert carga.usuario.email == "admin@undec.edu.ar"

    # Verify all students have carga_id set
    students = db_session.query(Alumno).filter(Alumno.propuesta_id == carga.propuesta_id).all()
    assert len(students) == 275
    for s in students:
        assert s.carga_id == carga_id


def test_get_historial_permissions_and_filtering(client, admin_headers, ingenieria_headers, sociales_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    esc_soc = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ciencias Sociales").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"

    # Upload file under Ingeniería
    with open(xlsx_path, "rb") as f:
        client.post(
            "/api/upload",
            headers={"Authorization": ingenieria_headers["Authorization"]},
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

    # 1. Admin sees the upload in historial
    admin_hist = client.get("/api/upload/historial", headers=admin_headers)
    assert admin_hist.status_code == 200
    records = admin_hist.json()
    assert len(records) == 1
    assert records[0]["filename"] == "sample_meca.xlsx"
    assert records[0]["escuela_nombre"] == "Escuela de Ingeniería"
    assert "Mecatr" in records[0]["propuesta_nombre"]
    assert records[0]["usuario_nombre"] == "Coordinador Ingeniería"
    assert records[0]["total_filas"] == 278

    # Admin filters by school
    filter_ing = client.get(f"/api/upload/historial?escuela_id={esc_ing.id}", headers=admin_headers)
    assert len(filter_ing.json()) == 1
    filter_soc = client.get(f"/api/upload/historial?escuela_id={esc_soc.id}", headers=admin_headers)
    assert len(filter_soc.json()) == 0

    # 2. Ingeniería coordinator sees own upload
    ing_hist = client.get("/api/upload/historial", headers={"Authorization": ingenieria_headers["Authorization"]})
    assert ing_hist.status_code == 200
    assert len(ing_hist.json()) == 1

    # 3. Sociales coordinator sees empty list
    soc_hist = client.get("/api/upload/historial", headers={"Authorization": sociales_headers["Authorization"]})
    assert soc_hist.status_code == 200
    assert len(soc_hist.json()) == 0

    # 4. Sociales coordinator requesting Ingeniería history gets 403
    forbidden_hist = client.get(
        f"/api/upload/historial?escuela_id={esc_ing.id}",
        headers={"Authorization": sociales_headers["Authorization"]}
    )
    assert forbidden_hist.status_code == 403


def test_revert_upload_success_and_cleanup(client, admin_headers, ingenieria_headers, sociales_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"

    # Upload file
    with open(xlsx_path, "rb") as f:
        res = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
    carga_id = res.json()["carga_id"]

    # Verify students and propuesta exist
    propuesta = db_session.query(PropuestaFormativa).filter(PropuestaFormativa.escuela_id == esc_ing.id).first()
    assert propuesta is not None
    propuesta_id = propuesta.id
    assert db_session.query(Alumno).filter(Alumno.propuesta_id == propuesta_id).count() == 275

    # 1. School coordinator from another school cannot delete it (403)
    unauthorized_del = client.delete(
        f"/api/upload/historial/{carga_id}",
        headers={"Authorization": sociales_headers["Authorization"]}
    )
    assert unauthorized_del.status_code == 403

    # 2. School coordinator from same school or admin CAN delete it
    del_res = client.delete(
        f"/api/upload/historial/{carga_id}",
        headers={"Authorization": ingenieria_headers["Authorization"]}
    )
    assert del_res.status_code == 200, del_res.text
    del_data = del_res.json()
    assert del_data["message"] == "Carga revertida exitosamente"
    assert del_data["alumnos_eliminados"] == 275

    # Verify students are deleted
    assert db_session.query(Alumno).filter(Alumno.propuesta_id == propuesta_id).count() == 0

    # Verify empty propuesta was deleted
    assert db_session.query(PropuestaFormativa).filter(PropuestaFormativa.id == propuesta_id).first() is None

    # Verify CargaHistorial record was deleted
    assert db_session.query(CargaHistorial).filter(CargaHistorial.id == carga_id).first() is None

    # Verify historial is empty now
    hist_res = client.get("/api/upload/historial", headers=admin_headers)
    assert len(hist_res.json()) == 0


def test_revert_non_existent_carga_raises_404(client, admin_headers):
    res = client.delete("/api/upload/historial/99999", headers=admin_headers)
    assert res.status_code == 404
