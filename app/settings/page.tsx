"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi, getFileUrl } from "@/services/api";
import { useTheme } from "@/components/ThemeProvider";
import { SettingsSkeleton } from "@/components/Skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handlePrivacyChange = async (isPublic: boolean) => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = (await usersApi.updateProfile({
        isPublicFollowers: isPublic,
        isPublicFollowing: isPublic,
      })) as User;

      setUser(updated);
      setSuccess(isPublic ? "Account is now public" : "Account is now private");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface border-b border-border-gray px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <h1 className="text-text-base text-base font-bold uppercase tracking-wider">
            Social Media
          </h1>
          <button
            onClick={() => router.back()}
            className="h-9 px-4 rounded-full bg-transparent border border-light-border text-text-base text-xs font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated"
          >
            Back
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-screen-md mx-auto px-4 py-6">
          <h2 className="text-text-base text-lg font-bold uppercase tracking-wider mb-6">
            Settings
          </h2>
          <div className="bg-surface rounded-[8px] p-6 space-y-6">
            {error && (
              <div className="text-xs text-negative-red bg-negative-red/10 border border-negative-red/30 rounded-sm px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-sp-green bg-sp-green/10 border border-sp-green/30 rounded-sm px-3 py-2">
                {success}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="text-text-base text-base font-bold uppercase tracking-wider">Theme</h2>
              <p className="text-xs text-text-secondary normal-case">Choose your preferred theme</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setTheme("bright")}
                  disabled={saving}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-bold normal-case transition-all border ${
                    theme === "bright"
                      ? "bg-sp-green text-white border-sp-green"
                      : "bg-surface-elevated border-border-gray text-text-base hover:border-light-border"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Bright
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  disabled={saving}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-bold normal-case transition-all border ${
                    theme === "dark"
                      ? "bg-sp-green text-white border-sp-green"
                      : "bg-surface-elevated border-border-gray text-text-base hover:border-light-border"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="h-px bg-border-gray" />

            <div className="flex flex-col gap-2">
              <h2 className="text-text-base text-base font-bold uppercase tracking-wider">Privacy</h2>
              <p className="text-xs text-text-secondary normal-case">Control who can see your profile and posts</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handlePrivacyChange(true)}
                  disabled={saving || user?.isPublicFollowers === true}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-bold normal-case transition-all border ${
                    user?.isPublicFollowers === true
                      ? "bg-sp-green text-white border-sp-green"
                      : "bg-surface-elevated border-border-gray text-text-base hover:border-light-border"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Public
                </button>
                <button
                  onClick={() => handlePrivacyChange(false)}
                  disabled={saving || user?.isPublicFollowers === false}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-bold normal-case transition-all border ${
                    user?.isPublicFollowers === false
                      ? "bg-sp-green text-white border-sp-green"
                      : "bg-surface-elevated border-border-gray text-text-base hover:border-light-border"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Private
                </button>
              </div>
              <p className="text-[11px] text-text-secondary normal-case">
                When private, only approved followers can see your posts and follower/following lists.
              </p>
            </div>
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
