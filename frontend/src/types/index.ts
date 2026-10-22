export type UserRole = "ADMIN" | "RESPONSABLE_ACADEMICA";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  escuela_id: number | null;
  escuela_nombre: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserCreatePayload {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  escuela_id?: number | null;
}

export interface UserUpdatePayload {
  email?: string;
  full_name?: string;
  password?: string;
  role?: UserRole;
  escuela_id?: number | null;
  is_active?: boolean;
}

export interface Escuela {
  id: number;
  nombre: string;
  created_at: string;
}

export interface PropuestaFormativa {
  id: number;
  nombre: string;
  escuela_id: number;
  plan_codigo?: string | null;
  version_plan?: string | null;
  ubicacion?: string | null;
  updated_at: string;
  alumnos_count?: number;
}

export interface Alumno {
  id: number;
  propuesta_id: number;
  apellido_nombre: string;
  documento: string;
  fecha_nacimiento?: string | null;
  email?: string | null;
  telefono?: string | null;
  legajo?: string | null;
  plan?: string | null;
  anio_ingreso?: number | null;
  duracion_anios?: number | null;
  fecha_ingreso?: string | null;
  ultimo_examen?: string | null;
  ultima_reinscripcion?: string | null;
  promedio_con_aplazos?: number | null;
  promedio_sin_aplazos?: number | null;
  actividades_aprobadas: number;
  total_actividades: number;
  estado_inscripcion?: string | null;
  pais_origen?: string | null;
  coeficiente?: number | null;
  updated_at: string;
  propuesta_nombre?: string | null;
}

export interface AlumnosPaginatedResponse {
  items: Alumno[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  activos?: number;
  egresados?: number;
  promedio_historico?: number | null;
  promedio_general_con_aplazos?: number | null;
  promedio_general_sin_aplazos?: number | null;
  anios_disponibles?: number[];
}

export interface UploadResponse {
  carga_id?: number;
  escuela: string;
  propuesta: string;
  total_procesados: number;
  nuevos: number;
  actualizados: number;
}

export interface CargaHistorial {
  id: number;
  filename: string;
  escuela_id: number;
  escuela_nombre: string;
  propuesta_id: number | null;
  propuesta_nombre: string | null;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  fecha_carga: string;
  total_filas: number;
  nuevos: number;
  actualizados: number;
}

export interface HistogramaMateriasItem {
  materias: number;
  cantidad: number;
}

export interface TramoAvanceItem {
  tramo: string;
  rango: string;
  cantidad: number;
  porcentaje: number;
}

export interface CohorteItem {
  anio: number;
  cursantes: number;
  egresados: number;
  inactivos: number;
  total: number;
}

export interface DistribucionPromediosItem {
  rango: string;
  cantidad: number;
}

export interface AlumnosEstadisticas {
  total_alumnos: number;
  activos: number;
  egresados: number;
  inactivos: number;
  promedio_historico: number | null;
  promedio_general_con_aplazos?: number | null;
  promedio_general_sin_aplazos?: number | null;
  avance_promedio_general: number;
  avance_promedio_cursantes: number;
  histograma_materias: HistogramaMateriasItem[];
  tramos_avance: TramoAvanceItem[];
  cohortes: CohorteItem[];
  distribucion_promedios: DistribucionPromediosItem[];
  alumnos_en_riesgo: number;
}
