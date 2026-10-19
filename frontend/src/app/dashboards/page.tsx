"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { alumnosApi, escuelasApi } from "@/lib/api";
import {
  AlumnosEstadisticas,
  Escuela,
  PropuestaFormativa,
  HistogramaMateriasItem,
} from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  GraduationCap,
  Users,
  Award,
  TrendingUp,
  RotateCw,
  AlertTriangle,
  BookOpen,
  PieChart as PieIcon,
  Layers,
  Sparkles,
} from "lucide-react";

export default function DashboardsPage() {
  const { user, isAdmin } = useAuth();

  // Filters
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [selectedEscuelaId, setSelectedEscuelaId] = useState<number | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaFormativa[]>([]);
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<number | null>(null);

  // Data & State
  const [stats, setStats] = useState<AlumnosEstadisticas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Histogram view mode: "detallado" | "agrupado"
  const [histMode, setHistMode] = useState<"detallado" | "agrupado">("detallado");

  // SSR hydration guard for Recharts
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Load escuelas on mount
  useEffect(() => {
    const fetchEscuelas = async () => {
      try {
        const data = await escuelasApi.getAll();
        setEscuelas(data);

        // School coordinator locked to their assigned school
        if (user && user.role === "RESPONSABLE_ACADEMICA" && user.escuela_id) {
          setSelectedEscuelaId(user.escuela_id);
        }
      } catch (err) {
        console.error("Error cargando escuelas:", err);
      }
    };

    fetchEscuelas();
  }, [user]);

  // 2. Load propuestas when selected school changes
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
        setSelectedPropuestaId(null);
      } catch (err) {
        console.error("Error cargando propuestas formativas:", err);
      }
    };

    fetchPropuestas();
  }, [selectedEscuelaId]);

  // 3. Fetch statistics when filter changes
  const fetchEstadisticas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await alumnosApi.getEstadisticas({
        escuela_id: selectedEscuelaId,
        propuesta_id: selectedPropuestaId,
      });
      setStats(data);
    } catch (err: unknown) {
      console.error("Error obteniendo estadísticas:", err);
      setError("No se pudieron cargar las estadísticas académicas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscuelaId, selectedPropuestaId]);

  // Grouped histogram data
  const groupedHistogramData = useMemo(() => {
    if (!stats?.histograma_materias) return [];

    const bins = [
      { rango: "0", min: 0, max: 0, cantidad: 0 },
      { rango: "1 - 5", min: 1, max: 5, cantidad: 0 },
      { rango: "6 - 10", min: 6, max: 10, cantidad: 0 },
      { rango: "11 - 20", min: 11, max: 20, cantidad: 0 },
      { rango: "21 - 30", min: 21, max: 30, cantidad: 0 },
      { rango: "31 - 40", min: 31, max: 40, cantidad: 0 },
      { rango: "41+", min: 41, max: 9999, cantidad: 0 },
    ];

    for (const item of stats.histograma_materias) {
      for (const bin of bins) {
        if (item.materias >= bin.min && item.materias <= bin.max) {
          bin.cantidad += item.cantidad;
          break;
        }
      }
    }

    return bins;
  }, [stats?.histograma_materias]);

  const activeCarreraNombre = useMemo(() => {
    if (!selectedPropuestaId) return null;
    return propuestas.find((p) => p.id === selectedPropuestaId)?.nombre || null;
  }, [selectedPropuestaId, propuestas]);

  const activeEscuelaNombre = useMemo(() => {
    if (!selectedEscuelaId) return "Todas las Escuelas";
    return escuelas.find((e) => e.id === selectedEscuelaId)?.nombre || "Escuela seleccionada";
  }, [selectedEscuelaId, escuelas]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-[#4F3A44] tracking-tight">
                Dashboards Académicos
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
                <Sparkles className="w-3 h-3 mr-1 text-[#E5B115]" />
                Directores de Carrera
              </span>
            </div>
            <p className="text-sm text-[#6B6166] mt-0.5">
              Métricas consolidadas, distribución curricular, análisis de cohortes y rendimiento académico.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {stats && stats.alumnos_en_riesgo > 0 && (
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                <span>
                  <strong>{stats.alumnos_en_riesgo}</strong> alumnos en riesgo (≥3 años y &lt;25% avance)
                </span>
              </div>
            )}

            <button
              onClick={fetchEstadisticas}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1.5 border border-[#E6E0DD] rounded-lg shadow-2xs text-xs font-semibold text-[#4F3A44] bg-white hover:bg-[#FAF8F7] focus:outline-hidden disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Escuela Dropdown */}
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B6166] mb-1">
                Escuela Académica
              </label>
              <select
                value={selectedEscuelaId || ""}
                disabled={!isAdmin && user?.role === "RESPONSABLE_ACADEMICA"}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedEscuelaId(val);
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
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B6166] mb-1">
                Carrera / Propuesta Formativa
              </label>
              <select
                value={selectedPropuestaId || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedPropuestaId(val);
                }}
                disabled={!selectedEscuelaId && !selectedPropuestaId && propuestas.length === 0}
                className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
              >
                <option value="">Todas las Carreras de la Escuela</option>
                {propuestas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.plan_codigo ? `(${p.plan_codigo})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Context banner */}
        <div className="bg-[#FAF8F7] border border-[#E6E0DD] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#6B6166] gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#4F3A44]">Ámbito del reporte:</span>
            <span className="font-bold text-[#826170]">{activeEscuelaNombre}</span>
            {activeCarreraNombre && (
              <>
                <span>&bull;</span>
                <span className="font-bold text-[#1F1A1C]">{activeCarreraNombre}</span>
              </>
            )}
          </div>
          {stats && (
            <div className="flex items-center space-x-3 text-[11px]">
              <span>Inactivos: <strong className="text-gray-700">{stats.inactivos}</strong></span>
              <span>&bull;</span>
              <span>Egresados: <strong className="text-emerald-700">{stats.egresados}</strong></span>
              <span>&bull;</span>
              <span>Cursantes: <strong className="text-blue-700">{stats.activos}</strong></span>
            </div>
          )}
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Alumnos */}
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#826170]" />
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
                  Total Alumnos
                </p>
                <div className="p-1.5 rounded-lg bg-[#F1E9ED] text-[#826170]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[#1F1A1C] mt-2">
                {stats ? stats.total_alumnos.toLocaleString() : "-"}
              </p>
            </div>
            <p className="text-[11px] text-[#A98B99] mt-3">
              Matrícula histórica acumulada
            </p>
          </div>

          {/* Card 2: Cursantes Activos */}
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563EB]" />
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
                  Cursantes Activos
                </p>
                <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB]">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2 mt-2">
                <p className="text-3xl font-black text-[#1D4ED8]">
                  {stats ? stats.activos.toLocaleString() : "-"}
                </p>
                {stats && stats.total_alumnos > 0 && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm">
                    {((stats.activos / stats.total_alumnos) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#6B6166] mt-3">
              Actividad en los últimos 12 meses
            </p>
          </div>

          {/* Card 3: Egresados */}
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#10B981]" />
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
                  Egresados
                </p>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-[#10B981]">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2 mt-2">
                <p className="text-3xl font-black text-[#059669]">
                  {stats ? stats.egresados.toLocaleString() : "-"}
                </p>
                {stats && stats.total_alumnos > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                    {((stats.egresados / stats.total_alumnos) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#6B6166] mt-3">
              100% de actividades aprobadas
            </p>
          </div>

          {/* Card 4: Avance Promedio General */}
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5B115]" />
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
                  Avance General
                </p>
                <div className="p-1.5 rounded-lg bg-amber-50 text-[#A07A0B]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[#4F3A44] mt-2">
                {stats ? `${stats.avance_promedio_general.toFixed(1)}%` : "-"}
              </p>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-[#E6E0DD] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-linear-to-r from-[#826170] to-[#E5B115] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats?.avance_promedio_general || 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-[#6B6166]">
                Cursantes activos: <strong className="text-[#1F1A1C]">{stats ? `${stats.avance_promedio_cursantes.toFixed(1)}%` : "-"}</strong>
              </p>
            </div>
          </div>

          {/* Card 5: Promedio Histórico (Egresados) */}
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#4F3A44]" />
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#6B6166] uppercase tracking-wider">
                  Promedio Egresados
                </p>
                <div className="p-1.5 rounded-lg bg-[#FAF8F7] text-[#4F3A44]">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[#4F3A44] mt-2">
                {stats?.promedio_historico !== null && stats?.promedio_historico !== undefined
                  ? stats.promedio_historico.toFixed(2)
                  : "-"}
              </p>
            </div>
            <p className="text-[11px] text-[#6B6166] mt-3">
              Promedio histórico con aplazos
            </p>
          </div>
        </div>

        {/* Charts Section 1: Histograma de Materias & Tramos de Avance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Histograma de Materias Aprobadas */}
          <div className="lg:col-span-7 bg-white border border-[#E6E0DD] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#F1E9ED]">
                <div>
                  <h2 className="text-base font-black text-[#4F3A44] tracking-tight flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-[#826170]" />
                    Histograma de Materias Aprobadas
                  </h2>
                  <p className="text-xs text-[#6B6166] mt-0.5">
                    Cantidad de alumnos según la cantidad exacta de materias que tienen aprobadas.
                  </p>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-[#F1E9ED] p-0.5 rounded-lg border border-[#D5C3CC] self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setHistMode("detallado")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      histMode === "detallado"
                        ? "bg-white text-[#4F3A44] shadow-2xs font-bold"
                        : "text-[#6B6166] hover:text-[#1F1A1C]"
                    }`}
                  >
                    Detallado (0 a {stats?.histograma_materias?.length ? stats.histograma_materias.length - 1 : 48})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistMode("agrupado")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      histMode === "agrupado"
                        ? "bg-white text-[#4F3A44] shadow-2xs font-bold"
                        : "text-[#6B6166] hover:text-[#1F1A1C]"
                    }`}
                  >
                    Agrupado
                  </button>
                </div>
              </div>

              <div className="h-72 w-full mt-4">
                {isMounted && stats && (
                  <ResponsiveContainer width="100%" height="100%">
                    {histMode === "detallado" ? (
                      <BarChart
                        data={stats.histograma_materias}
                        margin={{ top: 15, right: 10, left: -15, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1E9ED" />
                        <XAxis
                          dataKey="materias"
                          stroke="#6B6166"
                          fontSize={11}
                          tickLine={false}
                          interval="preserveStartEnd"
                          label={{
                            value: "Cantidad de Materias Aprobadas",
                            position: "insideBottom",
                            offset: -12,
                            fontSize: 11,
                            fill: "#6B6166",
                          }}
                        />
                        <YAxis stroke="#6B6166" fontSize={11} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload as HistogramaMateriasItem;
                              const pct = stats.total_alumnos > 0 ? ((d.cantidad / stats.total_alumnos) * 100).toFixed(1) : "0";
                              return (
                                <div className="bg-white border border-[#E6E0DD] p-2.5 rounded-lg shadow-md text-xs">
                                  <p className="font-bold text-[#4F3A44]">
                                    {d.materias} materias aprobadas
                                  </p>
                                  <p className="text-[#826170] font-semibold mt-1">
                                    Alumnos: <span className="font-bold text-[#1F1A1C]">{d.cantidad}</span>
                                  </p>
                                  <p className="text-[11px] text-[#6B6166]">
                                    Representa el {pct}% del total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="cantidad"
                          fill="#826170"
                          radius={[3, 3, 0, 0]}
                          activeBar={{ fill: "#4F3A44" }}
                        />
                      </BarChart>
                    ) : (
                      <BarChart
                        data={groupedHistogramData}
                        margin={{ top: 15, right: 10, left: -15, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1E9ED" />
                        <XAxis
                          dataKey="rango"
                          stroke="#6B6166"
                          fontSize={11}
                          tickLine={false}
                          label={{
                            value: "Rango de Materias Aprobadas",
                            position: "insideBottom",
                            offset: -12,
                            fontSize: 11,
                            fill: "#6B6166",
                          }}
                        />
                        <YAxis stroke="#6B6166" fontSize={11} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              const pct = stats.total_alumnos > 0 ? ((d.cantidad / stats.total_alumnos) * 100).toFixed(1) : "0";
                              return (
                                <div className="bg-white border border-[#E6E0DD] p-2.5 rounded-lg shadow-md text-xs">
                                  <p className="font-bold text-[#4F3A44]">
                                    Rango: {d.rango} materias
                                  </p>
                                  <p className="text-[#826170] font-semibold mt-1">
                                    Alumnos: <span className="font-bold text-[#1F1A1C]">{d.cantidad}</span>
                                  </p>
                                  <p className="text-[11px] text-[#6B6166]">
                                    Representa el {pct}% del total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="cantidad"
                          fill="#826170"
                          radius={[4, 4, 0, 0]}
                          activeBar={{ fill: "#4F3A44" }}
                        >
                          {groupedHistogramData.map((_, index) => (
                            <Cell
                              key={`cell-grp-${index}`}
                              fill={index === 0 ? "#8A8A85" : index === 6 ? "#10B981" : "#826170"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1E9ED] flex items-center justify-between text-[11px] text-[#6B6166]">
              <span>* Fuente: Registros académicos de actas y exámenes aprobados</span>
              <span className="font-semibold text-[#826170]">Total: {stats?.total_alumnos || 0} estudiantes</span>
            </div>
          </div>

          {/* Chart 2: Porcentaje de Avance de los Alumnos */}
          <div className="lg:col-span-5 bg-white border border-[#E6E0DD] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-[#F1E9ED]">
                <h2 className="text-base font-black text-[#4F3A44] tracking-tight flex items-center">
                  <PieIcon className="w-4 h-4 mr-2 text-[#2563EB]" />
                  Tramos de Avance Curricular
                </h2>
                <p className="text-xs text-[#6B6166] mt-0.5">
                  Distribución de alumnos según porcentaje del plan completado.
                </p>
              </div>

              {/* Progress bars list for high visual readability */}
              <div className="space-y-3.5 mt-4">
                {stats?.tramos_avance.map((t, idx) => {
                  let barColor = "bg-[#2563EB]";
                  let textColor = "text-[#1D4ED8]";
                  let badgeBg = "bg-blue-50 text-blue-700 border-blue-200";

                  if (t.tramo.includes("0%")) {
                    barColor = "bg-[#8A8A85]";
                    textColor = "text-gray-700";
                    badgeBg = "bg-gray-100 text-gray-700 border-gray-200";
                  } else if (t.tramo.includes("100%")) {
                    barColor = "bg-[#10B981]";
                    textColor = "text-[#059669]";
                    badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  } else if (t.tramo.includes("76%")) {
                    barColor = "bg-[#3B82F6]";
                    textColor = "text-[#1D4ED8]";
                    badgeBg = "bg-blue-50 text-blue-700 border-blue-200";
                  } else if (t.tramo.includes("51%")) {
                    barColor = "bg-[#60A5FA]";
                    textColor = "text-blue-800";
                    badgeBg = "bg-blue-50 text-blue-800 border-blue-200";
                  } else if (t.tramo.includes("26%")) {
                    barColor = "bg-[#93C5FD]";
                    textColor = "text-blue-900";
                    badgeBg = "bg-blue-50 text-blue-900 border-blue-100";
                  } else {
                    barColor = "bg-[#BFDBFE]";
                    textColor = "text-blue-900";
                    badgeBg = "bg-blue-50 text-blue-900 border-blue-100";
                  }

                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#4F3A44]">{t.tramo}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#1F1A1C]">{t.cantidad}</span>
                          <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-sm border ${badgeBg}`}>
                            {t.porcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#F1E9ED] rounded-full h-2 overflow-hidden">
                        <div
                          className={`${barColor} h-2 rounded-full transition-all duration-500 group-hover:opacity-90`}
                          style={{ width: `${Math.min(100, t.porcentaje)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1E9ED] text-[11px] text-[#6B6166] mt-4">
              <span className="font-semibold text-[#4F3A44]">Clave pedagógica: </span>
              El tramo 0% evidencia ingresantes o inscriptos que aún no regularizan o aprueban su primera materia.
            </div>
          </div>
        </div>

        {/* Charts Section 2: Propuestas para Directores (Cohortes & Rendimiento) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 3: Retención y Rezago por Cohorte de Ingreso */}
          <div className="lg:col-span-7 bg-white border border-[#E6E0DD] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-[#F1E9ED]">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#1D4ED8]">
                    Propuesta Directores
                  </span>
                  <h2 className="text-base font-black text-[#4F3A44] tracking-tight">
                    Retención y Rezago por Cohorte de Ingreso
                  </h2>
                </div>
                <p className="text-xs text-[#6B6166] mt-1">
                  Permite identificar en qué año de ingreso se produce mayor desgranamiento o abandono.
                </p>
              </div>

              <div className="h-80 w-full mt-4">
                {isMounted && stats && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.cohortes}
                      margin={{ top: 20, right: 10, left: -15, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1E9ED" />
                      <XAxis
                        dataKey="anio"
                        stroke="#6B6166"
                        fontSize={11}
                        tickLine={false}
                        label={{
                          value: "Año de Ingreso (Cohorte)",
                          position: "insideBottom",
                          offset: -12,
                          fontSize: 11,
                          fill: "#6B6166",
                        }}
                      />
                      <YAxis stroke="#6B6166" fontSize={11} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const cur = payload.find((p) => p.dataKey === "cursantes")?.value as number || 0;
                            const egr = payload.find((p) => p.dataKey === "egresados")?.value as number || 0;
                            const ina = payload.find((p) => p.dataKey === "inactivos")?.value as number || 0;
                            const tot = cur + egr + ina;
                            return (
                              <div className="bg-white border border-[#E6E0DD] p-3 rounded-lg shadow-md text-xs space-y-1.5 min-w-[190px]">
                                <p className="font-bold text-[#4F3A44] border-b border-gray-100 pb-1">
                                  Cohorte {label} (Total: {tot})
                                </p>
                                <div className="flex items-center justify-between text-blue-700">
                                  <span className="flex items-center">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] mr-1.5" />
                                    Cursantes:
                                  </span>
                                  <span className="font-bold">{cur} ({tot > 0 ? ((cur / tot) * 100).toFixed(0) : 0}%)</span>
                                </div>
                                <div className="flex items-center justify-between text-emerald-700">
                                  <span className="flex items-center">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mr-1.5" />
                                    Egresados:
                                  </span>
                                  <span className="font-bold">{egr} ({tot > 0 ? ((egr / tot) * 100).toFixed(0) : 0}%)</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600">
                                  <span className="flex items-center">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#8A8A85] mr-1.5" />
                                    Inactivos:
                                  </span>
                                  <span className="font-bold">{ina} ({tot > 0 ? ((ina / tot) * 100).toFixed(0) : 0}%)</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                      />
                      <Bar dataKey="cursantes" name="Cursantes" stackId="a" fill="#2563EB" />
                      <Bar dataKey="egresados" name="Egresados" stackId="a" fill="#10B981" />
                      <Bar dataKey="inactivos" name="Inactivos" stackId="a" fill="#8A8A85" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1E9ED] text-[11px] text-[#6B6166] flex items-center justify-between">
              <span>Barras apiladas proporcionales por año de ingreso</span>
              <span className="text-[#2563EB] font-semibold">Visualización de cohortes</span>
            </div>
          </div>

          {/* Chart 4: Distribución de Rendimiento Académico (Promedios) */}
          <div className="lg:col-span-5 bg-white border border-[#E6E0DD] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-[#F1E9ED]">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-[#826170]">
                    Propuesta Directores
                  </span>
                  <h2 className="text-base font-black text-[#4F3A44] tracking-tight">
                    Rendimiento Académico
                  </h2>
                </div>
                <p className="text-xs text-[#6B6166] mt-1">
                  Campana de calificaciones para monitoreo de exigencia y retención pedagógica.
                </p>
              </div>

              <div className="h-80 w-full mt-4">
                {isMounted && stats && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.distribucion_promedios}
                      margin={{ top: 20, right: 10, left: -15, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1E9ED" />
                      <XAxis
                        dataKey="rango"
                        stroke="#6B6166"
                        fontSize={11}
                        tickLine={false}
                        label={{
                          value: "Promedio con Aplazos",
                          position: "insideBottom",
                          offset: -12,
                          fontSize: 11,
                          fill: "#6B6166",
                        }}
                      />
                      <YAxis stroke="#6B6166" fontSize={11} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-[#E6E0DD] p-2.5 rounded-lg shadow-md text-xs">
                                <p className="font-bold text-[#4F3A44]">
                                  Rango de Calificación: {d.rango}
                                </p>
                                <p className="text-[#826170] font-semibold mt-1">
                                  Alumnos evaluados: <span className="font-bold text-[#1F1A1C]">{d.cantidad}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="cantidad"
                        name="Alumnos"
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: "#4F3A44" }}
                      >
                        {stats.distribucion_promedios.map((item, index) => {
                          // Visual grade bracket colors
                          let c = "#826170";
                          if (item.rango === "< 4") c = "#EF4444";
                          else if (item.rango === "4.0 - 5.9") c = "#F59E0B";
                          else if (item.rango === "6.0 - 6.9") c = "#EAB308";
                          else if (item.rango === "7.0 - 7.9") c = "#3B82F6";
                          else if (item.rango === "8.0 - 8.9") c = "#10B981";
                          else if (item.rango === "9.0 - 10") c = "#826170";

                          return <Cell key={`cell-prom-${index}`} fill={c} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1E9ED] text-[11px] text-[#6B6166] flex items-center justify-between">
              <span>Alumnos con al menos 1 examen rendido</span>
              <span className="font-semibold text-[#826170]">Distribución gaussiana</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
