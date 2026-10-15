import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User, UserRole
from app.models.propuesta import PropuestaFormativa
from app.models.alumno import Alumno
from app.schemas.alumno import AlumnosPaginated, AlumnoOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/alumnos", tags=["Alumnos"])


@router.get("", response_model=AlumnosPaginated)
def get_alumnos(
    escuela_id: Optional[int] = Query(None, description="Filtrar por Escuela"),
    propuesta_id: Optional[int] = Query(None, description="Filtrar por Propuesta Formativa (Carrera)"),
    search: Optional[str] = Query(None, description="Buscar por nombre o documento"),
    estado_inscripcion: Optional[str] = Query(None, description="Filtrar por estado de inscripción"),
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
            return AlumnosPaginated(items=[], total=0, page=page, limit=limit, total_pages=0)
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

    # Count total matching
    total = query.count()

    # Pagination
    total_pages = math.ceil(total / limit) if total > 0 else 0
    offset = (page - 1) * limit
    # Dynamic sorting
    sort_fields = {
        "documento": Alumno.documento,
        "apellido_nombre": Alumno.apellido_nombre,
        "legajo": Alumno.legajo,
        "plan": Alumno.plan,
        "anio_ingreso": Alumno.anio_ingreso,
        "estado_inscripcion": Alumno.estado_inscripcion,
        "promedio_con_aplazos": Alumno.promedio_con_aplazos,
        "promedio_sin_aplazos": Alumno.promedio_sin_aplazos,
        "actividades_aprobadas": Alumno.actividades_aprobadas,
        "ultimo_examen": Alumno.ultimo_examen,
    }
    sort_col = sort_fields.get(sort_by, Alumno.apellido_nombre)
    if sort_dir and sort_dir.lower() == "desc":
        query = query.order_by(sort_col.desc().nullslast())
    else:
        query = query.order_by(sort_col.asc().nullsfirst())

    db_alumnos = query.offset(offset).limit(limit).all()

    items = []
    for a in db_alumnos:
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
        total_pages=total_pages
    )
