from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.upload import UploadResponse
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
