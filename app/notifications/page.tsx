"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, notificationsApi, Notification, usersApi, followApi, getFileUrl } from "@/services/api";
import Header from "@/components/Header";

type Filter = 'all' | 'follow' | 'comments';

function NotificationsContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const me = await usersApi.getMe();
        setUser(me as User);
        await fetchNotifications();
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getAll(filter);
      setNotifications((data as Notification[]) || []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      setMarking(notification.id);
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch {
        // ignore
      } finally {
        setMarking(null);
      }
    }

    if (notification.postId) {
      router.push(`/post-detail?postId=${notification.postId}`);
    } else if (notification.type === 'FOLLOW_ACCEPTED' || notification.type === 'FOLLOW_REQUEST') {
      router.push(`/profile?userId=${notification.actorId}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleAccept = async (e: React.MouseEvent, actorId: string) => {
    e.stopPropagation();
    try {
      await followApi.acceptRequest(actorId);
      await fetchNotifications();
    } catch {
      await fetchNotifications();
    }
  };

  const handleReject = async (e: React.MouseEvent, actorId: string) => {
    e.stopPropagation();
    try {
      await followApi.rejectRequest(actorId);
      await fetchNotifications();
    } catch {
      await fetchNotifications();
    }
  };

  const getNotificationText = (n: Notification) => {
    switch (n.type) {
      case 'FOLLOW_REQUEST':
        return `${n.actor.displayName || n.actor.username} đã gửi follow request cho bạn`;
      case 'FOLLOW_ACCEPTED':
        return `${n.actor.displayName || n.actor.username} đã chấp nhận follow request của bạn`;
      case 'COMMENT_REPLY':
        return `${n.actor.displayName || n.actor.username} đã reply comment của bạn`;
      default:
        return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'FOLLOW_REQUEST':
      case 'FOLLOW_ACCEPTED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'COMMENT_REPLY':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
      default:
        return null;
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
      <Header user={user} />

      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-text-base text-xl font-bold uppercase tracking-wider">Notifications</h1>
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-sp-green hover:text-sp-green/80 normal-case"
            >
              Mark all as read
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {(['all', 'follow', 'comments'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-bold normal-case transition-all ${
                  filter === f
                    ? 'bg-sp-green text-white'
                    : 'bg-surface-elevated border border-border-gray text-text-base hover:border-light-border'
                }`}
              >
                {f === 'all' ? 'All' : f === 'follow' ? 'Follow' : 'Comments'}
              </button>
            ))}
          </div>

          <div className="bg-surface rounded-[8px] overflow-hidden">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-text-secondary text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-4 hover:bg-surface-elevated transition-colors cursor-pointer ${
                    !n.isRead ? 'bg-surface-elevated/50' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                    {n.actor.avatar ? (
                      <img
                        src={getFileUrl(n.actor.avatar) || ""}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-5 h-5 text-text-secondary m-auto mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-base normal-case">
                      {getNotificationText(n)}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {new Date(n.createdAt).toLocaleDateString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                    {n.type === 'FOLLOW_REQUEST' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => handleAccept(e, n.actorId)}
                          className="px-3 py-1.5 rounded-full bg-sp-green text-white text-xs font-bold normal-case hover:bg-sp-green/90 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => handleReject(e, n.actorId)}
                          className="px-3 py-1.5 rounded-full bg-surface-elevated border border-border-gray text-text-base text-xs font-bold normal-case hover:border-light-border transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-sp-green rounded-full flex-shrink-0 mt-2" />
                  )}
                  {marking === n.id && (
                    <div className="text-xs text-text-secondary">...</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    }>
      <NotificationsContent />
    </Suspense>
  );
}
