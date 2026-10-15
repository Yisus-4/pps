from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class PropuestaFormativa(Base):
    __tablename__ = "propuestas_formativas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(255), nullable=False, index=True)
    escuela_id = Column(Integer, ForeignKey("escuelas.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_codigo = Column(String(50), nullable=True)
    version_plan = Column(String(50), nullable=True)
    ubicacion = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    escuela = relationship("Escuela", back_populates="propuestas")
    alumnos = relationship("Alumno", back_populates="propuesta", cascade="all, delete-orphan")
