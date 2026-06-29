"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Conversation, getFileUrl, usersApi, chatApi } from "@/services/api";
import { socket } from "@/services/socket";
import CreatePostModal from "./CreatePostModal";
import PreferencesModal from "./PreferencesModal";
import { useTheme } from "./ThemeProvider";

interface HeaderProps {
  user: User | null;
  onPostCreated?: () => void;
  totalUnreadChats?: number;
}

export default function Header({ user, onPostCreated, totalUnreadChats: propTotalUnread }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Load initial unread count from API
  useEffect(() => {
    if (!user) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const fetchUnread = async () => {
      try {
        const convs = await chatApi.getConversations();
        const total = (convs as any[]).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(total);
      } catch {
        // ignore
      }
    };
    fetchUnread();
  }, [user]);

  // Listen for new messages via socket (works on ALL pages)
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (data: any) => {
      // Only increment if message is from someone else
      if (data.senderId !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleMessagesRead = (data: { conversationId: string; userId: string }) => {
      // The current user read messages in another tab/device - need to refetch
      // We'll just decrement optimistically, but better to refetch
      if (data.userId === user.id) {
        // Refetch to get accurate count
        chatApi.getConversations().then(convs => {
          const total = (convs as any[]).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setUnreadCount(total);
        }).catch(() => {});
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [user]);

  // Also sync from prop if provided (chat page can pass 0 to clear on entry)
  useEffect(() => {
    if (propTotalUnread !== undefined) {
      setUnreadCount(propTotalUnread);
    }
  }, [propTotalUnread]);

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
          <div className="flex items-center gap-1 sm:gap-2">
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
            <PreferencesModal open={showPreferencesModal} onClose={() => setShowPreferencesModal(false)} />
          </div>

          <div className="relative">
            <button
              onClick={() => router.push("/chat")}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors"
              title="Messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-sp-green rounded-full border-2 border-surface" />
            )}
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
              <div className="absolute right-0 mt-2 w-44 bg-surface-elevated border border-border-gray rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    // Use full navigation to bust Next.js RSC cache
                    window.location.href = "/profile";
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-text-base normal-case hover:bg-surface transition-colors"
                >
                  Profile
                </button>
                <div className="h-px bg-border-gray" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowPreferencesModal(true);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-text-base normal-case hover:bg-surface transition-colors flex items-center justify-between"
                >
                  <span>Preferences</span>
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
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