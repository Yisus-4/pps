"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { authApi, getAuthToken, removeAuthToken, setAuthToken } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isEscuelaUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      const storedUser = localStorage.getItem("undec_user");

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore
          }
        }

        try {
          // Validate and fetch fresh user profile from backend
          const me = await authApi.getMe();
          setUser(me);
          localStorage.setItem("undec_user", JSON.stringify(me));
        } catch {
          // If token expired or invalid, reset
          removeAuthToken();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(email, pass);
      setToken(response.access_token);
      setUser(response.user);
      setAuthToken(response.access_token);
      localStorage.setItem("undec_user", JSON.stringify(response.user));
      setIsLoading(false);
      return response.user;
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      localStorage.setItem("undec_user", JSON.stringify(me));
    } catch {
      // ignore
    }
  };

  const isAdmin = user?.role === "ADMIN";
  const isEscuelaUser = user?.role === "RESPONSABLE_ACADEMICA";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isEscuelaUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
