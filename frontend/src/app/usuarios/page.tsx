"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { escuelasApi, usersApi } from "@/lib/api";
import { Escuela, User, UserRole, UserUpdatePayload } from "@/types";
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
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Alta (Crear)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("RESPONSABLE_ACADEMICA");
  const [createEscuelaId, setCreateEscuelaId] = useState<number | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal Modificar (Editar)
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("RESPONSABLE_ACADEMICA");
  const [editEscuelaId, setEditEscuelaId] = useState<number | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal Baja (Eliminar)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
            setCreateEscuelaId(escuelasData[0].id);
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

  const handleOpenCreateModal = () => {
    setCreateFullName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("RESPONSABLE_ACADEMICA");
    if (escuelas.length > 0) {
      setCreateEscuelaId(escuelas[0].id);
    }
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createFullName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("Todos los campos marcados son obligatorios.");
      return;
    }

    if (createRole === "RESPONSABLE_ACADEMICA" && !createEscuelaId) {
      setCreateError("Debe seleccionar una Escuela para el rol Responsable Académica.");
      return;
    }

    setCreateSubmitting(true);
    try {
      await usersApi.createUser({
        full_name: createFullName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        escuela_id: createRole === "RESPONSABLE_ACADEMICA" ? createEscuelaId : null,
      });

      setIsCreateModalOpen(false);
      setSuccessMsg(`Usuario ${createFullName} creado con éxito.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchUsersAndEscuelas();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCreateError(err.message);
      } else {
        setCreateError("Error al registrar el usuario.");
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEditModal = (u: User) => {
    setUserToEdit(u);
    setEditFullName(u.full_name);
    setEditEmail(u.email);
    setEditPassword("");
    setEditRole(u.role);
    setEditEscuelaId(u.escuela_id || (escuelas.length > 0 ? escuelas[0].id : null));
    setEditIsActive(u.is_active);
    setEditError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setEditError(null);

    if (!editFullName.trim() || !editEmail.trim()) {
      setEditError("El nombre completo y correo electrónico son obligatorios.");
      return;
    }

    if (editRole === "RESPONSABLE_ACADEMICA" && !editEscuelaId) {
      setEditError("Debe seleccionar una Escuela para el rol Responsable Académica.");
      return;
    }

    setEditSubmitting(true);
    try {
      const payload: UserUpdatePayload = {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        escuela_id: editRole === "RESPONSABLE_ACADEMICA" ? editEscuelaId : null,
        is_active: editIsActive,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await usersApi.updateUser(userToEdit.id, payload);

      setUserToEdit(null);
      setSuccessMsg(`Usuario ${editFullName} actualizado con éxito.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchUsersAndEscuelas();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Error al actualizar el usuario.");
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setDeleteSubmitting(true);
    try {
      await usersApi.deleteUser(userToDelete.id);
      setSuccessMsg(`Usuario ${userToDelete.email} dado de baja exitosamente.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      setUserToDelete(null);
      await fetchUsersAndEscuelas();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al dar de baja al usuario.");
      }
    } finally {
      setDeleteSubmitting(false);
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
              Administración de cuentas con acceso al panel, altas, modificaciones y bajas de usuarios.
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
              onClick={handleOpenCreateModal}
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
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0DD] bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#6B6166]">
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
                    <td colSpan={7} className="px-6 py-12 text-center text-[#6B6166]">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-[#FAF8F7] transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-[#F1E9ED] text-[#826170] flex items-center justify-center font-bold text-xs">
                              {u.full_name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-[#1F1A1C]">
                                {u.full_name}
                              </span>
                              {isSelf && (
                                <span className="ml-2 text-[10px] text-[#826170] font-semibold bg-[#F1E9ED] px-1.5 py-0.5 rounded-sm">
                                  Tú
                                </span>
                              )}
                            </div>
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F7] text-[#4F3A44] border border-[#E6E0DD]">
                              <Building2 className="w-3 h-3 mr-1 text-[#826170]" />
                              Responsable
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
                          {u.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3EE] text-[#3F6B4F]">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-[#6B6166]">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            title="Modificar usuario"
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#826170] hover:text-[#4F3A44] hover:bg-[#F1E9ED] rounded-lg transition-colors border border-[#E6E0DD]"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Modificar
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setUserToDelete(u)}
                            title={
                              isSelf
                                ? "No puede eliminar su propia cuenta"
                                : "Dar de baja usuario"
                            }
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border ${
                              isSelf
                                ? "opacity-40 cursor-not-allowed text-[#6B6166] border-[#E6E0DD]"
                                : "text-[#A33B2F] hover:bg-red-50 border-red-200 cursor-pointer"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Baja
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Crear Nuevo Usuario */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setIsCreateModalOpen(false)}
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

              {createError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#A33B2F] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
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
                      value={createFullName}
                      onChange={(e) => setCreateFullName(e.target.value)}
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
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
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
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
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
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                  >
                    <option value="RESPONSABLE_ACADEMICA">
                      RESPONSABLE_ACADEMICA (Acceso a su Escuela)
                    </option>
                    <option value="ADMIN">ADMIN (Acceso Total Central)</option>
                  </select>
                </div>

                {createRole === "RESPONSABLE_ACADEMICA" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                      Escuela Asignada
                    </label>
                    <select
                      value={createEscuelaId || ""}
                      onChange={(e) => setCreateEscuelaId(Number(e.target.value))}
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
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-[#6B6166] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#826170] hover:bg-[#4F3A44] rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center"
                  >
                    {createSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    ) : null}
                    Guardar Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Modificar (Editar) Usuario */}
        {userToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => !editSubmitting && setUserToEdit(null)}
                className="absolute top-4 right-4 p-1.5 text-[#6B6166] hover:text-[#4F3A44] rounded-lg hover:bg-[#F1E9ED]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF3DD] text-[#A07A0B] flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#4F3A44]">
                    Modificar Usuario
                  </h3>
                  <p className="text-xs text-[#6B6166]">
                    Actualice los datos o estado de la cuenta
                  </p>
                </div>
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#A33B2F] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-4">
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
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6166]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Dejar en blanco para mantener la actual"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] placeholder-[#A98B99] focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                    Rol en el Sistema
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-[#E6E0DD] rounded-lg text-[#1F1A1C] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#826170]"
                  >
                    <option value="RESPONSABLE_ACADEMICA">
                      RESPONSABLE_ACADEMICA (Acceso a su Escuela)
                    </option>
                    <option value="ADMIN">ADMIN (Acceso Total Central)</option>
                  </select>
                </div>

                {editRole === "RESPONSABLE_ACADEMICA" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4F3A44] mb-1">
                      Escuela Asignada
                    </label>
                    <select
                      value={editEscuelaId || ""}
                      onChange={(e) => setEditEscuelaId(Number(e.target.value))}
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

                <div className="pt-1">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="w-4 h-4 text-[#826170] border-[#E6E0DD] rounded-sm focus:ring-[#826170]"
                    />
                    <span className="text-xs font-bold text-[#4F3A44]">
                      Usuario Activo (Permite iniciar sesión en el panel)
                    </span>
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    disabled={editSubmitting}
                    onClick={() => setUserToEdit(null)}
                    className="px-3 py-2 text-xs font-semibold text-[#6B6166] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#826170] hover:bg-[#4F3A44] rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center"
                  >
                    {editSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    ) : null}
                    Actualizar Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirmación de Baja (Eliminar) Usuario */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-[#E6E0DD] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                disabled={deleteSubmitting}
                onClick={() => setUserToDelete(null)}
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
                    Confirmar Baja de Usuario
                  </h3>
                  <p className="text-xs text-[#6B6166] mt-0.5">
                    Esta acción revoca todos los accesos del usuario.
                  </p>
                </div>
              </div>

              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-xs text-[#A33B2F]">
                <p>
                  ¿Está seguro de dar de baja al usuario <strong>{userToDelete.email}</strong> ({userToDelete.full_name})? Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B6166] hover:bg-[#FAF8F7] rounded-lg transition-colors border border-[#E6E0DD]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#A33B2F] hover:bg-[#862D23] rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center"
                >
                  {deleteSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                      Dando de baja...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Sí, Dar de Baja
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
