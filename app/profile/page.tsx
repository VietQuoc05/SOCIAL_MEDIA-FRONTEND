"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi, decodeToken, getFileUrl } from "@/services/api";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", displayName: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);

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
      })) as User;

      setUser(updated);
      setForm({
        username: updated.username || "",
        displayName: updated.displayName || "",
        bio: updated.bio || "",
      });
      setSuccess("Profile updated successfully");
      setEditing(false);
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
          <h1 className="text-text-base text-base font-bold uppercase tracking-wider">
            Profile
          </h1>
          <button
            onClick={() => router.replace("/home")}
            className="h-9 px-4 rounded-full bg-transparent border border-light-border text-text-base text-xs font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated"
          >
            Back
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="bg-surface rounded-[8px] overflow-hidden">
              <div className="relative h-32 sm:h-48 bg-surface-elevated">
                {user?.cover ? (
                  <img
                    src={getFileUrl(user.cover)!}
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-background" />
                )}
              </div>

              <div className="px-4 sm:px-6 pb-6">
                <div className="flex items-end gap-4 sm:gap-6 -mt-12 sm:-mt-16">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface bg-surface-elevated overflow-hidden">
                      {user?.avatar ? (
                        <img
                          src={getFileUrl(user.avatar)!}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-text-secondary"
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
                        </div>
                      )}
                    </div>
                  </div>

                <div className="flex-1 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-text-base text-lg font-bold normal-case">
                        {user?.displayName || user?.username}
                      </h2>
                      <p className="text-sm text-text-secondary normal-case">
                        @{user?.displayName || user?.username}
                      </p>
                    </div>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="h-9 px-4 rounded-full bg-surface-elevated border border-light-border text-text-base text-xs font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-text-base normal-case">
                    {user?.bio || "No bio yet"}
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-xs text-negative-red bg-negative-red/10 border border-negative-red/30 rounded-sm px-3 py-2 mt-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-xs text-sp-green bg-sp-green/10 border border-sp-green/30 rounded-sm px-3 py-2 mt-4">
                  {success}
                </div>
              )}

              {editing ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-6">
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
                      Bio
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={3}
                      className="rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 py-2 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-12 rounded-full bg-sp-green text-black text-sm font-bold uppercase tracking-wider normal-case transition-all hover:enabled:scale-[1.02] hover:enabled:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:enabled:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        if (user) {
                          setForm({
                            username: user.username || "",
                            displayName: user.displayName || "",
                            bio: user.bio || "",
                          });
                        }
                      }}
                      className="h-12 px-6 rounded-full bg-transparent border border-light-border text-text-base text-sm font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
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
