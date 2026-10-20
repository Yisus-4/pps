from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Escuela(Base):
    __tablename__ = "escuelas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    users = relationship("User", back_populates="escuela")
    propuestas = relationship("PropuestaFormativa", back_populates="escuela", cascade="all, delete-orphan")
