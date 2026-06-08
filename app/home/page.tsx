"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi, getFileUrl } from "@/services/api";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface border-b border-border-gray px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <h1 className="text-text-base text-base font-bold uppercase tracking-wider">
            Social Media
          </h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-elevated border border-border-gray overflow-hidden transition-all hover:border-light-border active:scale-95"
              title="Account"
            >
              {user?.avatar ? (
                <img
                  src={getFileUrl(user.avatar)!}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-5 h-5 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-surface-elevated border border-border-gray rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-text-base normal-case hover:bg-surface transition-colors"
                >
                  Profile
                </button>
                <div className="h-px bg-border-gray" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-negative-red normal-case hover:bg-surface transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="bg-surface rounded-[8px] p-6">
            <h2 className="text-text-base text-base font-bold mb-1 normal-case">
              
            </h2>
            <p className="text-sm text-text-secondary normal-case">
              
            </p>
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
          <span className="text-xs text-text-secondary/60 normal-case">
            
          </span>
        </div>
      </footer>
    </div>
  );
}
