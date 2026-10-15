"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { alumnosApi, escuelasApi } from "@/lib/api";
import { Alumno, Escuela, PropuestaFormativa } from "@/types";
import { exportAlumnosToCsv } from "@/lib/csv";
import {
  Search,
  Download,
  RotateCw,
  GraduationCap,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  List,
  Table as TableIcon,
  BookOpen,
  Award,
  User,
  X,
} from "lucide-react";

export default function AlumnosPage() {
  const { user, isAdmin } = useAuth();

  // View mode: 'compact' (fits screen without horizontal scroll), 'full' (all columns)
  const [viewMode, setViewMode] = useState<"compact" | "full">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("undec_alumnos_view_mode") as "compact" | "full" | null;
        if (saved && (saved === "compact" || saved === "full")) {
          return saved;
        }
      } catch {
        // Ignore
      }
    }
    return "compact";
  });

  // Filter state
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [selectedEscuelaId, setSelectedEscuelaId] = useState<number | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaFormativa[]>([]);
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [condicion, setCondicion] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("apellido_nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Data state
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activos, setActivos] = useState<number>(0);
  const [egresados, setEgresados] = useState(0);
  const [promedioHistorico, setPromedioHistorico] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);

  const changeViewMode = (mode: "compact" | "full") => {
    setViewMode(mode);
    try {
      localStorage.setItem("undec_alumnos_view_mode", mode);
    } catch {
      // Ignore
    }
  };

  // Initialize schools
  useEffect(() => {
    const fetchEscuelas = async () => {
      try {
        const data = await escuelasApi.getAll();
        setEscuelas(data);

        // If user is Responsable, lock to their school
        if (user && user.role === "RESPONSABLE_ACADEMICA" && user.escuela_id) {
          setSelectedEscuelaId(user.escuela_id);
        }
      } catch (err) {
        console.error("Error cargando escuelas:", err);
      }
    };

    fetchEscuelas();
  }, [user]);

  // Load carreras (propuestas) when selected school changes
  useEffect(() => {
    const fetchPropuestas = async () => {
      if (!selectedEscuelaId) {
        setPropuestas([]);
        setSelectedPropuestaId(null);
        return;
      }

      try {
        const data = await escuelasApi.getPropuestas(selectedEscuelaId);
        setPropuestas(data);
        // Reset selected proposal if it does not belong to this school
        setSelectedPropuestaId(null);
      } catch (err) {
        console.error("Error cargando carreras:", err);
      }
    };

    fetchPropuestas();
  }, [selectedEscuelaId]);

  // Sort handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const renderSortableHeader = (
    field: string,
    label: string,
    className = "px-4 py-3.5",
    align: "left" | "center" = "left"
  ) => {
    const isSorted = sortBy === field;
    return (
      <th
        key={field}
        scope="col"
        onClick={() => handleSort(field)}
        className={`${className} cursor-pointer select-none transition-colors hover:bg-[#F1E9ED]/70 group`}
        title={`Ordenar por ${label} (${isSorted ? (sortDir === "asc" ? "descendente" : "ascendente") : "ascendente"})`}
      >
        <div className={`flex items-center space-x-1.5 ${align === "center" ? "justify-center" : ""}`}>
          <span className={isSorted ? "text-[#826170] font-black" : ""}>{label}</span>
          <span className="inline-flex items-center">
            {isSorted ? (
              sortDir === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#826170]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#826170]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-[#A98B99] opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Load students query
  const executeQuery = useCallback(async () => {
    try {
      const res = await alumnosApi.getAll({
        escuela_id: selectedEscuelaId,
        propuesta_id: selectedPropuestaId,
        search: searchTerm,
        condicion: condicion || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        limit,
      });
      setAlumnos(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setActivos(res.activos ?? 0);
      setEgresados(res.egresados ?? 0);
      setPromedioHistorico(res.promedio_historico ?? null);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al obtener los datos de alumnos");
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedEscuelaId, selectedPropuestaId, searchTerm, condicion, sortBy, sortDir, page, limit]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const res = await alumnosApi.getAll({
          escuela_id: selectedEscuelaId,
          propuesta_id: selectedPropuestaId,
          search: searchTerm,
          condicion: condicion || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          page,
          limit,
        });
        if (!ignore) {
          setAlumnos(res.items);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          setActivos(res.activos ?? 0);
          setEgresados(res.egresados ?? 0);
          setPromedioHistorico(res.promedio_historico ?? null);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Error al obtener los datos de alumnos");
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [selectedEscuelaId, selectedPropuestaId, searchTerm, condicion, sortBy, sortDir, page, limit]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await executeQuery();
  };

  // Helper: Formatear duración en la carrera en años
  const formatDuration = (years?: number | null): string => {
    if (years === null || years === undefined) return "-";
    if (years === 0) return "< 1 año";
    if (years === 1) return "1 año";
    return `${years} años`;
  };

  // Helper: Calcular edad dinámicamente desde fecha_nacimiento (ej. "20/01/1991" o "1991-01-20")
  const calculateAge = (birthDateStr?: string | null): string => {
    if (!birthDateStr) return "-";
    let day: number, month: number, year: number;
    if (birthDateStr.includes("/")) {
      const parts = birthDateStr.split("/");
      if (parts.length < 3) return "-";
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (birthDateStr.includes("-")) {
      const parts = birthDateStr.split("-");
      if (parts.length < 3) return "-";
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      return "-";
    }
    if (isNaN(day) || isNaN(month) || isNaN(year)) return "-";
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 && age < 120 ? `${age}` : "-";
  };

  // Helper: Normalizar número de teléfono al formato "XXXX XXXXXX"
  const normalizePhone = (phoneStr?: string | null): string => {
    if (!phoneStr) return "-";
    if (phoneStr.includes("|")) {
      const parts = phoneStr.split("|");
      return `${parts[0].trim()} ${parts[1].trim()}`;
    }
    const digits = phoneStr.replace(/\D/g, "");
    if (digits.length === 10) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    }
    return phoneStr.trim();
  };

  // Helper: Clasificación de condición del alumno (Recibido, Activo, Inactivo)
  const getStudentCondition = (a: Alumno): "recibido" | "activo" | "inactivo" => {
    if (a.total_actividades > 0 && a.actividades_aprobadas >= a.total_actividades) {
      return "recibido";
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    // Students enrolled in the current year are automatically active
    if (a.anio_ingreso === currentYear) {
      return "activo";
    }
    if (a.fecha_ingreso && a.fecha_ingreso.trim()) {
      const fStr = a.fecha_ingreso.trim();
      const token = fStr.split(" ")[0].split("T")[0];
      let fYear: number | null = null;
      if (token.includes("/")) {
        const parts = token.split("/");
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[2], 10);
          if (p0 > 1000) fYear = p0;
          else if (p2 > 1000) fYear = p2;
          else if (p2 < 100) fYear = 2000 + p2;
        }
      } else if (token.includes("-")) {
        const parts = token.split("-");
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[2], 10);
          if (p0 > 1000) fYear = p0;
          else if (p2 > 1000) fYear = p2;
        }
      }
      if (fYear === currentYear) {
        return "activo";
      }
    }

    if (!a.ultimo_examen || !a.ultimo_examen.trim()) {
      return "inactivo";
    }
    const s = a.ultimo_examen.trim();
    if (["none", "nan", "-", "s/d"].includes(s.toLowerCase())) {
      return "inactivo";
    }
    const token = s.split(" ")[0].split("T")[0];
    let dt: Date | null = null;
    if (token.includes("/")) {
      const parts = token.split("/");
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 1000) {
          dt = new Date(p0, p1 - 1, p2);
        } else if (p2 > 1000) {
          dt = new Date(p2, p1 - 1, p0);
        } else if (p2 < 100) {
          dt = new Date(2000 + p2, p1 - 1, p0);
        }
      }
    } else if (token.includes("-")) {
      const parts = token.split("-");
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 1000) {
          dt = new Date(p0, p1 - 1, p2);
        } else if (p2 > 1000) {
          dt = new Date(p2, p1 - 1, p0);
        }
      }
    }

    if (!dt || isNaN(dt.getTime())) {
      return "inactivo";
    }

    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (dt >= cutoff && dt <= limit) {
      return "activo";
    }
    return "inactivo";
  };


  // Functional status badge helper
  const renderStatusBadge = (estado?: string | null, compact = false) => {
    if (!estado) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
          <HelpCircle className="w-3 h-3 mr-1" />
          Sin Datos
        </span>
      );
    }

    const upper = estado.toUpperCase();
    let label = estado;
    if (compact) {
      if (upper.includes("INSC") && upper.includes("ACEPTADA")) label = "Aceptada";
      else if (upper.includes("ASPIRANTE")) label = "Aspirante";
      else if (upper.includes("REGULAR") && !upper.includes("NO")) label = "Regular";
      else if (upper.includes("NO REGULAR") || upper.includes("RECHAZ")) label = "Rechazado";
      else if (upper.includes("REINSC")) label = "Reinscripto";
      else if (upper.includes("PENDIENTE") || upper.includes("OBSERV")) label = "Observación";
    }

    if (upper.includes("REGULAR") || upper.includes("ACEPTADA") || upper.includes("ACTIVO")) {
      return (
        <span
          title={estado}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF3EE] text-[#3F6B4F] border border-[#3F6B4F]/20 whitespace-nowrap"
        >
          <CheckCircle2 className="w-3 h-3 mr-1 text-[#3F6B4F] shrink-0" />
          {label}
        </span>
      );
    }
    if (upper.includes("ASPIRANTE") || upper.includes("OBSERV") || upper.includes("PENDIENTE")) {
      return (
        <span
          title={estado}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30 whitespace-nowrap"
        >
          <Clock className="w-3 h-3 mr-1 text-[#A07A0B] shrink-0" />
          {label}
        </span>
      );
    }
    return (
      <span
        title={estado}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAECEB] text-[#A33B2F] border border-[#A33B2F]/20 whitespace-nowrap"
      >
        <XCircle className="w-3 h-3 mr-1 text-[#A33B2F] shrink-0" />
        {label}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Page Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-[#4F3A44] tracking-tight">
                Padrón de Alumnos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F1E9ED] text-[#826170] border border-[#D5C3CC]">
                {total} Registrados
              </span>
            </div>
            <p className="text-sm text-[#6B6166] mt-0.5">
              Visualización y seguimiento del padrón académico de la Universidad Nacional de Chilecito.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher */}
            <div className="flex items-center bg-[#F1E9ED] p-0.5 rounded-lg border border-[#D5C3CC]">
              <button
                type="button"
                onClick={() => changeViewMode("compact")}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === "compact"
                    ? "bg-white text-[#4F3A44] shadow-2xs font-bold"
                    : "text-[#6B6166] hover:text-[#1F1A1C]"
                }`}
                title="Vista compacta: Todos los campos ajustados a pantalla sin desplazamiento horizontal"
              >
                <List className="w-3.5 h-3.5 mr-1" />
                <span>Compacta</span>
              </button>
              <button
                type="button"
                onClick={() => changeViewMode("full")}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === "full"
                    ? "bg-white text-[#4F3A44] shadow-2xs font-bold"
                    : "text-[#6B6166] hover:text-[#1F1A1C]"
                }`}
                title="Vista completa: Tabla extendida con todas las columnas"
              >
                <TableIcon className="w-3.5 h-3.5 mr-1" />
                <span>Completa</span>
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1.5 border border-[#E6E0DD] rounded-lg shadow-2xs text-xs font-semibold text-[#4F3A44] bg-white hover:bg-[#FAF8F7] focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>

            <button
              onClick={() => exportAlumnosToCsv(alumnos)}
              disabled={alumnos.length === 0}
              className="inline-flex items-center px-3.5 py-1.5 border border-transparent rounded-lg shadow-2xs text-xs font-semibold text-white bg-[#826170] hover:bg-[#4F3A44] focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* KPI Cards (Métricas: Alumnos, Activos, Egresados y opcionalmente Promedio Histórico de Egresados) */}
        <div className={`grid grid-cols-1 ${selectedPropuestaId !== null ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-4`}>
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#826170]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Alumnos
            </p>
            <p className="text-2xl font-black text-[#1F1A1C] mt-1">{total}</p>
          </div>

          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#3F6B4F]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Activos
            </p>
            <p className="text-2xl font-black text-[#3F6B4F] mt-1">{activos}</p>
          </div>

          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563EB]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Egresados
            </p>
            <p className="text-2xl font-black text-[#1D4ED8] mt-1">{egresados}</p>
          </div>

          {selectedPropuestaId !== null && (
            <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#4F3A44]" />
              <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
                Promedio Histórico (Egresados)
              </p>
              <p className="text-2xl font-black text-[#4F3A44] mt-1">
                {promedioHistorico !== null && promedioHistorico !== undefined
                  ? promedioHistorico.toFixed(2)
                  : "-"}
              </p>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por Apellido y Nombre..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170] focus:border-[#826170]"
              />
            </div>

            {/* Escuela Dropdown */}
            <div className="md:col-span-3">
              <select
                value={selectedEscuelaId || ""}
                disabled={!isAdmin && user?.role === "RESPONSABLE_ACADEMICA"}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedEscuelaId(val);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
              >
                {isAdmin && <option value="">Todas las Escuelas UNdeC</option>}
                {escuelas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Carrera (Propuesta Formativa) Dropdown */}
            <div className="md:col-span-4">
              <select
                value={selectedPropuestaId || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedPropuestaId(val);
                  setPage(1);
                }}
                disabled={!selectedEscuelaId || propuestas.length === 0}
                className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
              >
                <option value="">
                  {selectedEscuelaId
                    ? propuestas.length === 0
                      ? "Sin carreras registradas en esta escuela"
                      : "Todas las carreras de la escuela"
                    : "Seleccione una Escuela primero"}
                </option>
                {propuestas.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.nombre} {prop.alumnos_count ? `(${prop.alumnos_count} alumnos)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Condition Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E6E0DD]">
            <span className="text-xs font-bold text-[#4F3A44] mr-1">Condición:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { value: "", label: "Todos los alumnos" },
                { value: "activos", label: "🟢 Activos" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setCondicion(item.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    condicion === item.value
                      ? item.value === "activos"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-[#826170] text-white shadow-2xs"
                      : "bg-[#F1E9ED] text-[#4F3A44] hover:bg-[#E6DEE2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#A33B2F] flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[#A33B2F] hover:text-red-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Data Container: Compact Table, Cards Grid, or Full Table */}
        <div className="bg-white border border-[#E6E0DD] rounded-xl shadow-2xs overflow-hidden">
          {/* 1. Vista Compacta (Columnas exactas solicitadas ajustadas a pantalla) */}
          {viewMode === "compact" && (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-[#E6E0DD] text-left text-xs">
                <thead className="bg-[#FAF8F7] text-[#4F3A44] font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-center w-16" title="Estado">
                      <span>Estado</span>
                    </th>
                    {renderSortableHeader("apellido_nombre", "Apellido y Nombre", "px-4 py-3.5")}
                    <th scope="col" className="px-3 py-3.5 select-none font-bold text-[#4F3A44]">Documento</th>
                    {renderSortableHeader("fecha_nacimiento", "Edad", "px-3 py-3.5", "center")}
                    <th scope="col" className="px-3 py-3.5 select-none font-bold text-[#4F3A44]">Legajo</th>
                    {renderSortableHeader("anio_ingreso", "Año Ingreso", "px-3 py-3.5", "center")}
                    {renderSortableHeader("duracion", "Duración", "px-3 py-3.5", "center")}
                    {renderSortableHeader("ultimo_examen", "Último Examen", "px-3 py-3.5")}
                    {renderSortableHeader("promedio_con_aplazos", "Prom. c/ Apl.", "px-3 py-3.5", "center")}
                    {renderSortableHeader("actividades_aprobadas", "Actividades", "px-3 py-3.5", "center")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0DD] bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-14 text-center text-[#6B6166]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-8 h-8 border-3 border-[#D5C3CC] border-t-[#826170] rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-[#826170]">
                            Cargando padrón de alumnos...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : alumnos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center">
                        <div className="max-w-sm mx-auto flex flex-col items-center">
                          <div className="w-12 h-12 bg-[#F1E9ED] text-[#826170] rounded-full flex items-center justify-center mb-3">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-[#1F1A1C]">
                            No se encontraron alumnos
                          </p>
                          <p className="text-xs text-[#6B6166] mt-1 text-center">
                            Intente ajustar o restablecer los filtros de búsqueda, escuela o carrera.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    alumnos.map((a) => {
                      const cond = getStudentCondition(a);
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAlumno(a)}
                          className="cursor-pointer transition-colors hover:bg-[#F1E9ED]/50 group"
                        >
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {cond === "recibido" ? (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200"
                                title="Recibido / Egresado"
                              />
                            ) : cond === "activo" ? (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"
                                title="Activo (examen en últimos 12 meses)"
                              />
                            ) : (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 ring-2 ring-gray-100"
                                title="Inactivo (sin examen en los últimos 12 meses)"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#1F1A1C] group-hover:text-[#826170] transition-colors whitespace-nowrap">
                            <div>{a.apellido_nombre}</div>
                            {a.propuesta_nombre && (
                              <div className="text-[10px] text-[#6B6166] font-normal truncate max-w-[200px]">
                                {a.propuesta_nombre}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-[#1F1A1C] whitespace-nowrap">
                            {a.documento}
                          </td>
                          <td className="px-3 py-3 text-center text-[#1F1A1C] font-semibold whitespace-nowrap">
                            {calculateAge(a.fecha_nacimiento)}
                          </td>
                          <td className="px-3 py-3 font-mono text-[#6B6166] whitespace-nowrap">
                            {a.legajo || "-"}
                          </td>
                          <td className="px-3 py-3 text-center text-[#6B6166] whitespace-nowrap">
                            {a.anio_ingreso || "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[#1F1A1C] whitespace-nowrap">
                            {formatDuration(a.duracion_anios)}
                          </td>
                          <td className="px-3 py-3 font-mono text-[#6B6166] text-[11px] whitespace-nowrap">
                            {a.ultimo_examen || "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-[#826170] whitespace-nowrap">
                            {a.promedio_con_aplazos !== null && a.promedio_con_aplazos !== undefined
                              ? a.promedio_con_aplazos.toFixed(2)
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[#1F1A1C] whitespace-nowrap">
                            <span className="font-semibold text-[#4F3A44]">{a.actividades_aprobadas}</span>
                            {" / "}
                            <span>{a.total_actividades}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Vista Completa */}
          {viewMode === "full" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E6E0DD] text-left text-xs">
                <thead className="bg-[#FAF8F7] text-[#4F3A44] font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-center w-28" title="Estado">
                      <span>Estado</span>
                    </th>
                    {renderSortableHeader("apellido_nombre", "Apellido y Nombre", "px-4 py-3.5")}
                    <th scope="col" className="px-4 py-3.5 select-none font-bold text-[#4F3A44]">Documento</th>
                    {renderSortableHeader("fecha_nacimiento", "Edad", "px-3 py-3.5", "center")}
                    <th scope="col" className="px-3 py-3.5 select-none font-bold text-[#4F3A44]">Legajo</th>
                    {renderSortableHeader("plan", "Plan", "px-3 py-3.5")}
                    {renderSortableHeader("anio_ingreso", "Año Ingreso", "px-3 py-3.5", "center")}
                    {renderSortableHeader("duracion", "Duración", "px-3 py-3.5", "center")}
                    {renderSortableHeader("estado_inscripcion", "Inscripción", "px-3 py-3.5")}
                    {renderSortableHeader("ultimo_examen", "Último Examen", "px-4 py-3.5")}
                    {renderSortableHeader("promedio_con_aplazos", "Prom. c/ Apl.", "px-3 py-3.5", "center")}
                    {renderSortableHeader("promedio_sin_aplazos", "Prom. s/ Apl.", "px-3 py-3.5", "center")}
                    {renderSortableHeader("actividades_aprobadas", "Actividades", "px-3 py-3.5", "center")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0DD] bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center text-[#6B6166]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-8 h-8 border-3 border-[#D5C3CC] border-t-[#826170] rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-[#826170]">
                            Cargando padrón de alumnos...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : alumnos.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-16 text-center">
                        <div className="max-w-sm mx-auto flex flex-col items-center">
                          <div className="w-12 h-12 bg-[#F1E9ED] text-[#826170] rounded-full flex items-center justify-center mb-3">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-[#1F1A1C]">
                            No se encontraron alumnos
                          </p>
                          <p className="text-xs text-[#6B6166] mt-1 text-center">
                            Intente ajustar o restablecer los filtros de búsqueda, escuela o carrera.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    alumnos.map((a) => {
                      const cond = getStudentCondition(a);
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAlumno(a)}
                          className="cursor-pointer transition-colors hover:bg-[#FAF8F7]"
                        >
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1.5 justify-center">
                              {cond === "recibido" ? (
                                <>
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200 shrink-0"
                                    title="Recibido / Egresado"
                                  />
                                  <span className="font-semibold text-blue-700 text-[11px]" title="Recibido / Egresado">
                                    Recibido
                                  </span>
                                </>
                              ) : cond === "activo" ? (
                                <>
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0"
                                    title="Activo (examen en últimos 12 meses)"
                                  />
                                  <span className="font-semibold text-emerald-700 text-[11px]" title="Activo (examen en últimos 12 meses)">
                                    Activo
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-gray-300 ring-2 ring-gray-100 shrink-0"
                                    title="Inactivo (sin examen en los últimos 12 meses)"
                                  />
                                  <span className="font-medium text-gray-500 text-[11px]" title="Inactivo (sin examen en los últimos 12 meses)">
                                    Inactivo
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#1F1A1C] whitespace-nowrap">
                            {a.apellido_nombre}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#1F1A1C] whitespace-nowrap">
                            {a.documento}
                          </td>
                          <td className="px-3 py-3 text-center text-[#1F1A1C] font-semibold whitespace-nowrap">
                            {calculateAge(a.fecha_nacimiento)}
                          </td>
                          <td className="px-3 py-3 font-mono text-[#6B6166] whitespace-nowrap">
                            {a.legajo || "-"}
                          </td>
                          <td className="px-3 py-3 text-[#6B6166] whitespace-nowrap">
                            {a.plan || "-"}
                          </td>
                          <td className="px-3 py-3 text-center text-[#6B6166] whitespace-nowrap">
                            {a.anio_ingreso || "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[#1F1A1C] whitespace-nowrap">
                            {formatDuration(a.duracion_anios)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {renderStatusBadge(a.estado_inscripcion)}
                          </td>
                          <td className="px-4 py-3 text-[#6B6166] whitespace-nowrap font-mono text-[11px]">
                            {a.ultimo_examen || "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[#1F1A1C] whitespace-nowrap">
                            {a.promedio_con_aplazos !== null && a.promedio_con_aplazos !== undefined
                              ? a.promedio_con_aplazos.toFixed(2)
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[#1F1A1C] whitespace-nowrap">
                            {a.promedio_sin_aplazos !== null && a.promedio_sin_aplazos !== undefined
                              ? a.promedio_sin_aplazos.toFixed(2)
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[#6B6166] whitespace-nowrap">
                            <span className="font-semibold text-[#4F3A44]">
                              {a.actividades_aprobadas}
                            </span>
                            {" / "}
                            <span>{a.total_actividades}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="px-4 py-3 bg-[#FAF8F7] border-t border-[#E6E0DD] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-[#6B6166]">
              <span>Mostrar</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-[#E6E0DD] rounded-md bg-white text-xs text-[#1F1A1C] focus:outline-hidden focus:ring-1 focus:ring-[#826170]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>alumnos por página</span>
            </div>

            <div className="text-[#6B6166]">
              Mostrando página <span className="font-bold text-[#1F1A1C]">{totalPages > 0 ? page : 0}</span> de{" "}
              <span className="font-bold text-[#1F1A1C]">{totalPages}</span> ({total} alumnos en total)
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center px-2.5 py-1.5 border border-[#E6E0DD] rounded-md bg-white text-xs font-semibold text-[#4F3A44] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center px-2.5 py-1.5 border border-[#E6E0DD] rounded-md bg-white text-xs font-semibold text-[#4F3A44] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Dialog: Ficha Completa del Alumno (Sin imagen en la parte superior izquierda) */}
        {selectedAlumno && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            onClick={() => setSelectedAlumno(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E6E0DD] animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#FAF8F7] px-6 py-4 border-b border-[#E6E0DD] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-[#1F1A1C]">
                      {selectedAlumno.apellido_nombre}
                    </h3>
                    {(() => {
                      const cond = getStudentCondition(selectedAlumno);
                      return cond === "recibido" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />
                          Recibido
                        </span>
                      ) : cond === "activo" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />
                          Inactivo
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-[#6B6166] mt-0.5">
                    {selectedAlumno.documento} • Legajo: {selectedAlumno.legajo || "S/D"} • Edad: {calculateAge(selectedAlumno.fecha_nacimiento)} años
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAlumno(null)}
                  className="p-1.5 text-[#6B6166] hover:text-[#4F3A44] rounded-lg hover:bg-[#F1E9ED] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Contacto y Comunicación (Email y Teléfono normalizado) */}
                <div>
                  <h4 className="text-[11px] uppercase font-bold tracking-wider text-[#826170] mb-2 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    Contacto y Datos Personales
                  </h4>
                  <div className="bg-[#FAF8F7] p-3.5 rounded-xl border border-[#E6E0DD] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[#6B6166] block">Email:</span>
                      <span className="font-semibold text-[#1F1A1C] break-all">
                        {selectedAlumno.email || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Teléfono (normalizado):</span>
                      <span className="font-semibold text-[#1F1A1C] font-mono text-sm">
                        {normalizePhone(selectedAlumno.telefono)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Edad / Fecha Nac.:</span>
                      <span className="font-semibold text-[#1F1A1C]">
                        {calculateAge(selectedAlumno.fecha_nacimiento)} años ({selectedAlumno.fecha_nacimiento || "S/D"})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">País de Origen:</span>
                      <span className="font-semibold text-[#1F1A1C]">
                        {selectedAlumno.pais_origen || "Argentina"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Coeficiente del Alumno:</span>
                      <span className="font-semibold text-[#1F1A1C] font-mono">
                        {selectedAlumno.coeficiente !== null && selectedAlumno.coeficiente !== undefined ? selectedAlumno.coeficiente : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Estado Inscripción:</span>
                      <span className="font-semibold text-[#1F1A1C]">
                        {selectedAlumno.estado_inscripcion || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rendimiento Académico (Prom. con Aplazos y Prom. sin Aplazos) */}
                <div>
                  <h4 className="text-[11px] uppercase font-bold tracking-wider text-[#826170] mb-2 flex items-center">
                    <Award className="w-3.5 h-3.5 mr-1.5" />
                    Rendimiento Académico
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#FAF8F7] p-3 rounded-xl border border-[#E6E0DD] text-center">
                      <span className="text-[11px] text-[#6B6166] block">Prom. con Aplazos</span>
                      <span className="text-lg font-black text-[#826170] font-mono mt-0.5 block">
                        {selectedAlumno.promedio_con_aplazos !== null && selectedAlumno.promedio_con_aplazos !== undefined
                          ? selectedAlumno.promedio_con_aplazos.toFixed(2)
                          : "-"}
                      </span>
                    </div>
                    <div className="bg-[#FAF8F7] p-3 rounded-xl border border-[#E6E0DD] text-center">
                      <span className="text-[11px] text-[#6B6166] block">Prom. sin Aplazos</span>
                      <span className="text-lg font-black text-[#4F3A44] font-mono mt-0.5 block">
                        {selectedAlumno.promedio_sin_aplazos !== null && selectedAlumno.promedio_sin_aplazos !== undefined
                          ? selectedAlumno.promedio_sin_aplazos.toFixed(2)
                          : "-"}
                      </span>
                    </div>
                    <div className="bg-[#FAF8F7] p-3 rounded-xl border border-[#E6E0DD] text-center">
                      <span className="text-[11px] text-[#6B6166] block">Actividades (Aprob./Tot.)</span>
                      <span className="text-lg font-black text-[#1F1A1C] font-mono mt-0.5 block">
                        {selectedAlumno.actividades_aprobadas} / {selectedAlumno.total_actividades}
                      </span>
                    </div>
                    <div className="bg-[#FAF8F7] p-3 rounded-xl border border-[#E6E0DD] text-center">
                      <span className="text-[11px] text-[#6B6166] block">Último Examen</span>
                      <span className="text-xs font-bold text-[#1F1A1C] font-mono mt-1.5 block">
                        {selectedAlumno.ultimo_examen || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Carrera y Trayectoria */}
                <div>
                  <h4 className="text-[11px] uppercase font-bold tracking-wider text-[#826170] mb-2 flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    Carrera y Trayectoria Académica
                  </h4>
                  <div className="bg-[#FAF8F7] p-3.5 rounded-xl border border-[#E6E0DD] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[#6B6166] block">Propuesta Formativa:</span>
                      <span className="font-bold text-[#1F1A1C]">
                        {selectedAlumno.propuesta_nombre || "No especificada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Plan de Estudios:</span>
                      <span className="font-semibold text-[#1F1A1C]">
                        {selectedAlumno.plan || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Año / Fecha Ingreso:</span>
                      <span className="font-semibold text-[#1F1A1C]">
                        {selectedAlumno.anio_ingreso || "-"} {selectedAlumno.fecha_ingreso ? `(${selectedAlumno.fecha_ingreso})` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Duración en la Carrera:</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="font-semibold text-[#1F1A1C]">
                          {formatDuration(selectedAlumno.duracion_anios)}
                        </span>
                        {selectedAlumno.duracion_anios !== null && selectedAlumno.duracion_anios !== undefined && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                              getStudentCondition(selectedAlumno) === "recibido"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {getStudentCondition(selectedAlumno) === "recibido" ? "Graduación" : "En curso"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Última Reinscripción:</span>
                      <span className="font-semibold text-[#1F1A1C] font-mono">
                        {selectedAlumno.ultima_reinscripcion || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6166] block">Última Actualización:</span>
                      <span className="font-semibold text-[#1F1A1C]">
                        {new Date(selectedAlumno.updated_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-[#FAF8F7] px-6 py-3 border-t border-[#E6E0DD] flex justify-end">
                <button
                  onClick={() => setSelectedAlumno(null)}
                  className="px-4 py-2 bg-[#826170] hover:bg-[#4F3A44] text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
