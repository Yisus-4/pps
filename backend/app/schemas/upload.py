from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UploadResponse(BaseModel):
    carga_id: Optional[int] = None
    escuela: str
    propuesta: str
    total_procesados: int
    nuevos: int
    actualizados: int


class CargaHistorialOut(BaseModel):
    id: int
    filename: str
    escuela_id: int
    escuela_nombre: str
    propuesta_id: Optional[int] = None
    propuesta_nombre: Optional[str] = None
    usuario_nombre: Optional[str] = None
    fecha_carga: datetime
    total_filas: int
    nuevos: int
    actualizados: int

    model_config = ConfigDict(from_attributes=True)


class CargaRevertResponse(BaseModel):
    message: str
    alumnos_eliminados: int
