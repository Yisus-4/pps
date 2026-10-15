from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.escuela import Escuela
from app.schemas.user import UserOut, UserCreate
from app.services.auth import get_current_active_admin
from app.utils.security import hash_password

router = APIRouter(prefix="/api/users", tags=["Usuarios"])


@router.get("", response_model=List[UserOut])
def get_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    users = db.query(User).order_by(User.id).all()
    user_list = []
    for u in users:
        escuela_nombre = u.escuela.nombre if u.escuela else None
        user_list.append(UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            escuela_id=u.escuela_id,
            escuela_nombre=escuela_nombre,
            is_active=u.is_active,
            created_at=u.created_at
        ))
    return user_list


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    # Check if email is taken
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario registrado con el correo '{user_in.email}'."
        )

    # Validate role
    valid_roles = [r.value for r in UserRole]
    if user_in.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Los roles permitidos son: {', '.join(valid_roles)}."
        )

    # Validate escuela_id if provided or required
    escuela_nombre = None
    if user_in.escuela_id is not None:
        escuela = db.query(Escuela).filter(Escuela.id == user_in.escuela_id).first()
        if not escuela:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La Escuela con ID {user_in.escuela_id} no existe."
            )
        escuela_nombre = escuela.nombre
    elif user_in.role == UserRole.RESPONSABLE_ACADEMICA.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un usuario con rol RESPONSABLE_ACADEMICA debe estar asignado a una Escuela (escuela_id)."
        )

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        escuela_id=user_in.escuela_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserOut(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        escuela_id=new_user.escuela_id,
        escuela_nombre=escuela_nombre,
        is_active=new_user.is_active,
        created_at=new_user.created_at
    )
