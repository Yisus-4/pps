"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { user, login, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/alumnos");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor, ingrese su correo electrónico y contraseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/alumnos");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al iniciar sesión. Inténtelo nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Decorative top bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#826170] via-[#E5B115] to-[#826170]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <Image
            src="/logo-undec.png"
            alt="Logo UNdeC"
            width={96}
            height={96}
            priority
            className="w-24 h-24 object-contain"
          />
        </div>
        <p className="text-center text-xs font-semibold tracking-wider uppercase text-[#826170]">
          Universidad Nacional de Chilecito
        </p>
        <h2 className="mt-2 text-center text-lg font-medium text-[#1F1A1C]">
          Dashboard Académico
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#E6E0DD] rounded-2xl relative overflow-hidden">
          {/* Subtle top gold accent on card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5B115]" />

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-sm text-[#A33B2F]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44]"
              >
                Correo Institucional
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@undec.edu.ar"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#E6E0DD] rounded-lg text-sm text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170] focus:border-[#826170] transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44]"
              >
                Contraseña
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#E6E0DD] rounded-lg text-sm text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170] focus:border-[#826170] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B6166] hover:text-[#4F3A44]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-[#826170] hover:bg-[#4F3A44] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#826170] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Iniciando sesión..." : "Ingresar al Sistema"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B6166]">
          Secretaría Académica • Universidad Nacional de Chilecito
        </p>
      </div>
    </div>
  );
}
