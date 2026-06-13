"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, getFileUrl, usersApi } from "@/services/api";
import CreatePostModal from "./CreatePostModal";

interface HeaderProps {
  user: User | null;
  onPostCreated?: () => void;
}

export default function Header({ user, onPostCreated }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchQuery("");
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const results = await usersApi.search(searchQuery);
        setSearchResults(results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.replace("/login");
  };

  const handleHomeClick = () => {
    router.push("/home");
  };

  const handlePostCreated = () => {
    if (onPostCreated) onPostCreated();
  };

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border-gray px-4 py-3">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-text-base text-base font-bold uppercase tracking-wider">
            Social Media
          </h1>
          <button
            onClick={handleHomeClick}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base transition-colors"
            title="Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPostModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-elevated border border-border-gray text-text-base hover:border-light-border active:scale-95 transition-all"
              title="Create post"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <CreatePostModal open={showPostModal} onClose={() => setShowPostModal(false)} onSuccess={handlePostCreated} />
          </div>

          <div className="relative" ref={searchRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && router.push(`/search?q=${encodeURIComponent(searchQuery)}`)}
              placeholder="Search..."
              className="w-28 md:w-40 lg:w-48 h-8 px-3 text-sm text-text-base normal-case bg-surface-elevated border border-border-gray rounded-full focus:outline-none focus:border-sp-green"
            />
            {(searchQuery || searchResults.length > 0) && (
              <div className="absolute left-0 mt-1 w-64 bg-surface-elevated border border-border-gray rounded-[6px] shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <p className="px-4 py-2 text-sm text-text-secondary">Searching...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        router.push(`/profile?userId=${u.id}`);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-surface transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                        {u.avatar ? (
                          <img
                            src={getFileUrl(u.avatar) || ""}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-4 h-4 text-text-secondary m-auto mt-2"
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
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-text-base font-bold normal-case">
                          {u.displayName || u.username}
                        </span>
                        <span className="text-xs text-text-secondary normal-case">
                          {u.username}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-2 text-sm text-text-secondary">No results</p>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="w-9 h-9 rounded-full bg-surface-elevated border border-border-gray overflow-hidden transition-all hover:border-light-border active:scale-95"
              title="Account"
            >
              {user?.avatar ? (
                <img
                  src={getFileUrl(user.avatar) || ""}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-5 h-5 text-text-secondary m-auto mt-2"
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
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-negative-red normal-case hover:bg-surface transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
