import {
  AlumnosEstadisticas,
  AlumnosPaginatedResponse,
  CargaHistorial,
  Escuela,
  LoginResponse,
  PropuestaFormativa,
  UploadResponse,
  User,
  UserCreatePayload,
  UserUpdatePayload,
} from "@/types";

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:8000";
    }
    // In production (Vercel), use same-origin relative paths (/api/...)
    return "";
  }
  return "http://localhost:8000";
};

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("undec_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("undec_token", token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("undec_token");
    localStorage.removeItem("undec_user");
  }
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${baseUrl}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.",
      0,
      err
    );
  }

  if (res.status === 401) {
    removeAuthToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  }

  if (!res.ok) {
    let errorDetail = "Ocurrió un error en la solicitud";
    let errorData = null;
    try {
      errorData = await res.json();
      if (errorData?.detail) {
        if (typeof errorData.detail === "string") {
          errorDetail = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorDetail = errorData.detail
            .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
            .join(", ");
        }
      }
    } catch {
      // not JSON
    }
    throw new ApiError(errorDetail, res.status, errorData);
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<User> => {
    return request<User>("/api/auth/me", {
      method: "GET",
    });
  },
};

export const escuelasApi = {
  getAll: async (): Promise<Escuela[]> => {
    return request<Escuela[]>("/api/escuelas", {
      method: "GET",
    });
  },

  getPropuestas: async (escuelaId: number): Promise<PropuestaFormativa[]> => {
    return request<PropuestaFormativa[]>(`/api/escuelas/${escuelaId}/propuestas`, {
      method: "GET",
    });
  },
};

export interface AlumnosQueryParams {
  escuela_id?: number | null;
  propuesta_id?: number | null;
  search?: string;
  estado_inscripcion?: string;
  condicion?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const alumnosApi = {
  getAll: async (params: AlumnosQueryParams): Promise<AlumnosPaginatedResponse> => {
    const searchParams = new URLSearchParams();
    if (params.escuela_id) searchParams.append("escuela_id", params.escuela_id.toString());
    if (params.propuesta_id) searchParams.append("propuesta_id", params.propuesta_id.toString());
    if (params.search) searchParams.append("search", params.search.trim());
    if (params.estado_inscripcion) searchParams.append("estado_inscripcion", params.estado_inscripcion);
    if (params.condicion) searchParams.append("condicion", params.condicion);
    if (params.sort_by) searchParams.append("sort_by", params.sort_by);
    if (params.sort_dir) searchParams.append("sort_dir", params.sort_dir);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());

    const qs = searchParams.toString();
    return request<AlumnosPaginatedResponse>(`/api/alumnos${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  getEstadisticas: async (params: {
    escuela_id?: number | null;
    propuesta_id?: number | null;
  }): Promise<AlumnosEstadisticas> => {
    const searchParams = new URLSearchParams();
    if (params.escuela_id) searchParams.append("escuela_id", params.escuela_id.toString());
    if (params.propuesta_id) searchParams.append("propuesta_id", params.propuesta_id.toString());

    const qs = searchParams.toString();
    return request<AlumnosEstadisticas>(`/api/alumnos/estadisticas${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },
};

export const uploadApi = {
  uploadFile: async (file: File, escuelaId: number): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("escuela_id", escuelaId.toString());

    return request<UploadResponse>("/api/upload", {
      method: "POST",
      body: formData,
    });
  },

  getHistorial: async (escuelaId?: number): Promise<CargaHistorial[]> => {
    const qs = escuelaId ? `?escuela_id=${escuelaId}` : "";
    return request<CargaHistorial[]>(`/api/upload/historial${qs}`, {
      method: "GET",
    });
  },

  revertCarga: async (
    cargaId: number
  ): Promise<{ message: string; alumnos_eliminados: number }> => {
    return request<{ message: string; alumnos_eliminados: number }>(
      `/api/upload/historial/${cargaId}`,
      {
        method: "DELETE",
      }
    );
  },
};

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return request<User[]>("/api/users", {
      method: "GET",
    });
  },

  createUser: async (payload: UserCreatePayload): Promise<User> => {
    return request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (
    userId: number,
    payload: UserUpdatePayload
  ): Promise<User> => {
    return request<User>(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteUser: async (userId: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/api/users/${userId}`, {
      method: "DELETE",
    });
  },
};
