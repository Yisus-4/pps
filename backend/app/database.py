import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings


def _resolve_database_url() -> str:
    db_url = settings.DATABASE_URL
    if os.environ.get("VERCEL") and db_url == "sqlite:///./alumnos.db":
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
    return db_url


DATABASE_URL = _resolve_database_url()

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
