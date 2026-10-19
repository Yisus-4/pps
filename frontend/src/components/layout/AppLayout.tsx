"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AppLayout({ children, requireAdmin = false }: AppLayoutProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="min-h-screen bg-[#FAF8F7] flex flex-col lg:flex-row">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          {/* Mobile Top Bar */}
          <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E6E0DD] shadow-xs">
            <div className="h-1 w-full bg-linear-to-r from-[#826170] via-[#E5B115] to-[#826170]" />
            <div className="flex items-center justify-between px-4 h-14">
              <Link href="/alumnos" className="flex items-center space-x-2 group">
                <span className="font-black text-xl text-[#4F3A44] group-hover:text-[#826170] transition-colors">
                  UNdeC
                </span>
                <span className="text-[11px] text-[#6B6166] hidden sm:inline">
                  Universidad Nacional de Chilecito
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg text-[#4F3A44] hover:bg-[#F1E9ED] focus:outline-hidden cursor-pointer"
                aria-label="Abrir menú"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
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
                className="w-full bg-[#826170] hover:bg-[#4F3A44] text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Volver a Alumnos
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F7] flex flex-col lg:flex-row">
      {/* Sidebar (Desktop fixed + Mobile slide-over drawer) */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E6E0DD] shadow-xs">
          <div className="h-1 w-full bg-linear-to-r from-[#826170] via-[#E5B115] to-[#826170]" />
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/alumnos" className="flex items-center space-x-2 group">
              <span className="font-black text-xl text-[#4F3A44] group-hover:text-[#826170] transition-colors">
                UNdeC
              </span>
              <span className="text-[11px] text-[#6B6166] hidden sm:inline">
                Universidad Nacional de Chilecito
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-[#4F3A44] hover:bg-[#F1E9ED] focus:outline-hidden cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
