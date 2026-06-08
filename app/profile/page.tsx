"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi, getFileUrl, postsApi, Post } from "@/services/api";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        const myPosts = (await postsApi.getMyPosts()) as Post[];
        setPosts(myPosts || []);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);

    try {
      const updated = (await usersApi.uploadAvatar(file)) as User;
      setUser(updated);
      setUploadSuccess("Avatar updated");
    } catch {
      setUploadError("Failed to upload avatar");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);

    try {
      const updated = (await usersApi.uploadCover(file)) as User;
      setUser(updated);
      setUploadSuccess("Cover updated");
    } catch {
      setUploadError("Failed to upload cover");
    } finally {
      setUploading(false);
      e.target.value = "";
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
            <div
              className="relative h-28 sm:h-40 bg-surface-elevated cursor-pointer"
              onClick={() => coverInputRef.current?.click()}
              title="Click to change cover"
            >
              {user?.cover ? (
                <img
                  src={getFileUrl(user.cover) || undefined}
                  alt="cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-background" />
              )}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-bold uppercase tracking-wider opacity-0 hover:opacity-100 transition-opacity">
                  Change cover
                </span>
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />

            <div className="px-4 sm:px-6 pt-12 sm:pt-16 pb-6">
              <div className="flex items-end gap-4 sm:gap-6">
                <div
                  className="relative -mt-4 sm:-mt-6 cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Click to change avatar"
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface bg-surface-elevated overflow-hidden">
{user?.avatar ? (
                        <img
                          src={getFileUrl(user.avatar) || undefined}
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
                  <div className="absolute inset-0 rounded-full border-2 border-sp-green/80 pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

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
                    <button
                      onClick={() => router.push("/edit-profile")}
                      className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                    >
                      Edit
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-text-base normal-case">
                    {user?.bio || "No bio yet"}
                  </p>
                </div>
              </div>

              {posts.length > 0 && (
                <div className="mt-6 px-4 sm:px-6 pb-6">
                  <div className="grid grid-cols-3 gap-1">
                    {posts.map((post) => {
                      const imageUrl = getFileUrl(post.images?.[0]);
                      return (
                        <div key={post.id} className="aspect-square bg-surface-elevated overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="post"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-background" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mt-4 text-xs text-negative-red bg-negative-red/10 border border-negative-red/30 rounded-sm px-3 py-2">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="mt-4 text-xs text-sp-green bg-sp-green/10 border border-sp-green/30 rounded-sm px-3 py-2">
                  {uploadSuccess}
                </div>
              )}
              {uploading && (
                <div className="mt-4 text-xs text-text-secondary normal-case">
                  Uploading...
                </div>
              )}
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
          </span>
        </div>
      </footer>
    </div>
  );
}
