import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.seed import seed_database
from app.models.user import User, UserRole
from app.models.escuela import Escuela
from app.utils.security import hash_password, create_access_token

# Use in-memory SQLite for fast, isolated tests
TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine_test)
    session = TestingSessionLocal()
    seed_database(session)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers(db_session):
    admin = db_session.query(User).filter(User.email == "admin@undec.edu.ar").first()
    token = create_access_token(
        data={"sub": admin.email, "role": admin.role, "escuela_id": admin.escuela_id}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def ingenieria_headers(db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    user = User(
        email="ing_coord@undec.edu.ar",
        full_name="Coordinador Ingeniería",
        hashed_password=hash_password("password123"),
        role=UserRole.RESPONSABLE_ACADEMICA.value,
        escuela_id=esc_ing.id,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(
        data={"sub": user.email, "role": user.role, "escuela_id": user.escuela_id}
    )
    return {"Authorization": f"Bearer {token}", "user": user, "escuela": esc_ing}


@pytest.fixture
def sociales_headers(db_session):
    esc_soc = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ciencias Sociales").first()
    user = User(
        email="soc_coord@undec.edu.ar",
        full_name="Coordinador Sociales",
        hashed_password=hash_password("password123"),
        role=UserRole.RESPONSABLE_ACADEMICA.value,
        escuela_id=esc_soc.id,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(
        data={"sub": user.email, "role": user.role, "escuela_id": user.escuela_id}
    )
    return {"Authorization": f"Bearer {token}", "user": user, "escuela": esc_soc}
