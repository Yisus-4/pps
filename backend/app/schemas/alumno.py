from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class AlumnoOut(BaseModel):
    id: int
    propuesta_id: int
    apellido_nombre: str
    documento: str
    fecha_nacimiento: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    legajo: Optional[str] = None
    plan: Optional[str] = None
    anio_ingreso: Optional[int] = None
    fecha_ingreso: Optional[str] = None
    ultimo_examen: Optional[str] = None
    ultima_reinscripcion: Optional[str] = None
    promedio_con_aplazos: Optional[float] = None
    promedio_sin_aplazos: Optional[float] = None
    actividades_aprobadas: int = 0
    total_actividades: int = 0
    estado_inscripcion: Optional[str] = None
    pais_origen: Optional[str] = None
    coeficiente: Optional[float] = None
    updated_at: datetime
    
    # Extra informative fields
    propuesta_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlumnosPaginated(BaseModel):
    items: List[AlumnoOut]
    total: int
    page: int
    limit: int
    total_pages: int
