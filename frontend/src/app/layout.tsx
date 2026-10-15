import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "UNdeC - Dashboard de Alumnos SIU Guaraní",
  description:
    "Plataforma institucional de visualización y carga de datos académicos de la Universidad Nacional de Chilecito.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF8F7] text-[#1F1A1C]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
