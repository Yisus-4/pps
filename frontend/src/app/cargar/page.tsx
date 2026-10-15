"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { escuelasApi, uploadApi } from "@/lib/api";
import { Escuela, UploadResponse } from "@/types";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCheck,
  ArrowRight,
  Info,
  Trash2,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchEscuelas = async () => {
      try {
        const data = await escuelasApi.getAll();
        setEscuelas(data);

        if (user && user.role === "RESPONSABLE_ACADEMICA" && user.escuela_id) {
          setSelectedEscuelaId(user.escuela_id);
        } else if (data.length > 0) {
          // Admin defaults to first school or null
          setSelectedEscuelaId(data[0].id);
        }
      } catch (err) {
        console.error("Error cargando escuelas:", err);
      }
    };

    fetchEscuelas();
  }, [user]);

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
        "Formato de archivo no soportado. Por favor, seleccione un archivo de planilla SIU Guaraní (.xlsx o .csv)."
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-[#4F3A44] tracking-tight">
              Carga de Datos SIU Guaraní
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
              Fase 1
            </span>
          </div>
          <p className="text-sm text-[#6B6166] mt-0.5">
            Importe o actualice la nómina de alumnos mediante la planilla oficial exportada del SIU Guaraní.
          </p>
        </div>

        {/* Upload Form Card */}
        <div className="bg-white border border-[#E6E0DD] rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          {/* Institutional top gold bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5B115]" />

          <form onSubmit={handleUpload} className="space-y-6">
            {/* Escuela Selector */}
            <div>
              <label
                htmlFor="escuela-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-2"
              >
                Responsable Académica / Escuela UNdeC
              </label>

              <div className="relative">
                <select
                  id="escuela-select"
                  value={selectedEscuelaId || ""}
                  disabled={!isAdmin && user?.role === "RESPONSABLE_ACADEMICA"}
                  onChange={(e) => setSelectedEscuelaId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white disabled:bg-[#FAF8F7] disabled:text-[#6B6166] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-2">
                Planilla SIU Guaraní (.xlsx / .csv)
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
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
                    <div className="w-12 h-12 rounded-full bg-[#EBF3EE] text-[#3F6B4F] flex items-center justify-center mb-3">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#1F1A1C]">{file.name}</p>
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
                      className="mt-3 inline-flex items-center text-xs text-[#A33B2F] hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remover archivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#F1E9ED] text-[#826170] flex items-center justify-center mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#1F1A1C]">
                      Haga clic para seleccionar o arrastre el archivo aquí
                    </p>
                    <p className="text-xs text-[#6B6166] mt-1">
                      Formatos compatibles: Microsoft Excel (.xlsx), CSV (.csv) delimitado por comas o punto y coma
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#A33B2F] flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error en la carga</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={!file || !selectedEscuelaId || isUploading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#826170] hover:bg-[#4F3A44] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#826170] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Procesando registros de SIU Guaraní...
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

          {/* Success Banner */}
          {result && (
            <div className="mt-8 p-6 rounded-xl bg-[#EBF3EE] border border-[#3F6B4F]/30 text-[#1F1A1C] space-y-4">
              <div className="flex items-center space-x-3 text-[#3F6B4F]">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-base font-bold">
                    Carga completada exitosamente
                  </h3>
                  <p className="text-xs text-[#3F6B4F]">
                    Los datos han sido validados e indexados en la base de datos de UNdeC.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#3F6B4F]/20 text-xs">
                <div className="bg-white/80 p-3 rounded-lg">
                  <span className="text-[#6B6166] block">Escuela:</span>
                  <span className="font-bold text-[#1F1A1C] truncate block">
                    {result.escuela}
                  </span>
                </div>
                <div className="bg-white/80 p-3 rounded-lg">
                  <span className="text-[#6B6166] block">Carrera / Propuesta:</span>
                  <span className="font-bold text-[#1F1A1C] truncate block">
                    {result.propuesta}
                  </span>
                </div>
                <div className="bg-white/80 p-3 rounded-lg">
                  <span className="text-[#6B6166] block">Nuevos Alumnos:</span>
                  <span className="font-bold text-emerald-700 text-base">
                    +{result.nuevos}
                  </span>
                </div>
                <div className="bg-white/80 p-3 rounded-lg">
                  <span className="text-[#6B6166] block">Actualizados:</span>
                  <span className="font-bold text-[#826170] text-base">
                    {result.actualizados}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/alumnos"
                  className="inline-flex items-center text-xs font-bold text-[#3F6B4F] hover:underline"
                >
                  Ver padrón actualizado en Alumnos
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Informative Guidance Card */}
        <div className="bg-white border border-[#E6E0DD] rounded-xl p-5 shadow-2xs">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-[#826170] shrink-0 mt-0.5" />
            <div className="text-xs text-[#6B6166] space-y-1.5">
              <p className="font-bold text-[#1F1A1C]">
                Recomendaciones para la exportación desde SIU Guaraní:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Asegúrese de exportar el reporte oficial que incluya las cabeceras estándar:
                  <span className="font-mono text-[#1F1A1C]"> Apellido y Nombres, Nro. Documento, Legajo, Plan, Estado de Inscripción, Promedios</span>.
                </li>
                <li>
                  El archivo identifica automáticamente la Carrera (Propuesta Formativa) a partir de los metadatos o cabecera de la exportación.
                </li>
                <li>
                  Los registros existentes se actualizarán con los nuevos promedios y materias aprobadas sin duplicar los alumnos.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
