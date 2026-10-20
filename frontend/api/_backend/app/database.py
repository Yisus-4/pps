import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings


def _resolve_database_url() -> str:
    # 1. Prioritize Vercel Postgres / Neon or explicit DATABASE_URL environment variables
    env_url = (
        os.environ.get("POSTGRES_URL")
        or os.environ.get("DATABASE_URL")
        or settings.DATABASE_URL
    )
    if env_url.startswith("postgres://"):
        env_url = env_url.replace("postgres://", "postgresql://", 1)

    if env_url.startswith("postgresql://") or env_url.startswith("postgresql+"):
        return env_url

    # 2. Fallback to SQLite (using /tmp/alumnos.db on Vercel serverless)
    if os.environ.get("VERCEL") and env_url == "sqlite:///./alumnos.db":
        tmp_db_path = "/tmp/alumnos.db"
        if not os.path.exists(tmp_db_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidates = [
                os.path.normpath(os.path.join(base_dir, "..", "alumnos.db")),
                os.path.normpath(os.path.join(base_dir, "..", "..", "alumnos.db")),
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
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
