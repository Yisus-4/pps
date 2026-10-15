from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal, Base
from app.seed import seed_database
import app.models  # Ensure all models are registered
from app.routers import (
    auth_router,
    users_router,
    escuelas_router,
    upload_router,
    alumnos_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed initial data
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
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


@app.get("/api/health", tags=["General"])
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0"
    }
