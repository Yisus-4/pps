from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Alumno(Base):
    __tablename__ = "alumnos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    propuesta_id = Column(Integer, ForeignKey("propuestas_formativas.id", ondelete="CASCADE"), nullable=False, index=True)
    
    apellido_nombre = Column(String(255), nullable=False, index=True)
    documento = Column(String(100), nullable=False, index=True)
    fecha_nacimiento = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    telefono = Column(String(100), nullable=True)
    legajo = Column(String(50), nullable=True)
    plan = Column(String(50), nullable=True)
    anio_ingreso = Column(Integer, nullable=True)
    fecha_ingreso = Column(String(50), nullable=True)
    ultimo_examen = Column(String(50), nullable=True)
    ultima_reinscripcion = Column(String(50), nullable=True)
    promedio_con_aplazos = Column(Float, nullable=True)
    promedio_sin_aplazos = Column(Float, nullable=True)
    actividades_aprobadas = Column(Integer, default=0, nullable=False)
    total_actividades = Column(Integer, default=0, nullable=False)
    estado_inscripcion = Column(String(255), nullable=True)
    pais_origen = Column(String(100), nullable=True)
    coeficiente = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    propuesta = relationship("PropuestaFormativa", back_populates="alumnos")

    __table_args__ = (
        UniqueConstraint("propuesta_id", "documento", name="uq_alumno_propuesta_documento"),
    )
