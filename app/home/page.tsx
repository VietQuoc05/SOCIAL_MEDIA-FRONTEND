"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi } from "@/services/api";
import Header from "@/components/Header";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const data = (await usersApi.getMe()) as User;
        setUser(data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="bg-surface rounded-[8px] p-6">
            {user && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-surface border-t border-border-gray">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-xs text-text-secondary normal-case">
            © {new Date().getFullYear()} Social Media
          </span>
        </div>
      </footer>
    </div>
  );
}
