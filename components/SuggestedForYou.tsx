"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuggestedUser, followApi, getFileUrl } from "@/services/api";
import { SkeletonBase } from "./Skeleton";

export default function SuggestedForYou() {
  const router = useRouter();
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await followApi.getSuggestedUsers(5);
        setSuggested(data);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFollow = async (userId: string) => {
    // Optimistic update
    setFollowingIds(prev => new Set(prev).add(userId));
    try {
      await followApi.follow(userId);
      // Remove from suggestions after follow
      setSuggested(prev => prev.filter(u => u.id !== userId));
    } catch {
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-text-secondary normal-case">
            Suggested for you
          </span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <SkeletonBase className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated flex-shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <SkeletonBase className="h-3 w-28" />
                  <SkeletonBase className="h-2.5 w-20" />
                </div>
              </div>
              <SkeletonBase className="ml-2 h-7 w-14 rounded-[4px] flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggested.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text-secondary normal-case">
          Suggested for you
        </span>
      </div>

      <div className="space-y-3">
        {suggested.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
              onClick={() => router.push(`/profile?userId=${user.id}`)}
            >
              <div className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={getFileUrl(user.avatar) || ""}
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
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-text-base font-bold normal-case truncate">
                  {user.displayName || user.username}
                </span>
                <span className="text-xs text-text-secondary normal-case truncate">
                  {user.mutualFriendCount > 0
                    ? `Followed by ${user.mutualFriendCount} ${user.mutualFriendCount === 1 ? "person" : "people"} you follow`
                    : `@${user.username}`}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollow(user.id);
              }}
              disabled={followingIds.has(user.id)}
              className="ml-2 px-3 py-1 text-xs font-bold text-sp-green border border-sp-green rounded-[4px] hover:bg-sp-green hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {followingIds.has(user.id) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}