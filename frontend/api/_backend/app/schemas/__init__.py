from app.schemas.escuela import EscuelaBase, EscuelaCreate, EscuelaOut
from app.schemas.propuesta import PropuestaBase, PropuestaOut
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserOut
from app.schemas.auth import LoginRequest, Token, TokenPayload
from app.schemas.alumno import AlumnoOut, AlumnosPaginated
from app.schemas.upload import UploadResponse, CargaHistorialOut, CargaRevertResponse

__all__ = [
    "EscuelaBase", "EscuelaCreate", "EscuelaOut",
    "PropuestaBase", "PropuestaOut",
    "UserBase", "UserCreate", "UserUpdate", "UserOut",
    "LoginRequest", "Token", "TokenPayload",
    "AlumnoOut", "AlumnosPaginated",
    "UploadResponse", "CargaHistorialOut", "CargaRevertResponse"
]
