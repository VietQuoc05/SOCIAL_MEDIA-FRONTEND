"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Post, getFileUrl, postsApi, usersApi } from "@/services/api";
import Header from "@/components/Header";
import { ExploreSkeleton } from "@/components/Skeleton";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT = 10;

interface RecentSearchItem {
  id: string;
  displayName: string;
  username: string;
  avatar?: string;
}

interface ValidatedSearch extends RecentSearchItem {
  valid: boolean;
  currentData?: User;
}

const getRecentSearches = (): RecentSearchItem[] => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (u: User) => {
  const searches = getRecentSearches();
  const filtered = searches.filter((s) => s.id !== u.id);
  const updated = [
    { id: u.id, displayName: u.displayName, username: u.username, avatar: u.avatar },
    ...filtered,
  ];
  const trimmed = updated.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
};

function ExploreContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<ValidatedSearch[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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
    const stored = getRecentSearches();
    if (stored.length === 0) {
      setRecentSearches([]);
      return;
    }

    const validate = async () => {
      const results = await Promise.allSettled(
        stored.map(async (item) => {
          try {
            const currentUser = (await usersApi.getUser(item.id)) as User;
            const valid = currentUser.displayName === item.displayName;
            return { ...item, valid, currentData: valid ? currentUser : undefined };
          } catch {
            return { ...item, valid: false, currentData: undefined };
          }
        }),
      );

      setRecentSearches(
        results.map((r, i) =>
          r.status === "fulfilled"
            ? r.value
            : { ...stored[i], valid: false, currentData: undefined },
        ),
      );
    };

    validate();
  }, []);

  const loadTrending = useCallback(async (cursor?: string) => {
    try {
      const res = (await postsApi.getTrending(cursor, 20)) as {
        data: Post[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      setTrendingPosts((prev) => (cursor ? [...prev, ...res.data] : res.data));
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      if (!cursor) setTrendingPosts([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTrending();
  }, [user, loadTrending]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await loadTrending(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, loadTrending]);

  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore && nextCursor) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, nextCursor, loading, loadMore]);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchClick = (u: User) => {
    saveRecentSearch(u);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchDropdown(false);
    setSearchFocused(false);
    router.push(`/profile?userId=${u.id}`);
  };

  const handleRecentClick = (item: ValidatedSearch) => {
    if (!item.valid) return;
    router.push(`/profile?userId=${item.id}`);
  };

  const removeRecentSearch = (id: string) => {
    const searches = getRecentSearches();
    const filtered = searches.filter((s) => s.id !== id);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
    setRecentSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBack = () => {
    setSearchFocused(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchDropdown(false);
  };

  if (loading) {
    return <ExploreSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />

      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="relative mb-6" ref={searchRef}>
            <div className="flex items-center gap-2">
              {searchFocused && (
                <button
                  onClick={handleBack}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors flex-shrink-0"
                  title="Back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => {
                  setSearchFocused(true);
                  setShowSearchDropdown(true);
                }}
                placeholder="Search accounts..."
                className="flex-1 h-10 px-4 text-sm text-text-base normal-case bg-surface-elevated border border-border-gray rounded-full focus:outline-none focus:border-sp-green"
              />
            </div>
            {showSearchDropdown && searchQuery.trim() && (
              <div className="absolute left-0 mt-1 w-full bg-surface-elevated border border-border-gray rounded-[6px] shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <p className="px-4 py-2 text-sm text-text-secondary">Searching...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSearchClick(u)}
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
                          @{u.username}
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

          {searchFocused && searchQuery.trim().length === 0 && recentSearches.length > 0 && (
            <div className="mb-8">
              <h2 className="text-text-base text-sm font-bold normal-case mb-3">
                Recent searches
              </h2>
              <div className="space-y-1">
                {recentSearches.map((item) => {
                  const displayUser = item.valid ? item.currentData : null;
                  return item.valid ? (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 w-full p-3 bg-surface rounded-[8px] hover:bg-surface-elevated transition-colors"
                    >
                      <button
                        onClick={() => handleRecentClick(item)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                          {displayUser?.avatar ? (
                            <img
                              src={getFileUrl(displayUser.avatar) || ""}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg
                              className="w-5 h-5 text-text-secondary m-auto mt-2.5"
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
                            {displayUser?.displayName || displayUser?.username || item.displayName}
                          </span>
                          <span className="text-xs text-text-secondary normal-case">
                            @{displayUser?.username || item.username}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(item.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-text-secondary hover:text-negative-red hover:bg-surface-elevated transition-colors flex-shrink-0"
                        title="Remove from recent searches"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 w-full p-3 bg-surface rounded-[8px] text-left"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0 flex items-center justify-center">
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
                      </div>
                      <span className="text-sm text-text-base font-bold normal-case flex-1">
                        {item.displayName}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(item.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-text-secondary hover:text-negative-red hover:bg-surface-elevated transition-colors flex-shrink-0"
                        title="Remove from recent searches"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!searchFocused && (
            <>
              <div className="mb-4">
                <h2 className="text-text-base text-lg font-bold normal-case">
                  Trending
                </h2>
              </div>
              {trendingPosts.length === 0 ? (
                <div className="bg-surface rounded-[8px] p-8 text-center">
                  <p className="text-text-secondary text-sm normal-case">
                    No trending posts yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1">
                  {trendingPosts.map((post) => {
                    const imageUrl = getFileUrl(post.images?.[0]);
                    return (
                      <div
                        key={post.id}
                        className="aspect-square bg-surface-elevated overflow-hidden cursor-pointer"
                        onClick={() => router.push(`/post-detail?postId=${post.id}`)}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="post"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-background" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasMore && (
                <div ref={loadMoreRef} className="py-4">
                  {loadingMore ? (
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-surface-elevated skeleton-shimmer" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-secondary text-xs text-center">
                      Scroll for more
                    </p>
                  )}
                </div>
              )}
            </>
          )}
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

export default function ExplorePage() {
  return <ExploreContent />;
}
