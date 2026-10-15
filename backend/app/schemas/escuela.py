from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EscuelaBase(BaseModel):
    nombre: str


class EscuelaCreate(EscuelaBase):
    pass


class EscuelaOut(EscuelaBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
