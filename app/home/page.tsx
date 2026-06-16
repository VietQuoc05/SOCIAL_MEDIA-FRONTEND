"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Post, getFileUrl, postsApi, reactionsApi, usersApi } from "@/services/api";
import Header from "@/components/Header";
import { socket } from "@/services/socket";

interface FeedResponse {
  data: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const [imageErrorPostId, setImageErrorPostId] = useState<string | null>(null);
  const [imageIndexMap, setImageIndexMap] = useState<Record<string, number>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadFeed = useCallback(async (cursor?: string) => {
    try {
      const res = (await postsApi.getFeed(cursor, 10)) as FeedResponse;
      setPosts(prev => cursor ? [...prev, ...res.data] : res.data);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      if (!cursor) setPosts([]);
    }
  }, []);

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
        await loadFeed();
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, loadFeed]);

  useEffect(() => {
    const handleReactionUpdate = (data: { postId: string; action: string }) => {
      setPosts(prev => prev.map(p => {
        if (p.id === data.postId) {
          const wasLiked = p.isLiked;
          return {
            ...p,
            isLiked: data.action === 'created' ? true : data.action === 'removed' ? false : wasLiked,
            totalReactions: data.action === 'created' 
              ? (p.totalReactions || 0) + 1 
              : data.action === 'removed' 
                ? Math.max((p.totalReactions || 1) - 1, 0) 
                : p.totalReactions,
          };
        }
        return p;
      }));
    };

    const handlePostCreated = (data: Post) => {
      setPosts(prev => [data, ...prev]);
    };

    const handlePostDeleted = (data: { postId: string }) => {
      setPosts(prev => prev.filter(p => p.id !== data.postId));
    };

    socket.on('reaction_update', handleReactionUpdate);
    socket.on('post_created', handlePostCreated);
    socket.on('post_deleted', handlePostDeleted);

    return () => {
      socket.off('reaction_update', handleReactionUpdate);
      socket.off('post_created', handlePostCreated);
      socket.off('post_deleted', handlePostDeleted);
    };
  }, []);

  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && hasMore && nextCursor) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, nextCursor]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await loadFeed(nextCursor);
    setLoadingMore(false);
  };

  const handleReact = async (postId: string) => {
    if (reactingPostId) return;
    setReactingPostId(postId);

    const prevPosts = posts;
    setPosts(posts => posts.map(p => {
      if (p.id !== postId) return p;
      const wasLiked = p.isLiked;
      return {
        ...p,
        isLiked: !wasLiked,
        totalReactions: wasLiked ? Math.max((p.totalReactions || 1) - 1, 0) : (p.totalReactions || 0) + 1,
      };
    }));

    try {
      await reactionsApi.togglePost(postId);
    } catch {
      setPosts(prevPosts);
    } finally {
      setReactingPostId(null);
    }
  };

  const handleImageError = (postId: string) => {
    setImageErrorPostId(postId);
  };

  const handleImageNav = (postId: string, direction: 'prev' | 'next', total: number) => {
    setImageIndexMap(prev => {
      const current = prev[postId] || 0;
      let next = direction === 'next' ? current + 1 : current - 1;
      if (next < 0) next = total - 1;
      if (next >= total) next = 0;
      return { ...prev, [postId]: next };
    });
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
      <Header user={user} onPostCreated={() => loadFeed()} />

      <main className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {posts.length === 0 ? (
            <div className="bg-surface rounded-[8px] p-8 text-center">
              <p className="text-text-secondary text-sm">No posts in your feed yet. Follow some users to see their posts!</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="bg-surface rounded-[8px] overflow-hidden cursor-pointer" onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                router.push(`/post-detail?postId=${post.id}`);
              }}>
                <div className="flex items-center gap-3 p-3">
                  <div
                    className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      post.author && router.push(`/profile?userId=${post.author.id}`);
                    }}
                  >
                    {post.author?.avatar ? (
                      <img src={getFileUrl(post.author.avatar) || ""} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-text-secondary m-auto mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col" onClick={(e) => {
                    e.stopPropagation();
                    post.author && router.push(`/profile?userId=${post.author.id}`);
                  }}>
                    <span className="text-sm text-text-base font-bold normal-case">{post.author?.displayName || post.author?.username || "Unknown"}</span>
                    <span className="text-xs text-text-secondary normal-case">@{post.author?.username || "unknown"}</span>
                  </div>
                </div>

                {post.images && post.images.length > 0 && imageErrorPostId !== post.id ? (
                  <div className="relative bg-black">
                    <img
                      src={getFileUrl(post.images[imageIndexMap[post.id] || 0]) || ""}
                      alt="post"
                      className="w-full max-h-[600px] object-contain"
                      onError={() => handleImageError(post.id)}
                    />
                    {post.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageNav(post.id, 'prev', post.images.length);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageNav(post.id, 'next', post.images.length);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  post.images && post.images.length === 0 && (
                    <div className="w-full aspect-square bg-gradient-to-br from-surface-elevated to-background" />
                  )
                )}

                <div className="p-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReact(post.id);
                      }}
                      disabled={reactingPostId === post.id}
                      className={`flex items-center gap-1 transition-colors ${post.isLiked ? 'text-like-pink' : 'text-text-secondary'} hover:text-like-pink disabled:opacity-50`}
                    >
                      <svg className="w-6 h-6" fill={post.isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="text-xs">{post.totalReactions || 0}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/post-detail?postId=${post.id}`);
                      }}
                      className="flex items-center gap-1 text-text-secondary hover:text-text-base transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-4.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  </div>

                  {post.caption && (
                    <div className="mt-2 text-sm text-text-base normal-case">
                      <span className="font-bold">{post.author?.displayName || post.author?.username}</span>{" "}
                      {post.caption}
                    </div>
                  )}

                  <div className="mt-1 text-xs text-text-secondary">
                    {new Date(post.createdAt || Date.now()).toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </article>
            ))
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {loadingMore ? (
                <p className="text-text-secondary text-sm">Loading...</p>
              ) : (
                <p className="text-text-secondary text-xs">Scroll for more</p>
              )}
            </div>
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
