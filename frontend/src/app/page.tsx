"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/alumnos");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#FAF8F7] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#D5C3CC] border-t-[#826170] rounded-full animate-spin" />
    </div>
  );
}
