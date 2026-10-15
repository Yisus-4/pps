from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.carga import CargaHistorial
from app.models.alumno import Alumno
from app.models.propuesta import PropuestaFormativa
from app.schemas.upload import UploadResponse, CargaHistorialOut, CargaRevertResponse
from app.services.auth import get_current_user
from app.services.excel_parser import process_siu_upload

router = APIRouter(prefix="/api/upload", tags=["Carga de Datos SIU Guaraní"])


@router.post("", response_model=UploadResponse)
async def upload_siu_file(
    file: UploadFile = File(...),
    escuela_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe seleccionar un archivo para subir."
        )

    fname_lower = file.filename.lower()
    allowed_extensions = (".xlsx", ".xls", ".csv", ".txt")
    if not any(fname_lower.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no compatible. Suba un archivo Excel (.xlsx) o CSV (.csv)."
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo seleccionado está vacío."
        )

    result = process_siu_upload(
        db=db,
        file_bytes=contents,
        filename=file.filename,
        selected_escuela_id=escuela_id,
        current_user=current_user
    )

    return UploadResponse(**result)


@router.get("/historial", response_model=List[CargaHistorialOut])
def get_historial_cargas(
    escuela_id: Optional[int] = Query(None, description="Filtrar por Escuela"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CargaHistorial)

    # Permission check: Non-admin users ONLY see uploads for their assigned escuela_id. Admins see all.
    if current_user.role != UserRole.ADMIN.value:
        if current_user.escuela_id is None:
            return []
        if escuela_id is not None and escuela_id != current_user.escuela_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para ver el historial de otra Escuela."
            )
        query = query.filter(CargaHistorial.escuela_id == current_user.escuela_id)
    else:
        if escuela_id is not None:
            query = query.filter(CargaHistorial.escuela_id == escuela_id)

    cargas = query.order_by(CargaHistorial.fecha_carga.desc()).all()

    result = []
    for c in cargas:
        result.append(CargaHistorialOut(
            id=c.id,
            filename=c.filename,
            escuela_id=c.escuela_id,
            escuela_nombre=c.escuela.nombre if c.escuela else "",
            propuesta_id=c.propuesta_id,
            propuesta_nombre=c.propuesta.nombre if c.propuesta else None,
            usuario_nombre=c.usuario.full_name if c.usuario else None,
            fecha_carga=c.fecha_carga,
            total_filas=c.total_filas,
            nuevos=c.nuevos,
            actualizados=c.actualizados
        ))

    return result


@router.delete("/historial/{carga_id}", response_model=CargaRevertResponse)
def revertir_carga(
    carga_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    carga = db.query(CargaHistorial).filter(CargaHistorial.id == carga_id).first()
    if not carga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carga con ID {carga_id} no encontrada."
        )

    # Permission check: Admin can delete any; school users can only delete if it belongs to their school.
    if current_user.role != UserRole.ADMIN.value:
        if current_user.escuela_id != carga.escuela_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para revertir cargas de otra Escuela."
            )

    propuesta_id = carga.propuesta_id

    # Find all students associated with this carga_id
    alumnos = db.query(Alumno).filter(Alumno.carga_id == carga.id).all()
    count_eliminados = len(alumnos)

    for a in alumnos:
        db.delete(a)

    db.delete(carga)
    db.flush()

    # If after deleting students the propuesta_formativa has 0 students left, delete the empty propuesta or keep it clean.
    if propuesta_id:
        remaining_alumnos = db.query(Alumno).filter(Alumno.propuesta_id == propuesta_id).count()
        if remaining_alumnos == 0:
            propuesta = db.query(PropuestaFormativa).filter(PropuestaFormativa.id == propuesta_id).first()
            if propuesta:
                db.query(CargaHistorial).filter(CargaHistorial.propuesta_id == propuesta_id).update(
                    {CargaHistorial.propuesta_id: None}, synchronize_session=False
                )
                db.delete(propuesta)

    db.commit()

    return CargaRevertResponse(
        message="Carga revertida exitosamente",
        alumnos_eliminados=count_eliminados
    )
