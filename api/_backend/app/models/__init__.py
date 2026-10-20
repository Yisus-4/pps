from app.database import Base
from app.models.escuela import Escuela
from app.models.user import User, UserRole
from app.models.propuesta import PropuestaFormativa
from app.models.carga import CargaHistorial
from app.models.alumno import Alumno

__all__ = ["Base", "Escuela", "User", "UserRole", "PropuestaFormativa", "CargaHistorial", "Alumno"]
