from datetime import datetime, timedelta
from pathlib import Path
import pytest
from app.models.escuela import Escuela
from app.models.alumno import Alumno
from app.models.propuesta import PropuestaFormativa

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
    # propuesta_id is None -> promedio_historico is None, activos is computed for all 275 (excluding egresados)
    assert data["activos"] == 67
    assert data["promedio_historico"] is None


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


def test_activos_and_promedio_historico_and_sorting(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    res_prop = client.get(f"/api/escuelas/{esc_ing.id}/propuestas", headers=admin_headers)
    assert res_prop.status_code == 200
    prop_id = res_prop.json()[0]["id"]

    # When propuesta_id is specified:
    res = client.get(f"/api/alumnos?propuesta_id={prop_id}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 275
    assert data["activos"] == 67
    assert data["promedio_historico"] == 8.01

    # Verify that sorting by any field does NOT change total, activos, or promedio_historico
    sort_fields = [
        "apellido_nombre",
        "plan",
        "anio_ingreso",
        "duracion",
        "promedio_con_aplazos",
        "promedio_sin_aplazos",
        "actividades_aprobadas",
        "ultimo_examen",
    ]
    for field in sort_fields:
        for sort_dir in ["asc", "desc"]:
            res_sort = client.get(
                f"/api/alumnos?propuesta_id={prop_id}&sort_by={field}&sort_dir={sort_dir}&page=1&limit=10",
                headers=admin_headers
            )
            assert res_sort.status_code == 200
            s_data = res_sort.json()
            assert s_data["total"] == 275, f"Total changed on sorting by {field} {sort_dir}"
            assert s_data["activos"] == 67, f"Activos changed on sorting by {field} {sort_dir}"
            assert s_data["promedio_historico"] == 8.01, f"Promedio historico changed on sorting by {field} {sort_dir}"
            assert len(s_data["items"]) == 10


def test_activos_date_formats_dd_mm_yyyy_and_yyyy_mm_dd(client, admin_headers, db_session):
    # Select two students to test both date formats
    students = db_session.query(Alumno).limit(2).all()
    now = datetime.now()

    # 1. Test YYYY-MM-DD within 12 months (e.g. 30 days ago)
    date_iso = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    students[0].ultimo_examen = date_iso

    # 2. Test DD/MM/YYYY within 12 months (e.g. 60 days ago)
    date_slash = (now - timedelta(days=60)).strftime("%d/%m/%Y")
    students[1].ultimo_examen = date_slash

    db_session.commit()

    # Query with search for student 0
    res0 = client.get(f"/api/alumnos?search={students[0].documento}", headers=admin_headers)
    assert res0.status_code == 200
    assert res0.json()["total"] == 1
    assert res0.json()["activos"] == 1

    # Query with search for student 1
    res1 = client.get(f"/api/alumnos?search={students[1].documento}", headers=admin_headers)
    assert res1.status_code == 200
    assert res1.json()["total"] == 1
    assert res1.json()["activos"] == 1

    # Test an expired date (> 365 days ago)
    expired_date = (now - timedelta(days=400)).strftime("%Y-%m-%d")
    students[0].ultimo_examen = expired_date
    db_session.commit()
    res_exp = client.get(f"/api/alumnos?search={students[0].documento}", headers=admin_headers)
    assert res_exp.status_code == 200
    assert res_exp.json()["total"] == 1
    assert res_exp.json()["activos"] == 0


def test_condicion_filtering_and_egresados_exclusion(client, admin_headers):
    # Total students is 275, of which 5 are egresados, 67 are activos, 203 are inactivos
    res_all = client.get("/api/alumnos", headers=admin_headers)
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total"] == 275
    assert data_all["activos"] == 67

    # 1. Filter by 'activos': students who are NOT egresados and (enrolled in current year OR have exam within last 12 months)
    res_act = client.get("/api/alumnos?condicion=activos&limit=100", headers=admin_headers)
    assert res_act.status_code == 200
    data_act = res_act.json()
    assert data_act["total"] == 67
    assert data_act["activos"] == 67
    now_year = datetime.now().year
    for item in data_act["items"]:
        is_egresado = item["total_actividades"] > 0 and item["actividades_aprobadas"] >= item["total_actividades"]
        assert not is_egresado
        assert item["anio_ingreso"] == now_year or item["ultimo_examen"] is not None

    # 2. Filter by 'inactivos': students who are NOT egresados and are NOT active
    res_inact = client.get("/api/alumnos?condicion=inactivos&limit=100", headers=admin_headers)
    assert res_inact.status_code == 200
    data_inact = res_inact.json()
    assert data_inact["total"] == 203
    assert data_inact["activos"] == 0
    for item in data_inact["items"]:
        is_egresado = item["total_actividades"] > 0 and item["actividades_aprobadas"] >= item["total_actividades"]
        assert not is_egresado

    # 3. Filter by 'recibidos': graduated students (total_actividades > 0 and actividades_aprobadas >= total_actividades)
    res_rec = client.get("/api/alumnos?condicion=recibidos&limit=100", headers=admin_headers)
    assert res_rec.status_code == 200
    data_rec = res_rec.json()
    assert data_rec["total"] == 5
    assert data_rec["activos"] == 0
    for item in data_rec["items"]:
        assert item["total_actividades"] > 0
        assert item["actividades_aprobadas"] >= item["total_actividades"]

    # Sum of partitioned subsets must equal total alumnos
    assert data_act["total"] + data_inact["total"] + data_rec["total"] == data_all["total"]


def test_duracion_en_carrera_calculation_and_sorting(client, admin_headers, db_session):
    now_year = datetime.now().year

    # 1. Egresados: duration = max(0, dt.year - anio_ingreso)
    res_rec = client.get("/api/alumnos?condicion=recibidos", headers=admin_headers)
    assert res_rec.status_code == 200
    rec_items = res_rec.json()["items"]
    assert len(rec_items) > 0
    for item in rec_items:
        assert item["duracion_anios"] is not None
        if item["anio_ingreso"]:
            from app.routers.alumnos import parse_date_robust
            dt = parse_date_robust(item["ultimo_examen"])
            expected_end = dt.year if dt else now_year
            assert item["duracion_anios"] == max(0, expected_end - item["anio_ingreso"])

    # 2. Pendientes (activos / inactivos): duration = max(0, now_year - anio_ingreso)
    res_act = client.get("/api/alumnos?condicion=activos&limit=10", headers=admin_headers)
    assert res_act.status_code == 200
    act_items = res_act.json()["items"]
    assert len(act_items) > 0
    for item in act_items:
        if item["anio_ingreso"]:
            assert item["duracion_anios"] == max(0, now_year - item["anio_ingreso"])

    # 3. Student without anio_ingreso -> duracion_anios is None
    student = db_session.query(Alumno).first()
    student.anio_ingreso = None
    db_session.commit()

    res_none = client.get(f"/api/alumnos?search={student.documento}", headers=admin_headers)
    assert res_none.status_code == 200
    assert res_none.json()["items"][0]["duracion_anios"] is None

    # 4. Sorting by duracion
    res_asc = client.get("/api/alumnos?sort_by=duracion&sort_dir=asc&limit=10", headers=admin_headers)
    assert res_asc.status_code == 200
    asc_items = res_asc.json()["items"]
    valid_asc_anios = [i["anio_ingreso"] for i in asc_items if i["anio_ingreso"] is not None]
    assert valid_asc_anios == sorted(valid_asc_anios, reverse=True)

    res_desc = client.get("/api/alumnos?sort_by=duracion&sort_dir=desc&limit=10", headers=admin_headers)
    assert res_desc.status_code == 200
    desc_items = res_desc.json()["items"]
    valid_desc_anios = [i["anio_ingreso"] for i in desc_items if i["anio_ingreso"] is not None]
    assert valid_desc_anios == sorted(valid_desc_anios)


def test_current_year_enrollment_activos_logic(client, admin_headers, db_session):
    now = datetime.now()
    current_year = now.year

    # Get an existing student who is not egresado and currently inactivo
    student = db_session.query(Alumno).filter(
        Alumno.total_actividades > Alumno.actividades_aprobadas
    ).first()
    assert student is not None

    # Case 1: Past year enrollment and no exam -> Inactivo
    student.anio_ingreso = current_year - 2
    student.fecha_ingreso = f"15/03/{current_year - 2}"
    student.ultimo_examen = None
    db_session.commit()

    res = client.get(f"/api/alumnos?search={student.documento}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["activos"] == 0

    res_act = client.get(f"/api/alumnos?condicion=activos&search={student.documento}", headers=admin_headers)
    assert res_act.status_code == 200
    assert res_act.json()["total"] == 0

    res_inact = client.get(f"/api/alumnos?condicion=inactivos&search={student.documento}", headers=admin_headers)
    assert res_inact.status_code == 200
    assert res_inact.json()["total"] == 1

    # Case 2: Current year enrollment via anio_ingreso, NO exam -> Activo
    student.anio_ingreso = current_year
    student.fecha_ingreso = None
    student.ultimo_examen = None
    db_session.commit()

    res = client.get(f"/api/alumnos?search={student.documento}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["activos"] == 1

    res_act = client.get(f"/api/alumnos?condicion=activos&search={student.documento}", headers=admin_headers)
    assert res_act.status_code == 200
    assert res_act.json()["total"] == 1

    res_inact = client.get(f"/api/alumnos?condicion=inactivos&search={student.documento}", headers=admin_headers)
    assert res_inact.status_code == 200
    assert res_inact.json()["total"] == 0

    # Case 3: Current year enrollment via fecha_ingreso (anio_ingreso is None), NO exam -> Activo
    student.anio_ingreso = None
    student.fecha_ingreso = f"01/03/{current_year}"
    student.ultimo_examen = None
    db_session.commit()

    res = client.get(f"/api/alumnos?search={student.documento}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["activos"] == 1

    # Case 4: Past year enrollment with exam within 12 months -> Activo
    student.anio_ingreso = current_year - 1
    student.fecha_ingreso = f"01/03/{current_year - 1}"
    student.ultimo_examen = (now - timedelta(days=60)).strftime("%d/%m/%Y")
    db_session.commit()

    res = client.get(f"/api/alumnos?search={student.documento}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["activos"] == 1

    # Case 5: Past year enrollment with expired exam (>365 days ago) -> Inactivo
    student.ultimo_examen = (now - timedelta(days=400)).strftime("%d/%m/%Y")
    db_session.commit()

    res = client.get(f"/api/alumnos?search={student.documento}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["activos"] == 0

    # Case 6: Student with current year enrollment but is egresado -> Recibido (not Activo)
    student.anio_ingreso = current_year
    student.total_actividades = 10
    student.actividades_aprobadas = 10
    db_session.commit()

    res_rec = client.get(f"/api/alumnos?condicion=recibidos&search={student.documento}", headers=admin_headers)
    assert res_rec.status_code == 200
    assert res_rec.json()["total"] == 1

    res_act = client.get(f"/api/alumnos?condicion=activos&search={student.documento}", headers=admin_headers)
    assert res_act.status_code == 200
    assert res_act.json()["total"] == 0

