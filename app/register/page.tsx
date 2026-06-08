"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/app/auth/components/AuthForm";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/home");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <AuthForm mode="register" />
    </div>
  );
}
