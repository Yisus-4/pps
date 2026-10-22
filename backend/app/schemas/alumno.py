from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class AlumnoOut(BaseModel):
    id: int
    propuesta_id: int
    apellido_nombre: str
    documento: str
    fecha_nacimiento: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    legajo: Optional[str] = None
    plan: Optional[str] = None
    anio_ingreso: Optional[int] = None
    duracion_anios: Optional[int] = None
    fecha_ingreso: Optional[str] = None
    ultimo_examen: Optional[str] = None
    ultima_reinscripcion: Optional[str] = None
    promedio_con_aplazos: Optional[float] = None
    promedio_sin_aplazos: Optional[float] = None
    actividades_aprobadas: int = 0
    total_actividades: int = 0
    estado_inscripcion: Optional[str] = None
    pais_origen: Optional[str] = None
    coeficiente: Optional[float] = None
    updated_at: datetime
    
    # Extra informative fields
    propuesta_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlumnosPaginated(BaseModel):
    items: List[AlumnoOut]
    total: int
    page: int
    limit: int
    total_pages: int
    activos: int = 0
    egresados: int = 0
    promedio_historico: Optional[float] = None
    promedio_general_con_aplazos: Optional[float] = None
    promedio_general_sin_aplazos: Optional[float] = None


class HistogramaMateriasItem(BaseModel):
    materias: int
    cantidad: int


class TramoAvanceItem(BaseModel):
    tramo: str
    rango: str
    cantidad: int
    porcentaje: float


class CohorteItem(BaseModel):
    anio: int
    cursantes: int
    egresados: int
    inactivos: int
    total: int


class DistribucionPromediosItem(BaseModel):
    rango: str
    cantidad: int


class AlumnosEstadisticasOut(BaseModel):
    total_alumnos: int
    activos: int
    egresados: int
    inactivos: int
    promedio_historico: Optional[float] = None
    promedio_general_con_aplazos: Optional[float] = None
    promedio_general_sin_aplazos: Optional[float] = None
    avance_promedio_general: float
    avance_promedio_cursantes: float
    histograma_materias: List[HistogramaMateriasItem]
    tramos_avance: List[TramoAvanceItem]
    cohortes: List[CohorteItem]
    distribucion_promedios: List[DistribucionPromediosItem]
    alumnos_en_riesgo: int
