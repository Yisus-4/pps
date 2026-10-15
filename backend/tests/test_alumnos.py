from pathlib import Path
import pytest
from app.models.escuela import Escuela

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def populate_sample_students(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    xlsx_path = FIXTURES_DIR / "sample_meca.xlsx"
    with open(xlsx_path, "rb") as f:
        res = client.post(
            "/api/upload",
            headers=admin_headers,
            data={"escuela_id": esc_ing.id},
            files={"file": ("sample_meca.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
    assert res.status_code == 200


def test_query_alumnos_pagination(client, admin_headers):
    # Query page 1, limit 20 (275 unique students total -> 14 pages)
    res = client.get("/api/alumnos?page=1&limit=20", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 275
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total_pages"] == 14
    assert len(data["items"]) == 20


def test_search_alumnos_by_name_and_documento(client, admin_headers):
    # Search by name
    res_name = client.get("/api/alumnos?search=Aballay", headers=admin_headers)
    assert res_name.status_code == 200
    items = res_name.json()["items"]
    assert len(items) >= 1
    assert any("ABALLAY" in item["apellido_nombre"] for item in items)

    # Search by DNI number
    res_dni = client.get("/api/alumnos?search=35541439", headers=admin_headers)
    assert res_dni.status_code == 200
    assert len(res_dni.json()["items"]) == 1
    assert res_dni.json()["items"][0]["documento"] == "DNI 35541439"


def test_role_restricted_alumnos_access(client, ingenieria_headers, sociales_headers):
    # Ingeniería user queries alumnos -> can see all 275 students belonging to their school
    res_ing = client.get("/api/alumnos", headers={"Authorization": ingenieria_headers["Authorization"]})
    assert res_ing.status_code == 200
    assert res_ing.json()["total"] == 275

    # Sociales user queries alumnos -> gets 0 students because data is in Ingeniería
    res_soc = client.get("/api/alumnos", headers={"Authorization": sociales_headers["Authorization"]})
    assert res_soc.status_code == 200
    assert res_soc.json()["total"] == 0


def test_escuelas_and_propuestas_listing(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()

    # List escuelas
    res_esc = client.get("/api/escuelas", headers=admin_headers)
    assert res_esc.status_code == 200
    escuelas = res_esc.json()
    assert len(escuelas) == 4

    # List propuestas for Ingeniería
    res_prop = client.get(f"/api/escuelas/{esc_ing.id}/propuestas", headers=admin_headers)
    assert res_prop.status_code == 200
    propuestas = res_prop.json()
    assert len(propuestas) >= 1
    prop = propuestas[0]
    assert "Mecatrónica" in prop["nombre"] or "Mecatr" in prop["nombre"]
    assert prop["alumnos_count"] == 275
