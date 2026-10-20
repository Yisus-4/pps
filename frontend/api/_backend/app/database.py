import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings


def _resolve_database_url() -> str:
    # 1. Prioritize Vercel Postgres / Neon or explicit DATABASE_URL environment variables
    # Direct (non-pooling) is prioritized for reliable DDL and serverless execution
    env_url = (
        os.environ.get("POSTGRES_URL_NON_POOLING")
        or os.environ.get("postgres_URL_NON_POOLING")
        or os.environ.get("POSTGRES_URL")
        or os.environ.get("postgres_URL")
        or os.environ.get("DATABASE_URL")
        or os.environ.get("STORAGE_URL")
        or os.environ.get("POSTGRES_PRISMA_URL")
    )
    if not env_url:
        for k, v in os.environ.items():
            if k.upper().endswith("_URL") and (v.startswith("postgres://") or v.startswith("postgresql://")):
                env_url = v
                break

    if env_url:
        if env_url.startswith("postgres://"):
            env_url = env_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif env_url.startswith("postgresql://") and not env_url.startswith("postgresql+"):
            env_url = env_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return env_url

    env_url = settings.DATABASE_URL

    # 2. Fallback to SQLite (using /tmp/alumnos.db on Vercel serverless)
    if os.environ.get("VERCEL") and env_url == "sqlite:///./alumnos.db":
        tmp_db_path = "/tmp/alumnos.db"
        if not os.path.exists(tmp_db_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidates = [
                os.path.normpath(os.path.join(base_dir, "..", "alumnos.db")),
                os.path.normpath(os.path.join(base_dir, "..", "..", "alumnos.db")),
                os.path.normpath(os.path.join(base_dir, "..", "..", "backend", "alumnos.db")),
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    try:
                        shutil.copy2(candidate, tmp_db_path)
                        os.chmod(tmp_db_path, 0o666)
                    except Exception:
                        pass
                    break
        return f"sqlite:///{tmp_db_path}"
    return env_url


DATABASE_URL = _resolve_database_url()

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        connect_args={"connect_timeout": 15},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
