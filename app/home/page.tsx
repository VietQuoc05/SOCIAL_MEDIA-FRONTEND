"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // ✅ check token trong localStorage
    const token = localStorage.getItem("token");

    if (token) {
      // ✅ đã login → vào feed
      router.replace("/home");
    } else {
      // ❌ chưa login → vào login
      router.replace("/login");
    }
  }, [router]);

  // ✅ loading UI (tránh flash)
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">Loading...</p>
    </div>
  );
}
``