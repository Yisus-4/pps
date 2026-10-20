from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    escuela_id: Optional[int] = None
