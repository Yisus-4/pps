"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { escuelasApi, uploadApi } from "@/lib/api";
import { CargaHistorial, Escuela, UploadResponse } from "@/types";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCheck,
  ArrowRight,
  Trash2,
  RotateCw,
  Clock,
  User as UserIcon,
  AlertTriangle,
  X,
  GraduationCap,
} from "lucide-react";

export default function CargarPage() {
  const { user, isAdmin } = useAuth();

  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [selectedEscuelaId, setSelectedEscuelaId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);

  // Historial state
  const [historial, setHistorial] = useState<CargaHistorial[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Revert confirmation modal state
  const [cargaToRevert, setCargaToRevert] = useState<CargaHistorial | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistorial = useCallback(async (escuelaId?: number | null) => {
    setIsLoadingHistorial(true);
    setHistorialError(null);
    try {
      const data = await uploadApi.getHistorial(escuelaId || undefined);
      setHistorial(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setHistorialError(err.message);
      } else {
        setHistorialError("Error al cargar el historial de cargas.");
      }
    } finally {
      setIsLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    const fetchEscuelasAndInitialData = async () => {
      try {
        const data = await escuelasApi.getAll();
        setEscuelas(data);

        let initialEscuelaId: number | null = null;
        if (user && user.role === "RESPONSABLE_ACADEMICA" && user.escuela_id) {
          initialEscuelaId = user.escuela_id;
        } else if (data.length > 0) {
          initialEscuelaId = data[0].id;
        }

        setSelectedEscuelaId(initialEscuelaId);
        await fetchHistorial(initialEscuelaId);
      } catch (err) {
        console.error("Error inicializando vista de carga:", err);
      }
    };

    fetchEscuelasAndInitialData();
  }, [user, fetchHistorial]);

  const handleEscuelaChange = async (newId: number) => {
    setSelectedEscuelaId(newId);
    setError(null);
    setResult(null);
    await fetchHistorial(newId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setResult(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResult(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv", ".txt"];
    const hasValidExt = validExtensions.some((ext) =>
      f.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setError(
        "Formato de archivo no soportado. Por favor, seleccione un archivo de planilla (.xlsx o .csv)."
      );
      return;
    }

    setFile(f);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedEscuelaId) {
      setError("Por favor, seleccione una Escuela y un archivo para procesar.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await uploadApi.uploadFile(file, selectedEscuelaId);
      setResult(res);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Auto-refresh upload history immediately after successful upload
      await fetchHistorial(selectedEscuelaId);
      setActionSuccess("Archivo cargado y procesado exitosamente.");
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado durante la carga del archivo.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmRevert = async () => {
    if (!cargaToRevert) return;

    setIsReverting(true);
    try {
      const res = await uploadApi.revertCarga(cargaToRevert.id);
      setActionSuccess(
        `Carga revertida con éxito: ${res.alumnos_eliminados} alumno(s) asociado(s) eliminados.`
      );
      setTimeout(() => setActionSuccess(null), 6000);
      setCargaToRevert(null);
      await fetchHistorial(selectedEscuelaId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setHistorialError(err.message);
      } else {
        setHistorialError("Error al revertir la carga.");
      }
    } finally {
      setIsReverting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-[#4F3A44] tracking-tight">
                Carga de Datos Académicos
              </h1>
            </div>
            <p className="text-sm text-[#6B6166] mt-0.5">
              Importe o actualice la nómina de alumnos y gestione las cargas previas.
            </p>
          </div>
        </div>

        {/* Global Action Notification */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-[#EBF3EE] border border-[#3F6B4F]/30 text-sm text-[#3F6B4F] flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[#3F6B4F] hover:opacity-75 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2-Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload Form & Results */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
              {/* Institutional top gold bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5B115]" />

              <h2 className="text-lg font-bold text-[#4F3A44] mb-4 flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-[#826170]" />
                <span>Subir Archivo de Alumnos</span>
              </h2>

              <form onSubmit={handleUpload} className="space-y-5">
                {/* Escuela Selector */}
                <div>
                  <label
                    htmlFor="escuela-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1.5"
                  >
                    Escuela UNdeC
                  </label>

                  <div className="relative">
                    <select
                      id="escuela-select"
                      value={selectedEscuelaId || ""}
                      disabled={!isAdmin && user?.role === "RESPONSABLE_ACADEMICA"}
                      onChange={(e) => handleEscuelaChange(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white disabled:bg-[#FAF8F7] disabled:text-[#6B6166] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    >
                      {escuelas.map((esc) => (
                        <option key={esc.id} value={esc.id}>
                          {esc.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isAdmin && user?.role === "RESPONSABLE_ACADEMICA" && (
                    <p className="text-[11px] text-[#6B6166] mt-1.5 flex items-center">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-[#826170]" />
                      Su usuario está asignado a esta escuela exclusivamente.
                    </p>
                  )}
                </div>

                {/* Drag & Drop Zone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1.5">
                    Planilla de Alumnos (.xlsx / .csv)
                  </label>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#826170] bg-[#F1E9ED]"
                        : file
                        ? "border-[#3F6B4F] bg-[#EBF3EE]/30"
                        : "border-[#D5C3CC] hover:border-[#826170] bg-[#FAF8F7]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {file ? (
                      <div className="flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-[#EBF3EE] text-[#3F6B4F] flex items-center justify-center mb-2.5">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-[#1F1A1C] break-all">{file.name}</p>
                        <p className="text-xs text-[#6B6166] mt-0.5">
                          Tamaño: {formatFileSize(file.size)}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="mt-2.5 inline-flex items-center text-xs text-[#A33B2F] hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remover archivo
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-[#F1E9ED] text-[#826170] flex items-center justify-center mb-2.5">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-[#1F1A1C]">
                          Haga clic o arrastre el archivo aquí
                        </p>
                        <p className="text-xs text-[#6B6166] mt-1">
                          Formatos soportados: Excel (.xlsx) y CSV (.csv)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-[#A33B2F] flex items-start space-x-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Error en la carga</p>
                      <p className="text-xs mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={!file || !selectedEscuelaId || isUploading}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#826170] hover:bg-[#4F3A44] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#826170] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Procesando registros de alumnos...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Iniciar Procesamiento y Carga
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Upload Result Feedback Card */}
              {result && (
                <div className="mt-6 p-5 rounded-xl bg-[#EBF3EE] border border-[#3F6B4F]/30 text-[#1F1A1C] space-y-3.5 animate-in fade-in">
                  <div className="flex items-center space-x-2.5 text-[#3F6B4F]">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold">
                        Carga completada exitosamente
                      </h3>
                      <p className="text-[11px] text-[#3F6B4F]">
                        Los registros han sido integrados a la base de datos de UNdeC.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-[#3F6B4F]/10">
                      <span className="text-[#6B6166] text-[10px] uppercase font-bold block">Escuela</span>
                      <span className="font-bold text-[#1F1A1C] truncate block">
                        {result.escuela}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-[#3F6B4F]/10">
                      <span className="text-[#6B6166] text-[10px] uppercase font-bold block">Propuesta / Carrera</span>
                      <span className="font-bold text-[#1F1A1C] truncate block">
                        {result.propuesta}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-[#3F6B4F]/10">
                      <span className="text-[#6B6166] text-[10px] uppercase font-bold block">Nuevos Alumnos</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        +{result.nuevos}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-[#3F6B4F]/10">
                      <span className="text-[#6B6166] text-[10px] uppercase font-bold block">Actualizados</span>
                      <span className="font-bold text-[#826170] text-sm">
                        {result.actualizados}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-[#6B6166] text-[11px]">
                      Total procesados: <strong className="text-[#1F1A1C]">{result.total_procesados}</strong>
                    </span>
                    <Link
                      href="/alumnos"
                      className="inline-flex items-center font-bold text-[#3F6B4F] hover:underline"
                    >
                      Ver padrón en Alumnos
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Historial de Cargas */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl p-6 shadow-xs relative overflow-hidden">
              {/* Institutional top gold bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#826170]" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-[#826170]" />
                  <h2 className="text-lg font-bold text-[#4F3A44]">
                    Historial de Cargas
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F1E9ED] text-[#826170]">
                    {historial.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => fetchHistorial(selectedEscuelaId)}
                  disabled={isLoadingHistorial}
                  title="Actualizar historial"
                  className="p-1.5 text-[#6B6166] hover:text-[#4F3A44] hover:bg-[#FAF8F7] rounded-lg transition-colors border border-[#E6E0DD]"
                >
                  <RotateCw
                    className={`w-4 h-4 ${isLoadingHistorial ? "animate-spin text-[#826170]" : ""}`}
                  />
                </button>
              </div>

              {historialError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#A33B2F] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{historialError}</span>
                  </div>
                  <button
                    onClick={() => setHistorialError(null)}
                    className="font-bold text-[#A33B2F]"
                  >
                    ✕
                  </button>
                </div>
              )}

              {isLoadingHistorial ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-[#6B6166]">
                  <div className="w-8 h-8 border-3 border-[#D5C3CC] border-t-[#826170] rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-[#826170]">
                    Cargando historial de cargas...
                  </span>
                </div>
              ) : historial.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-[#E6E0DD] rounded-xl bg-[#FAF8F7]">
                  <Clock className="w-9 h-9 text-[#A98B99] mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-bold text-[#4F3A44]">
                    No hay cargas registradas
                  </p>
                  <p className="text-xs text-[#6B6166] mt-1 max-w-sm mx-auto">
                    Los archivos que suba quedarán registrados aquí con el detalle de alumnos ingresados y la posibilidad de revertir la operación.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                  {historial.map((item) => (
                    <div
                      key={item.id}
                      className="border border-[#E6E0DD] rounded-xl p-4 bg-white hover:border-[#D5C3CC] transition-all hover:shadow-2xs space-y-2.5"
                    >
                      {/* Top Row: Filename and Revert Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#FAF3DD] text-[#A07A0B] flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1F1A1C] truncate" title={item.filename}>
                              {item.filename}
                            </p>
                            <p className="text-[11px] text-[#6B6166] flex items-center mt-0.5">
                              <GraduationCap className="w-3 h-3 mr-1 text-[#826170] shrink-0" />
                              <span className="truncate" title={item.propuesta_nombre || "Carrera sin identificar"}>
                                {item.propuesta_nombre || "Carrera no especificada"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCargaToRevert(item)}
                          title="Revertir carga y eliminar alumnos asociados"
                          className="shrink-0 inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-[#A33B2F] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Revertir
                        </button>
                      </div>

                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-[#6B6166] pt-1 border-t border-[#E6E0DD]/60 gap-1.5">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-[#A98B99]" />
                          {formatDate(item.fecha_carga)}
                        </span>
                        <span className="flex items-center">
                          <UserIcon className="w-3 h-3 mr-1 text-[#A98B99]" />
                          {item.usuario_nombre || "Usuario del sistema"}
                        </span>
                      </div>

                      {/* Statistics Badges */}
                      <div className="flex items-center space-x-2 pt-0.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF8F7] text-[#4F3A44] border border-[#E6E0DD]">
                          Total: {item.total_filas}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#EBF3EE] text-[#3F6B4F] border border-[#3F6B4F]/20">
                          +{item.nuevos} nuevos
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F1E9ED] text-[#826170] border border-[#D5C3CC]">
                          {item.actualizados} actualizados
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal for Reverting an Upload */}
        {cargaToRevert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => !isReverting && setCargaToRevert(null)}
                className="absolute top-4 right-4 p-1.5 text-[#6B6166] hover:text-[#4F3A44] rounded-lg hover:bg-[#F1E9ED]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-[#A33B2F] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1A1C]">
                    ¿Revertir esta carga de alumnos?
                  </h3>
                  <p className="text-xs text-[#6B6166] mt-0.5">
                    Se eliminarán los registros creados durante esta importación.
                  </p>
                </div>
              </div>

              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-xs text-[#A33B2F] space-y-1">
                <p className="font-medium">
                  ¿Está seguro de revertir esta carga? Se eliminarán los{" "}
                  <strong>{cargaToRevert.nuevos || cargaToRevert.total_filas}</strong> alumnos asociados a este archivo (<strong>{cargaToRevert.filename}</strong>). Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isReverting}
                  onClick={() => setCargaToRevert(null)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B6166] hover:bg-[#FAF8F7] rounded-lg transition-colors border border-[#E6E0DD]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isReverting}
                  onClick={handleConfirmRevert}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#A33B2F] hover:bg-[#862D23] rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center"
                >
                  {isReverting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                      Revirtiendo carga...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Sí, Revertir Carga
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
