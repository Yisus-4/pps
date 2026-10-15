from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    escuela_id: Optional[int] = None


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "RESPONSABLE_ACADEMICA"
    escuela_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    escuela_id: Optional[int] = None
    escuela_nombre: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
