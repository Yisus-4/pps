import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base, get_db
from app.seed import seed_database
from app.models.user import User
import app.models  # Ensure all models are registered
from app.routers import (
    auth_router,
    users_router,
    escuelas_router,
    upload_router,
    alumnos_router
)

logger = logging.getLogger("uvicorn.error")


def init_db() -> None:
    """Create tables, apply schema migrations, and seed initial data."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "alumnos" in inspector.get_table_names():
                columns = [c["name"] for c in inspector.get_columns("alumnos")]
                if "carga_id" not in columns:
                    conn.execute(
                        text("ALTER TABLE alumnos ADD COLUMN carga_id INTEGER REFERENCES cargas_historial(id)")
                    )
                    conn.commit()
    except Exception as e:
        logger.warning(f"Error checking carga_id column: {e}")

    try:
        with SessionLocal() as db:
            seed_database(db)
    except Exception as e:
        logger.error(f"Error seeding database: {e}")


try:
    init_db()
except Exception:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed initial data
    init_db()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="UNdeC - Dashboard de Alumnos API",
    description="Backend para la gestión y carga de datos académicos SIU Guaraní de la Universidad Nacional de Chilecito.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev and deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(escuelas_router)
app.include_router(upload_router)
app.include_router(alumnos_router)


@app.get("/", tags=["General"])
def root():
    return {
        "message": "UNdeC Student Dashboard API",
        "status": "online",
        "documentation": "/docs"
    }


@app.get("/health", tags=["General"])
@app.get("/api/health", tags=["General"])
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    db_error = None
    users_count = None
    try:
        db.execute(text("SELECT 1"))
        users_count = db.query(User).count()
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    db_type = "sqlite"
    try:
        url_str = str(engine.url)
        if "postgres" in url_str:
            db_type = "postgres"
    except Exception:
        pass

    return {
        "status": "ok" if db_status == "ok" else "error",
        "database": db_status,
        "database_type": db_type,
        "users_count": users_count,
        "database_error": db_error,
        "service": "UNdeC Dashboard API",
        "version": "1.0.0"
    }
