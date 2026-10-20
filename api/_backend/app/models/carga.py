from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class CargaHistorial(Base):
    __tablename__ = "cargas_historial"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    escuela_id = Column(Integer, ForeignKey("escuelas.id", ondelete="CASCADE"), nullable=False, index=True)
    propuesta_id = Column(Integer, ForeignKey("propuestas_formativas.id", ondelete="SET NULL"), nullable=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    fecha_carga = Column(DateTime, default=get_utc_now, nullable=False)
    total_filas = Column(Integer, default=0, nullable=False)
    nuevos = Column(Integer, default=0, nullable=False)
    actualizados = Column(Integer, default=0, nullable=False)

    escuela = relationship("Escuela")
    propuesta = relationship("PropuestaFormativa")
    usuario = relationship("User")
    alumnos = relationship("Alumno", back_populates="carga", cascade="all, delete-orphan")
