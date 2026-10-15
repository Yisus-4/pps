from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.escuela import Escuela
from app.models.propuesta import PropuestaFormativa
from app.models.alumno import Alumno
from app.models.user import User
from app.schemas.escuela import EscuelaOut
from app.schemas.propuesta import PropuestaOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/escuelas", tags=["Escuelas"])


@router.get("", response_model=List[EscuelaOut])
def get_escuelas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    escuelas = db.query(Escuela).order_by(Escuela.nombre).all()
    return escuelas


@router.get("/{escuela_id}/propuestas", response_model=List[PropuestaOut])
def get_propuestas_por_escuela(
    escuela_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    escuela = db.query(Escuela).filter(Escuela.id == escuela_id).first()
    if not escuela:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La Escuela con ID {escuela_id} no fue encontrada."
        )

    # Query propuestas with count of alumnos
    results = (
        db.query(
            PropuestaFormativa,
            func.count(Alumno.id).label("alumnos_count")
        )
        .outerjoin(Alumno, PropuestaFormativa.id == Alumno.propuesta_id)
        .filter(PropuestaFormativa.escuela_id == escuela_id)
        .group_by(PropuestaFormativa.id)
        .order_by(PropuestaFormativa.nombre)
        .all()
    )

    propuestas_out = []
    for prop, count in results:
        prop_out = PropuestaOut(
            id=prop.id,
            nombre=prop.nombre,
            escuela_id=prop.escuela_id,
            plan_codigo=prop.plan_codigo,
            version_plan=prop.version_plan,
            ubicacion=prop.ubicacion,
            updated_at=prop.updated_at,
            alumnos_count=count
        )
        propuestas_out.append(prop_out)

    return propuestas_out
