"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { escuelasApi, usersApi } from "@/lib/api";
import { Escuela, User, UserRole } from "@/types";
import {
  UserPlus,
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Lock,
  User as UserIcon,
  RotateCw,
} from "lucide-react";

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("RESPONSABLE_ACADEMICA");
  const [formEscuelaId, setFormEscuelaId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [usersData, escuelasData] = await Promise.all([
          usersApi.getAll(),
          escuelasApi.getAll(),
        ]);
        if (!ignore) {
          setUsers(usersData);
          setEscuelas(escuelasData);
          if (escuelasData.length > 0) {
            setFormEscuelaId(escuelasData[0].id);
          }
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Error al cargar los usuarios del sistema.");
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const fetchUsersAndEscuelas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, escuelasData] = await Promise.all([
        usersApi.getAll(),
        escuelasApi.getAll(),
      ]);
      setUsers(usersData);
      setEscuelas(escuelasData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al cargar los usuarios del sistema.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormFullName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("RESPONSABLE_ACADEMICA");
    if (escuelas.length > 0) {
      setFormEscuelaId(escuelas[0].id);
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formFullName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError("Todos los campos marcados son obligatorios.");
      return;
    }

    if (formRole === "RESPONSABLE_ACADEMICA" && !formEscuelaId) {
      setFormError("Debe seleccionar una Escuela para el rol Responsable Académica.");
      return;
    }

    setFormSubmitting(true);
    try {
      await usersApi.createUser({
        full_name: formFullName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        escuela_id: formRole === "RESPONSABLE_ACADEMICA" ? formEscuelaId : null,
      });

      setIsModalOpen(false);
      setSuccessMsg(`Usuario ${formFullName} creado con éxito.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchUsersAndEscuelas();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Error al registrar el usuario.");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <AppLayout requireAdmin={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-[#4F3A44] tracking-tight">
                Gestión de Usuarios
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
                Solo Administradores
              </span>
            </div>
            <p className="text-sm text-[#6B6166] mt-0.5">
              Administración de cuentas con acceso al panel y asignación de Responsables Académicas.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchUsersAndEscuelas}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-[#E6E0DD] rounded-lg shadow-2xs text-xs font-semibold text-[#4F3A44] bg-white hover:bg-[#FAF8F7] disabled:opacity-50 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>

            <button
              onClick={handleOpenModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-2xs text-xs font-bold text-white bg-[#826170] hover:bg-[#4F3A44] focus:outline-hidden transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#EBF3EE] border border-[#3F6B4F]/30 text-sm text-[#3F6B4F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-[#3F6B4F] font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#A33B2F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[#A33B2F] font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white border border-[#E6E0DD] rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E6E0DD] text-left text-xs">
              <thead className="bg-[#FAF8F7] text-[#4F3A44] font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Usuario / Nombre
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Correo Electrónico
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Rol
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Escuela Asignada
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Fecha de Alta
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0DD] bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#6B6166]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-8 h-8 border-3 border-[#D5C3CC] border-t-[#826170] rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-[#826170]">
                          Cargando usuarios...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#6B6166]">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAF8F7] transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#F1E9ED] text-[#826170] flex items-center justify-center font-bold text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <span className="font-bold text-[#1F1A1C]">
                            {u.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-[#6B6166]">
                        {u.email}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {u.role === "ADMIN" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3DD] text-[#A07A0B] border border-[#E5B115]/30">
                            <Shield className="w-3 h-3 mr-1" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1E9ED] text-[#826170] border border-[#D5C3CC]">
                            <Building2 className="w-3 h-3 mr-1" />
                            RESPONSABLE
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-[#1F1A1C]">
                        {u.escuela_nombre ? (
                          <span className="text-xs font-medium text-[#4F3A44]">
                            {u.escuela_nombre}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6B6166] italic">
                            Acceso Global (Todas)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#6B6166] font-mono text-[11px]">
                        {new Date(u.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3EE] text-[#3F6B4F]">
                          Activo
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Crear Nuevo Usuario */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-[#6B6166] hover:text-[#4F3A44] rounded-lg hover:bg-[#F1E9ED]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#826170] text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#4F3A44]">
                    Registrar Nuevo Usuario
                  </h3>
                  <p className="text-xs text-[#6B6166]">
                    Complete los datos para otorgar acceso al panel
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#A33B2F] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="Ej. Ing. Juan Pérez"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Correo Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="usuario@undec.edu.ar"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Contraseña Inicial
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Rol en el Sistema
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                  >
                    <option value="RESPONSABLE_ACADEMICA">
                      RESPONSABLE_ACADEMICA (Acceso a su Escuela)
                    </option>
                    <option value="ADMIN">ADMIN (Acceso Total Central)</option>
                  </select>
                </div>

                {formRole === "RESPONSABLE_ACADEMICA" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                      Escuela Asignada
                    </label>
                    <select
                      value={formEscuelaId || ""}
                      onChange={(e) => setFormEscuelaId(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    >
                      {escuelas.map((esc) => (
                        <option key={esc.id} value={esc.id}>
                          {esc.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-[#6B6166] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#826170] hover:bg-[#4F3A44] rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center"
                  >
                    {formSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    ) : null}
                    Guardar Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
