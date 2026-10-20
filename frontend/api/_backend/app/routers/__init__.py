from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.escuelas import router as escuelas_router
from app.routers.upload import router as upload_router
from app.routers.alumnos import router as alumnos_router

__all__ = [
    "auth_router",
    "users_router",
    "escuelas_router",
    "upload_router",
    "alumnos_router"
]
