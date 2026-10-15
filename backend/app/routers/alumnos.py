import math
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
from app.database import get_db
from app.models.user import User, UserRole
from app.models.propuesta import PropuestaFormativa
from app.models.alumno import Alumno
from app.schemas.alumno import AlumnosPaginated, AlumnoOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/alumnos", tags=["Alumnos"])


def parse_date_robust(val: Optional[str]) -> Optional[datetime]:
    if not val or not isinstance(val, str):
        return None
    s = val.strip()
    if not s or s.lower() in ("none", "nan", "-", "s/d"):
        return None
    token = s.split()[0].split("T")[0]
    formats = [
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d/%m/%y",
        "%y-%m-%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(token, fmt)
        except ValueError:
            pass
    for sep in ["/", "-"]:
        if sep in token:
            parts = token.split(sep)
            if len(parts) == 3:
                try:
                    p0, p1, p2 = int(parts[0]), int(parts[1]), int(parts[2])
                    if p0 > 1000:
                        return datetime(p0, p1, p2)
                    elif p2 > 1000:
                        return datetime(p2, p1, p0)
                except Exception:
                    pass
    return None


@router.get("", response_model=AlumnosPaginated)
def get_alumnos(
    escuela_id: Optional[int] = Query(None, description="Filtrar por Escuela"),
    propuesta_id: Optional[int] = Query(None, description="Filtrar por Propuesta Formativa (Carrera)"),
    search: Optional[str] = Query(None, description="Buscar por nombre o documento"),
    estado_inscripcion: Optional[str] = Query(None, description="Filtrar por estado de inscripción"),
    condicion: Optional[str] = Query(None, description="Filtrar por 'activos', 'inactivos', 'recibidos'"),
    sort_by: Optional[str] = Query("apellido_nombre", description="Campo por el cual ordenar"),
    sort_dir: Optional[str] = Query("asc", description="Dirección del ordenamiento: 'asc' o 'desc'"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(50, ge=1, le=500, description="Cantidad por página"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alumno).join(PropuestaFormativa, Alumno.propuesta_id == PropuestaFormativa.id)

    # Permission filter: Non-admin users can ONLY see their assigned escuela
    if current_user.role != UserRole.ADMIN.value:
        if current_user.escuela_id is None:
            # User has no assigned escuela, return empty
            return AlumnosPaginated(items=[], total=0, page=page, limit=limit, total_pages=0, activos=0, egresados=0, promedio_historico=None)
        query = query.filter(PropuestaFormativa.escuela_id == current_user.escuela_id)
    else:
        # Admin can optionally filter by escuela_id
        if escuela_id is not None:
            query = query.filter(PropuestaFormativa.escuela_id == escuela_id)

    # Filter by propuesta_id
    if propuesta_id is not None:
        query = query.filter(Alumno.propuesta_id == propuesta_id)

    # Filter by search string in apellido_nombre or documento
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Alumno.apellido_nombre.ilike(search_pattern),
                Alumno.documento.ilike(search_pattern),
                Alumno.legajo.ilike(search_pattern)
            )
        )

    # Filter by estado_inscripcion
    if estado_inscripcion:
        query = query.filter(Alumno.estado_inscripcion == estado_inscripcion)

    # Date boundaries for activos (within the last 12 months / 365 days)
    now = datetime.now()
    cutoff_date = (now - timedelta(days=365)).date()
    today_limit = (now + timedelta(days=1)).date()
    current_year = now.year

    def is_alumno_activo(exam_str: Optional[str], anio_ingreso: Optional[int], fecha_ingreso: Optional[str]) -> bool:
        if anio_ingreso == current_year:
            return True
        if fecha_ingreso:
            f_dt = parse_date_robust(fecha_ingreso)
            if f_dt and f_dt.year == current_year:
                return True
        dt = parse_date_robust(exam_str)
        return bool(dt and cutoff_date <= dt.date() <= today_limit)

    # Filter by condicion: 'activos', 'inactivos', 'recibidos'
    if condicion:
        cond = condicion.strip().lower()
        if cond in ("activos", "inactivos", "recibidos"):
            candidate_rows = query.with_entities(
                Alumno.id,
                Alumno.ultimo_examen,
                Alumno.total_actividades,
                Alumno.actividades_aprobadas,
                Alumno.anio_ingreso,
                Alumno.fecha_ingreso
            ).all()

            matching_ids = []
            for a_id, exam_str, total_act, aprob_act, anio_ing, f_ing in candidate_rows:
                is_egresado = (total_act or 0) > 0 and (aprob_act or 0) >= (total_act or 0)
                if cond == "recibidos":
                    if is_egresado:
                        matching_ids.append(a_id)
                elif is_egresado:
                    continue
                else:
                    is_active = is_alumno_activo(exam_str, anio_ing, f_ing)
                    if cond == "activos" and is_active:
                        matching_ids.append(a_id)
                    elif cond == "inactivos" and not is_active:
                        matching_ids.append(a_id)

            query = query.filter(Alumno.id.in_(matching_ids))

    # Count total matching
    total = query.count()

    # Calculate egresados matching the active query (matching school, carrera, search, estado filters, BEFORE pagination limit/offset)
    egresados = query.filter(Alumno.total_actividades > 0, Alumno.actividades_aprobadas >= Alumno.total_actividades).count()

    # Calculate activos matching the active query (before pagination offset/limit)
    # who are enrolled in current year OR whose ultimo_examen is within the last 12 months (365 days), and who are NOT egresados
    activos = 0
    exam_rows = query.with_entities(
        Alumno.ultimo_examen,
        Alumno.total_actividades,
        Alumno.actividades_aprobadas,
        Alumno.anio_ingreso,
        Alumno.fecha_ingreso
    ).all()

    for exam_str, total_act, aprob_act, anio_ing, f_ing in exam_rows:
        is_egresado = (total_act or 0) > 0 and (aprob_act or 0) >= (total_act or 0)
        if not is_egresado and is_alumno_activo(exam_str, anio_ing, f_ing):
            activos += 1

    # Calculate promedio_historico
    # When propuesta_id is specified:
    #   Compute the average of promedio_con_aplazos for all egresados of that propuesta_id in the database:
    #   Alumno.propuesta_id == propuesta_id, Alumno.total_actividades > 0, Alumno.actividades_aprobadas >= Alumno.total_actividades, and Alumno.promedio_con_aplazos > 0. Round to 2 decimal places.
    # When propuesta_id is None:
    #   Set promedio_historico = None
    promedio_historico: Optional[float] = None
    if propuesta_id is not None:
        avg_prom = db.query(func.avg(Alumno.promedio_con_aplazos)).filter(
            Alumno.propuesta_id == propuesta_id,
            Alumno.total_actividades > 0,
            Alumno.actividades_aprobadas >= Alumno.total_actividades,
            Alumno.promedio_con_aplazos > 0
        ).scalar()
        if avg_prom is not None:
            promedio_historico = round(float(avg_prom), 2)

    # Pagination
    total_pages = math.ceil(total / limit) if total > 0 else 0
    offset = (page - 1) * limit
    # Dynamic sorting
    birth_date_expr = case(
        (Alumno.fecha_nacimiento.like("%/%/%"),
         func.substr(Alumno.fecha_nacimiento, 7, 4) + "-" + func.substr(Alumno.fecha_nacimiento, 4, 2) + "-" + func.substr(Alumno.fecha_nacimiento, 1, 2)),
        else_=Alumno.fecha_nacimiento
    )
    exam_date_expr = case(
        (Alumno.ultimo_examen.like("%/%/%"),
         func.substr(Alumno.ultimo_examen, 7, 4) + "-" + func.substr(Alumno.ultimo_examen, 4, 2) + "-" + func.substr(Alumno.ultimo_examen, 1, 2)),
        else_=Alumno.ultimo_examen
    )

    sort_fields = {
        "apellido_nombre": Alumno.apellido_nombre,
        "plan": Alumno.plan,
        "anio_ingreso": Alumno.anio_ingreso,
        "duracion": Alumno.anio_ingreso,
        "estado_inscripcion": Alumno.estado_inscripcion,
        "promedio_con_aplazos": Alumno.promedio_con_aplazos,
        "promedio_sin_aplazos": Alumno.promedio_sin_aplazos,
        "actividades_aprobadas": Alumno.actividades_aprobadas,
        "ultimo_examen": exam_date_expr,
        "ultima_reinscripcion": Alumno.ultima_reinscripcion,
        "fecha_nacimiento": birth_date_expr,
        "edad": birth_date_expr,
    }
    sort_col = sort_fields.get(sort_by, Alumno.apellido_nombre)
    is_desc = bool(sort_dir and sort_dir.lower() == "desc")
    if sort_by in ("duracion", "edad", "fecha_nacimiento"):
        is_desc = not is_desc

    if is_desc:
        query = query.order_by(sort_col.desc().nullslast())
    else:
        query = query.order_by(sort_col.asc().nullslast() if sort_by in ("duracion", "edad", "fecha_nacimiento", "ultimo_examen") else sort_col.asc().nullsfirst())

    db_alumnos = query.offset(offset).limit(limit).all()

    current_year = now.year
    items = []
    for a in db_alumnos:
        duracion_anios: Optional[int] = None
        if a.anio_ingreso:
            is_egresado = (a.total_actividades or 0) > 0 and (a.actividades_aprobadas or 0) >= (a.total_actividades or 0)
            if is_egresado:
                dt = parse_date_robust(a.ultimo_examen)
                end_year = dt.year if dt else current_year
                duracion_anios = max(0, end_year - a.anio_ingreso)
            else:
                duracion_anios = max(0, current_year - a.anio_ingreso)

        item = AlumnoOut(
            id=a.id,
            propuesta_id=a.propuesta_id,
            apellido_nombre=a.apellido_nombre,
            documento=a.documento,
            fecha_nacimiento=a.fecha_nacimiento,
            email=a.email,
            telefono=a.telefono,
            legajo=a.legajo,
            plan=a.plan,
            anio_ingreso=a.anio_ingreso,
            duracion_anios=duracion_anios,
            fecha_ingreso=a.fecha_ingreso,
            ultimo_examen=a.ultimo_examen,
            ultima_reinscripcion=a.ultima_reinscripcion,
            promedio_con_aplazos=a.promedio_con_aplazos,
            promedio_sin_aplazos=a.promedio_sin_aplazos,
            actividades_aprobadas=a.actividades_aprobadas,
            total_actividades=a.total_actividades,
            estado_inscripcion=a.estado_inscripcion,
            pais_origen=a.pais_origen,
            coeficiente=a.coeficiente,
            updated_at=a.updated_at,
            propuesta_nombre=a.propuesta.nombre if a.propuesta else None
        )
        items.append(item)

    return AlumnosPaginated(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        activos=activos,
        egresados=egresados,
        promedio_historico=promedio_historico
    )
