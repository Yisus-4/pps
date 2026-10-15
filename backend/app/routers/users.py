from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.escuela import Escuela
from app.models.carga import CargaHistorial
from app.schemas.user import UserOut, UserCreate, UserUpdate
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


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado."
        )

    # Validate email uniqueness if changing email
    if user_in.email is not None and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email, User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un usuario registrado con el correo '{user_in.email}'."
            )
        user.email = user_in.email

    # Determine target role
    target_role = user_in.role if user_in.role is not None else user.role
    valid_roles = [r.value for r in UserRole]
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Los roles permitidos son: {', '.join(valid_roles)}."
        )

    # Determine target escuela_id
    if "escuela_id" in user_in.model_fields_set:
        target_escuela_id = user_in.escuela_id
    else:
        target_escuela_id = user.escuela_id

    # Validate escuela assignment according to role
    if target_role == UserRole.RESPONSABLE_ACADEMICA.value:
        if target_escuela_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un usuario con rol RESPONSABLE_ACADEMICA debe estar asignado a una Escuela (escuela_id)."
            )
        escuela = db.query(Escuela).filter(Escuela.id == target_escuela_id).first()
        if not escuela:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La Escuela con ID {target_escuela_id} no existe."
            )
        user.escuela_id = target_escuela_id
    else:
        # Admin role
        user.escuela_id = target_escuela_id

    user.role = target_role

    if user_in.full_name is not None:
        user.full_name = user_in.full_name

    if user_in.password:
        user.hashed_password = hash_password(user_in.password)

    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    db.commit()
    db.refresh(user)

    escuela_nombre = user.escuela.nombre if user.escuela else None
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        escuela_id=user.escuela_id,
        escuela_nombre=escuela_nombre,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propia cuenta de usuario administrador."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado."
        )

    user_email = user.email

    # Disassociate user from cargas_historial
    db.query(CargaHistorial).filter(CargaHistorial.usuario_id == user.id).update(
        {CargaHistorial.usuario_id: None}, synchronize_session=False
    )

    db.delete(user)
    db.commit()

    return {"message": f"Usuario {user_email} eliminado exitosamente"}
