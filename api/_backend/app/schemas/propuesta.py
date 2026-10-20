from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PropuestaBase(BaseModel):
    nombre: str
    plan_codigo: Optional[str] = None
    version_plan: Optional[str] = None
    ubicacion: Optional[str] = None


class PropuestaOut(PropuestaBase):
    id: int
    escuela_id: int
    updated_at: datetime
    alumnos_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
