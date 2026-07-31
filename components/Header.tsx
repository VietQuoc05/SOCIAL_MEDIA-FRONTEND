"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Conversation, getFileUrl, chatApi, notificationsApi, Notification } from "@/services/api";
import { socket } from "@/services/socket";
import CreatePostModal from "./CreatePostModal";
import LogoutConfirmModal from "./LogoutConfirmModal";
import { useTheme } from "./ThemeProvider";

interface HeaderProps {
  user: User | null;
  onPostCreated?: (totalPosts?: number) => void;
  totalUnreadChats?: number;
  unreadNotifications?: number;
}

export default function Header({ user, onPostCreated, totalUnreadChats: propTotalUnread, unreadNotifications: propUnreadNotifications }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Load initial unread notifications from API
  useEffect(() => {
    if (!user) return;
    if (propUnreadNotifications !== undefined) {
      setUnreadNotifications(propUnreadNotifications);
      return;
    }

    const fetchUnreadNotifications = async () => {
      try {
        const data = await notificationsApi.getUnreadCount();
        setUnreadNotifications(data.count || 0);
      } catch {
        // ignore
      }
    };

    fetchUnreadNotifications();
  }, [user, propUnreadNotifications]);

  // Listen for new notifications via socket (works on ALL pages)
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (data: any) => {
      if (data.recipientId === user.id) {
        setUnreadNotifications(prev => prev + 1);
      }
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutRequest = () => {
    setMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleRemoveAndLogout = () => {
    if (user?.id) {
      const STORAGE_KEY = "saved_accounts";
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const accounts = raw ? JSON.parse(raw) : [];
        const updated = accounts.filter((a: any) => a.id !== user.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("token");
    setShowLogoutConfirm(false);
    router.replace("/login");
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem("token");
    router.replace("/login");
  };

  const handleHomeClick = () => {
    router.push("/home");
  };

  const handlePostCreated = (totalPosts?: number) => {
    if (onPostCreated) onPostCreated(totalPosts);
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

          <div className="relative">
            <button
              onClick={() => router.push("/notifications")}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-sp-green rounded-full border-2 border-surface" />
            )}
          </div>

           <div className="relative">
             <button
               onClick={() => router.push("/explore")}
               className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors"
               title="Search"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 017.5 7.5z" />
               </svg>
             </button>
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
                    window.location.href = "/profile";
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-text-base normal-case hover:bg-surface transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                <div className="h-px bg-border-gray" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-text-base normal-case hover:bg-surface transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.066-2.573c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <div className="h-px bg-border-gray" />
                <button
                  onClick={handleLogoutRequest}
                  className="w-full text-left px-4 py-3 text-sm text-negative-red normal-case hover:bg-surface transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-negative-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <LogoutConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onRemoveAndLogout={handleRemoveAndLogout}
        onLogout={handleLogout}
      />
    </header>
  );
}