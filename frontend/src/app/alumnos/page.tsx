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
  X,
} from "lucide-react";

export default function AlumnosPage() {
  const { user, isAdmin } = useAuth();

  // Filter state
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [selectedEscuelaId, setSelectedEscuelaId] = useState<number | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaFormativa[]>([]);
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("apellido_nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Data state
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);

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
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        limit,
      });
      setAlumnos(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
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
  }, [selectedEscuelaId, selectedPropuestaId, searchTerm, sortBy, sortDir, page, limit]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const res = await alumnosApi.getAll({
          escuela_id: selectedEscuelaId,
          propuesta_id: selectedPropuestaId,
          search: searchTerm,
          sort_by: sortBy,
          sort_dir: sortDir,
          page,
          limit,
        });
        if (!ignore) {
          setAlumnos(res.items);
          setTotal(res.total);
          setTotalPages(res.total_pages);
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
  }, [selectedEscuelaId, selectedPropuestaId, searchTerm, sortBy, sortDir, page, limit]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await executeQuery();
  };

  // Quick stats computed from current results
  const regularesCount = alumnos.filter((a) =>
    a.estado_inscripcion?.toUpperCase().includes("REGULAR")
  ).length;

  const aspirantesCount = alumnos.filter((a) =>
    a.estado_inscripcion?.toUpperCase().includes("ASPIRANTE")
  ).length;

  const averageWithFails =
    alumnos.filter((a) => a.promedio_con_aplazos !== null).length > 0
      ? (
          alumnos
            .filter((a) => a.promedio_con_aplazos !== null)
            .reduce((acc, curr) => acc + (curr.promedio_con_aplazos || 0), 0) /
          alumnos.filter((a) => a.promedio_con_aplazos !== null).length
        ).toFixed(2)
      : "-";

  // Functional status badge helper
  const renderStatusBadge = (estado?: string | null) => {
    if (!estado) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <HelpCircle className="w-3 h-3 mr-1" />
          Sin Datos
        </span>
      );
    }

    const upper = estado.toUpperCase();
    if (upper.includes("REGULAR") || upper.includes("ACEPTADA") || upper.includes("ACTIVO")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF3EE] text-[#3F6B4F] border border-[#3F6B4F]/20">
          <CheckCircle2 className="w-3 h-3 mr-1 text-[#3F6B4F]" />
          {estado}
        </span>
      );
    }
    if (upper.includes("ASPIRANTE") || upper.includes("OBSERV") || upper.includes("PENDIENTE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
          <Clock className="w-3 h-3 mr-1 text-[#A07A0B]" />
          {estado}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAECEB] text-[#A33B2F] border border-[#A33B2F]/20">
        <XCircle className="w-3 h-3 mr-1 text-[#A33B2F]" />
        {estado}
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
                Alumnos SIU Guaraní
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F1E9ED] text-[#826170] border border-[#D5C3CC]">
                {total} Registrados
              </span>
            </div>
            <p className="text-sm text-[#6B6166] mt-0.5">
              Visualización y seguimiento del padrón académico de la Universidad Nacional de Chilecito.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3.5 py-2 border border-[#E6E0DD] rounded-lg shadow-2xs text-xs font-semibold text-[#4F3A44] bg-white hover:bg-[#FAF8F7] focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>

            <button
              onClick={() => exportAlumnosToCsv(alumnos)}
              disabled={alumnos.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-2xs text-xs font-semibold text-white bg-[#826170] hover:bg-[#4F3A44] focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#826170]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Total en Vista
            </p>
            <p className="text-2xl font-black text-[#1F1A1C] mt-1">{total}</p>
          </div>

          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#3F6B4F]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Regulares (Pág.)
            </p>
            <p className="text-2xl font-black text-[#3F6B4F] mt-1">{regularesCount}</p>
          </div>

          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5B115]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Aspirantes (Pág.)
            </p>
            <p className="text-2xl font-black text-[#A07A0B] mt-1">{aspirantesCount}</p>
          </div>

          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#A98B99]" />
            <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
              Prom. c/ Aplazos
            </p>
            <p className="text-2xl font-black text-[#4F3A44] mt-1">{averageWithFails}</p>
          </div>
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
                placeholder="Buscar por Nombre, DNI o Legajo..."
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

        {/* Table Container */}
        <div className="bg-white border border-[#E6E0DD] rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E6E0DD] text-left text-xs">
              <thead className="bg-[#FAF8F7] text-[#4F3A44] font-bold uppercase tracking-wider">
                <tr>
                  {renderSortableHeader("documento", "Documento", "px-4 py-3.5")}
                  {renderSortableHeader("apellido_nombre", "Apellido y Nombre", "px-4 py-3.5")}
                  {renderSortableHeader("legajo", "Legajo", "px-3 py-3.5")}
                  {renderSortableHeader("plan", "Plan", "px-3 py-3.5")}
                  {renderSortableHeader("anio_ingreso", "Año Ingreso", "px-3 py-3.5")}
                  {renderSortableHeader("estado_inscripcion", "Estado Inscripción", "px-3 py-3.5")}
                  {renderSortableHeader("promedio_con_aplazos", "Prom. c/ Apl.", "px-3 py-3.5", "center")}
                  {renderSortableHeader("promedio_sin_aplazos", "Prom. s/ Apl.", "px-3 py-3.5", "center")}
                  {renderSortableHeader("actividades_aprobadas", "Actividades", "px-3 py-3.5", "center")}
                  {renderSortableHeader("ultimo_examen", "Último Examen", "px-4 py-3.5")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0DD] bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-[#6B6166]">
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
                          Intente ajustar o restablecer los filtros de búsqueda, escuela o carrera,
                          o cargue un archivo Excel SIU Guaraní en la pestaña &quot;Cargar Datos&quot;.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  alumnos.map((a) => {
                    const isSelected = selectedAlumno?.id === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAlumno(isSelected ? null : a)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#F1E9ED] font-medium border-l-4 border-[#826170]"
                            : "hover:bg-[#FAF8F7]"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-[#1F1A1C] whitespace-nowrap">
                          {a.documento}
                        </td>
                        <td className="px-4 py-3 text-[#1F1A1C] whitespace-nowrap">
                          <div className="font-semibold">{a.apellido_nombre}</div>
                          {a.propuesta_nombre && (
                            <div className="text-[10px] text-[#6B6166] truncate max-w-[200px]">
                              {a.propuesta_nombre}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-[#6B6166] whitespace-nowrap">
                          {a.legajo || "-"}
                        </td>
                        <td className="px-3 py-3 text-[#6B6166] whitespace-nowrap">
                          {a.plan || "-"}
                        </td>
                        <td className="px-3 py-3 text-[#6B6166] whitespace-nowrap">
                          {a.anio_ingreso || "-"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {renderStatusBadge(a.estado_inscripcion)}
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
                        <td className="px-4 py-3 text-[#6B6166] whitespace-nowrap font-mono text-[11px]">
                          {a.ultimo_examen || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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

        {/* Selected Alumno Detail Drawer / Card */}
        {selectedAlumno && (
          <div className="bg-white border-2 border-[#826170]/30 rounded-xl p-5 shadow-sm relative">
            <button
              onClick={() => setSelectedAlumno(null)}
              className="absolute top-4 right-4 p-1 text-[#6B6166] hover:text-[#4F3A44] rounded-md hover:bg-[#F1E9ED]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#826170] text-white flex items-center justify-center font-bold">
                {selectedAlumno.apellido_nombre.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F1A1C]">
                  {selectedAlumno.apellido_nombre}
                </h3>
                <p className="text-xs text-[#6B6166]">
                  DNI: {selectedAlumno.documento} • Legajo: {selectedAlumno.legajo || "S/D"} • Carrera:{" "}
                  {selectedAlumno.propuesta_nombre || "S/D"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3 border-t border-[#E6E0DD]">
              <div>
                <span className="text-[#6B6166] block">Estado Inscripción:</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.estado_inscripcion || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Plan / Versión:</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.plan || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Año Ingreso:</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.anio_ingreso || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Fecha Ingreso:</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.fecha_ingreso || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Promedio c/ Aplazos:</span>
                <span className="font-semibold text-[#1F1A1C] font-mono">
                  {selectedAlumno.promedio_con_aplazos ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Promedio s/ Aplazos:</span>
                <span className="font-semibold text-[#1F1A1C] font-mono">
                  {selectedAlumno.promedio_sin_aplazos ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Actividades (Aprob./Tot.):</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.actividades_aprobadas} de {selectedAlumno.total_actividades}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Último Examen:</span>
                <span className="font-semibold text-[#1F1A1C] font-mono">
                  {selectedAlumno.ultimo_examen || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Email:</span>
                <span className="font-semibold text-[#1F1A1C] truncate block">
                  {selectedAlumno.email || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">Teléfono:</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.telefono || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#6B6166] block">País de Origen:</span>
                <span className="font-semibold text-[#1F1A1C]">
                  {selectedAlumno.pais_origen || "Argentina"}
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
        )}
      </div>
    </AppLayout>
  );
}
