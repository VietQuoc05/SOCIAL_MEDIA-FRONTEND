"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi, getFileUrl } from "@/services/api";
import { useTheme } from "@/components/ThemeProvider";

export default function EditProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", displayName: "", bio: "", facebook: "", instagram: "", isPublicFollowers: true });
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
        setForm({
          username: data.username || "",
          displayName: data.displayName || "",
          bio: data.bio || "",
          facebook: data.facebook || "",
          instagram: data.instagram || "",
          isPublicFollowers: data.isPublicFollowers ?? true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const updated = (await usersApi.updateProfile({
        username: form.username,
        displayName: form.displayName,
        bio: form.bio,
        facebook: form.facebook,
        instagram: form.instagram,
        isPublicFollowers: form.isPublicFollowers,
      })) as User;

      setUser(updated);
      setSuccess("Profile updated successfully");
      setTimeout(() => router.replace("/profile"), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      if (message.includes("DisplayName already taken")) {
        setError("Display name already taken");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
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
          <img
            src={theme === "bright" ? "/favicon_bright.ico" : "/favicon_dark.ico?v=2"}
            alt="Social Media"
            className="h-8 w-auto"
          />
          <button
            onClick={() => router.replace("/profile")}
            className="h-9 px-4 rounded-full bg-transparent border border-light-border text-text-base text-xs font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated"
          >
            Cancel
          </button>
      </div>
      </header>

      <main className="flex-1">
        <div className="max-w-screen-md mx-auto px-4 py-6">
          <h2 className="text-text-base text-lg font-bold uppercase tracking-wider mb-6">
            Edit Profile
          </h2>
          <div className="bg-surface rounded-[8px] p-6">
            {error && (
              <div className="text-xs text-negative-red bg-negative-red/10 border border-negative-red/30 rounded-sm px-3 py-2 mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-sp-green bg-sp-green/10 border border-sp-green/30 rounded-sm px-3 py-2 mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
                  Display Name
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => {
                    const val = e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9.]/g, "")
                      .replace(/\.+/g, ".")
                      .replace(/^\./, "")
                      .replace(/\.$/, "");
                    setForm({ ...form, displayName: val });
                  }}
                  className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
                />
                <div className="flex justify-between">
                  <span className="text-[11px] text-text-secondary/70 normal-case">
                    Lowercase, numbers, and dots only.
                  </span>
                  <span
                    className={`text-[11px] normal-case ${
                      form.displayName.length >= 6 ? "text-sp-green" : "text-text-secondary/70"
                    }`}
                  >
                    {form.displayName.length}/30
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
                  Facebook Link
                </label>
                <input
                  type="url"
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="https://facebook.com/yourusername"
                  className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
                  Instagram Link
                </label>
                <input
                  type="url"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="https://instagram.com/yourusername"
                  className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
                  Privacy
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isPublicFollowers: true })}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-bold normal-case transition-all ${
                      form.isPublicFollowers
                        ? 'bg-sp-green text-white'
                        : 'bg-surface-elevated border border-border-gray text-text-base hover:border-light-border'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isPublicFollowers: false })}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-bold normal-case transition-all ${
                      !form.isPublicFollowers
                        ? 'bg-sp-green text-white'
                        : 'bg-surface-elevated border border-border-gray text-text-base hover:border-light-border'
                    }`}
                  >
                    Private
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary normal-case">
                  When private, only followers can see your posts and followers/following lists.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  className="rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 py-2 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-6 rounded-full bg-sp-green text-black text-sm font-bold uppercase tracking-wider normal-case transition-all hover:enabled:scale-[1.02] hover:enabled:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:enabled:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-surface border-t border-border-gray">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-xs text-text-secondary normal-case">
            © {new Date().getFullYear()} Social Media
          </span>
          <span className="text-xs text-text-secondary/60 normal-case">
            Designed with Spotify-style dark theme
          </span>
        </div>
      </footer>
    </div>
  );
}
