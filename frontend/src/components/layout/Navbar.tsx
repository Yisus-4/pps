"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  GraduationCap,
  UploadCloud,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E6E0DD] shadow-xs">
      {/* Institutional Top Gold Accent Line */}
      <div className="h-1 w-full bg-linear-to-r from-[#826170] via-[#E5B115] to-[#826170]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/alumnos" className="flex items-center space-x-2 group">
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-[#4F3A44] group-hover:text-[#826170] transition-colors">
                  UNdeC
                </span>
                <p className="text-[11px] text-[#6B6166] leading-none hidden sm:block">
                  Universidad Nacional de Chilecito
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex ml-8 space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`inline-flex items-center px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                      link.active
                        ? "bg-[#826170] text-white shadow-xs"
                        : "text-[#4F3A44] hover:bg-[#F1E9ED] hover:text-[#826170]"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Badge & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-semibold text-[#1F1A1C]">
                  {user.full_name}
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
                    <Shield className="w-3 h-3 mr-1 text-[#A07A0B]" />
                    ADMIN
                  </span>
                )}
              </div>

              {user.escuela_nombre ? (
                <span className="text-xs text-[#6B6166] flex items-center max-w-[220px] truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5B115] mr-1.5 shrink-0" />
                  {user.escuela_nombre}
                </span>
              ) : (
                <span className="text-xs text-[#6B6166]">Todas las Escuelas</span>
              )}
            </div>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 text-[#6B6166] hover:text-[#A33B2F] hover:bg-[#F1E9ED] rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-[#4F3A44] hover:bg-[#F1E9ED]"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E6E0DD] bg-white px-4 pt-3 pb-4 space-y-3">
          <div className="pb-3 border-b border-[#E6E0DD]">
            <p className="text-sm font-semibold text-[#1F1A1C]">{user.full_name}</p>
            <p className="text-xs text-[#6B6166]">{user.email}</p>
            <div className="mt-1 flex items-center space-x-2">
              {isAdmin && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
                  ADMIN
                </span>
              )}
              {user.escuela_nombre && (
                <span className="text-xs text-[#6B6166]">
                  {user.escuela_nombre}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    link.active
                      ? "bg-[#826170] text-white"
                      : "text-[#4F3A44] hover:bg-[#F1E9ED]"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center px-3 py-2 text-base font-medium text-[#A33B2F] hover:bg-red-50 rounded-md"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
