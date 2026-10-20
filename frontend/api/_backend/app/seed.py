from sqlalchemy.orm import Session
from app.config import settings
from app.models.escuela import Escuela
from app.models.user import User, UserRole
from app.utils.security import hash_password

OFICIAL_ESCUELAS = [
    "Escuela de Ingeniería",
    "Escuela de Ciencias Naturales",
    "Escuela de Ciencias Sociales",
    "Escuela de Ciencias Humanas y de la Salud",
]


def seed_database(db: Session) -> None:
    # 1. Seed Escuelas
    for esc_nombre in OFICIAL_ESCUELAS:
        exists = db.query(Escuela).filter(Escuela.nombre == esc_nombre).first()
        if not exists:
            nueva_escuela = Escuela(nombre=esc_nombre)
            db.add(nueva_escuela)
    db.commit()

    # 2. Seed Default Admin User
    admin_email = settings.FIRST_SUPERUSER_EMAIL
    admin_exists = db.query(User).filter(User.email == admin_email).first()
    if not admin_exists:
        admin_user = User(
            email=admin_email,
            full_name="Administrador UNdeC",
            hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
            role=UserRole.ADMIN.value,
            escuela_id=None,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
