"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AppLayout({ children, requireAdmin = false }: AppLayoutProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F7] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 border-4 border-[#D5C3CC] border-t-[#826170] rounded-full animate-spin mb-4" />
        <p className="text-[#826170] font-medium tracking-wide text-sm animate-pulse">
          Cargando Sistema UNdeC...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F7] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="bg-white border border-[#E6E0DD] rounded-xl p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 bg-red-100 text-[#A33B2F] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-[#1F1A1C] mb-2">
              Acceso Restringido
            </h2>
            <p className="text-sm text-[#6B6166] mb-6">
              Esta sección requiere permisos de Administrador Central de la UNdeC. Su rol actual es {user.role}.
            </p>
            <button
              onClick={() => router.push("/alumnos")}
              className="w-full bg-[#826170] hover:bg-[#4F3A44] text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Volver a Alumnos
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F7] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-[#E6E0DD] bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B6166]">
          <p>© 2026 Universidad Nacional de Chilecito - Sistema de Información Universitaria SIU Guaraní</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
              Servidor Conectado
            </span>
            <span>Versión 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
