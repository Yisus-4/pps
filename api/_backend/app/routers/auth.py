from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import Token
from app.schemas.user import UserOut
from app.models.user import User
from app.services.auth import authenticate_user, get_current_user
from app.utils.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    content_type = request.headers.get("content-type", "")
    email = None
    password = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
        except Exception:
            pass
    else:
        try:
            form = await request.form()
            email = form.get("username") or form.get("email")
            password = form.get("password")
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar credenciales (email y contraseña)"
        )

    try:
        user = authenticate_user(db, email=str(email).strip(), password=str(password))
    except Exception as db_err:
        # Self-healing attempt: tables or initial admin may need initialization in this database
        try:
            from app.main import init_db
            init_db()
            user = authenticate_user(db, email=str(email).strip(), password=str(password))
        except Exception as retry_err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en la base de datos: {str(retry_err)}"
            )

    if not user:
        # Check if any admin exists; if not, attempt seeding
        try:
            from app.models.user import UserRole
            from app.seed import seed_database
            admin_check = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
            if not admin_check:
                seed_database(db)
                user = authenticate_user(db, email=str(email).strip(), password=str(password))
        except Exception:
            pass

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (email o contraseña inválidos)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta de usuario está desactivada"
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "escuela_id": user.escuela_id}
    )

    escuela_nombre = user.escuela.nombre if user.escuela else None
    user_out = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        escuela_id=user.escuela_id,
        escuela_nombre=escuela_nombre,
        is_active=user.is_active,
        created_at=user.created_at
    )

    return Token(access_token=access_token, token_type="bearer", user=user_out)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    escuela_nombre = current_user.escuela.nombre if current_user.escuela else None
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        escuela_id=current_user.escuela_id,
        escuela_nombre=escuela_nombre,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
