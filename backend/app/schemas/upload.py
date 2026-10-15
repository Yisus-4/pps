from pydantic import BaseModel


class UploadResponse(BaseModel):
    escuela: str
    propuesta: str
    total_procesados: int
    nuevos: int
    actualizados: int
