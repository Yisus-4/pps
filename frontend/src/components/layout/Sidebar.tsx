"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap,
  UploadCloud,
  Users,
  LogOut,
  Shield,
  X,
} from "lucide-react";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface SidebarContentProps {
  onCloseMobile?: () => void;
}

function SidebarContent({ onCloseMobile }: SidebarContentProps) {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navLinks = [
    {
      name: "Alumnos",
      href: "/alumnos",
      icon: GraduationCap,
      active: pathname === "/" || pathname.startsWith("/alumnos"),
    },
    {
      name: "Cargar Datos",
      href: "/cargar",
      icon: UploadCloud,
      active: pathname.startsWith("/cargar"),
    },
  ];

  if (isAdmin) {
    navLinks.push({
      name: "Usuarios",
      href: "/usuarios",
      icon: Users,
      active: pathname.startsWith("/usuarios"),
    });
  }

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Gold Accent Line */}
      <div className="h-1.5 w-full bg-linear-to-r from-[#826170] via-[#E5B115] to-[#826170] shrink-0" />

      {/* Brand Header */}
      <div className="p-5 border-b border-[#E6E0DD] flex items-center justify-between shrink-0">
        <Link
          href="/alumnos"
          className="flex flex-col group"
          onClick={onCloseMobile}
        >
          <span className="font-black text-2xl tracking-tight text-[#4F3A44] group-hover:text-[#826170] transition-colors leading-none">
            UNdeC
          </span>
          <span className="text-[11px] font-medium text-[#6B6166] mt-1 tracking-tight">
            Universidad Nacional de Chilecito
          </span>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#6B6166] hover:text-[#4F3A44] hover:bg-[#F1E9ED] transition-colors cursor-pointer"
            aria-label="Cerrar navegación"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#A98B99]">
          Menú de Navegación
        </div>
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onCloseMobile}
              className={`flex items-center px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all group ${
                link.active
                  ? "bg-[#826170] text-white shadow-xs border-l-4 border-[#E5B115]"
                  : "text-[#4F3A44] hover:bg-[#F1E9ED] hover:text-[#826170]"
              }`}
            >
              <Icon
                className={`w-5 h-5 mr-3 shrink-0 transition-colors ${
                  link.active
                    ? "text-[#E5B115]"
                    : "text-[#826170] group-hover:text-[#4F3A44]"
                }`}
              />
              <span className="tracking-tight">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area */}
      <div className="p-4 border-t border-[#E6E0DD] bg-[#FAF8F7]/80 shrink-0 space-y-3.5">
        {/* User Profile Info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-sm font-bold text-[#1F1A1C] truncate"
              title={user.full_name}
            >
              {user.full_name}
            </span>
            {isAdmin ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30 shrink-0">
                <Shield className="w-3 h-3 mr-1 text-[#A07A0B]" />
                ADMIN
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1E9ED] text-[#826170] border border-[#D5C3CC] shrink-0">
                RESP. ACADÉMICA
              </span>
            )}
          </div>
          <p
            className="text-xs text-[#6B6166] truncate flex items-center"
            title={user.escuela_nombre || "Todas las Escuelas"}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B115] mr-1.5 shrink-0" />
            <span className="truncate">{user.escuela_nombre || "Todas las Escuelas"}</span>
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            onCloseMobile?.();
            logout();
          }}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#A33B2F] bg-[#FAECEB] hover:bg-[#F5D7D5] border border-[#A33B2F]/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>

        {/* Server Status Indicator */}
        <div className="pt-2 border-t border-[#E6E0DD] flex items-center justify-between text-[11px] text-[#6B6166]">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Servidor Conectado
          </span>
          <span className="font-mono text-[#826170] font-semibold">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30 bg-white border-r border-[#E6E0DD] shadow-xs">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <SidebarContent onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
