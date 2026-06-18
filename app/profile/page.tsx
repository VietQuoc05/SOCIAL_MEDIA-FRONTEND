"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User } from "@/app/auth/types/user";
import { usersApi, getFileUrl, postsApi, Post, followApi, FollowRecord, chatApi } from "@/services/api";
import Header from "@/components/Header";
import { socket } from "@/services/socket";

interface FollowStats {
  followers: number;
  following: number;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [me, setMe] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [following, setFollowing] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [followStats, setFollowStats] = useState<{ followers: number; following: number } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFollowers = async () => {
    try {
      const data = (await followApi.getFollowers(userId ?? undefined)) as FollowRecord[];
      setFollowersList(data.map(r => r.follower).filter(Boolean));
    } catch {
      setFollowersList([]);
    } finally {
      setShowFollowersModal(true);
    }
  };

  const handleOpenFollowing = async () => {
    try {
      const data = (await followApi.getFollowing(userId ?? undefined)) as FollowRecord[];
      setFollowingList(data.map(r => r.following).filter(Boolean));
    } catch {
      setFollowingList([]);
    } finally {
      setShowFollowingModal(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const data = (await usersApi.getMe()) as User;
        setMe(data);
        if (userId && userId !== data.id) {
          const profileData = (await usersApi.getUser(userId)) as User;
          setUser(profileData);
          const userPosts = (await postsApi.getByUser(userId)) as Post[];
          setPosts(userPosts || []);
          setFollowStats({ followers: profileData.followersCount || 0, following: profileData.followingCount || 0 });
          const followingData = (await followApi.getFollowing()) as { following: User }[];
          setFollowing(followingData.some(f => f.following?.id === userId));
          // Check if target user also follows current user (mutual follow)
          try {
            // Get who the target user is following, check if current user is in that list
            const targetFollowing = await followApi.getFollowing(userId) as FollowRecord[];
            setIsMutualFollow(targetFollowing.some(f => f.following?.id === data.id));
          } catch {
            setIsMutualFollow(false);
          }
        } else {
          setUser(data);
          const myPosts = (await postsApi.getMyPosts()) as Post[];
          setPosts(myPosts || []);
          const stats = (await followApi.getFollowStats()) as { followers: number; following: number };
          setFollowStats(stats);
          setFollowing(false);
        }
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, userId]);

  useEffect(() => {
    if (!me) return;
    
    const targetUserId = userId && userId !== me.id ? userId : me.id;
    
    const handlePostCreated = (data: Post) => {
      if (data.author?.id === targetUserId) {
        setPosts(prev => [data, ...prev]);
      }
    };

    const handlePostDeleted = (data: { postId: string }) => {
      setPosts(prev => prev.filter(p => p.id !== data.postId));
    };

    socket.on('post_created', handlePostCreated);
    socket.on('post_deleted', handlePostDeleted);

    return () => {
      socket.off('post_created', handlePostCreated);
      socket.off('post_deleted', handlePostDeleted);
    };
  }, [userId, me]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);

    try {
      const updated = (await usersApi.uploadAvatar(file)) as User;
      setMe(updated);
      if (!userId || userId === me?.id) {
        setUser(updated);
      }
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
      setMe(updated);
      if (!userId || userId === me?.id) {
        setUser(updated);
      }
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
      <Header user={me} onPostCreated={() => {
          if (!userId || userId === me?.id) {
            postsApi.getMyPosts().then((myPosts) => setPosts(myPosts || []));
          }
        }} />

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
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
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

                <div className="flex-1 pt-4 sm:pt-4">
                  <div className="flex flex-col gap-2 sm:hidden">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base text-text-secondary normal-case">
                          {user?.username}
                        </p>
                        <h2 className="text-text-base text-lg font-bold normal-case">
                          {user?.displayName || user?.username}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleOpenFollowing}
                          className="text-center"
                        >
                          <span className="text-text-base font-bold normal-case">
                            {followStats?.following ?? user?.followingCount ?? 0}
                          </span>
                          <span className="block text-xs text-text-secondary normal-case">
                            Following
                          </span>
                        </button>
                        <button
                          onClick={handleOpenFollowers}
                          className="text-center"
                        >
                          <span className="text-text-base font-bold normal-case">
                            {followStats?.followers ?? user?.followersCount ?? 0}
                          </span>
                          <span className="block text-xs text-text-secondary normal-case">
                            Followers
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-text-base normal-case">
                        {user?.bio || "No bio yet"}
                      </p>
                      <div className="flex justify-end">
                        {!userId || userId === me?.id ? (
                          <button
                            onClick={() => router.push("/edit-profile")}
                            className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                          >
                            Edit
                          </button>
                      ) : following ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowUnfollowConfirm(true)}
                            className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                          >
                            Followed
                          </button>
                          {isMutualFollow && (
                            <button
                              onClick={async () => {
                                try {
                                  const conv = await chatApi.getOrCreateConversation(userId);
                                  router.push(`/chat?conversationId=${conv.id}`);
                                } catch {}
                              }}
                              className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                            >
                              Message
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await followApi.follow(userId);
                              setFollowing(true);
                               setFollowStats(s => s ? { ...s, followers: (s.followers || 0) + 1 } : null);
                            } catch {
                            }
                          }}
                          className="h-7 px-3 rounded-full bg-sp-green border border-sp-green text-white text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:bg-sp-green/90"
                        >
                          Follow
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-base text-text-secondary normal-case">
                        {user?.username}
                      </p>
                      <h2 className="text-text-base text-lg font-bold normal-case">
                        {user?.displayName || user?.username}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleOpenFollowing}
                        className="text-center"
                      >
                        <span className="text-text-base font-bold normal-case">
                          {followStats?.following ?? user?.followingCount ?? 0}
                        </span>
                        <span className="block text-xs text-text-secondary normal-case">
                          Following
                        </span>
                      </button>
                      <button
                        onClick={handleOpenFollowers}
                        className="text-center"
                      >
                        <span className="text-text-base font-bold normal-case">
                          {followStats?.followers ?? user?.followersCount ?? 0}
                        </span>
                        <span className="block text-xs text-text-secondary normal-case">
                          Followers
                        </span>
                      </button>
                      {!userId || userId === me?.id ? (
                        <button
                          onClick={() => router.push("/edit-profile")}
                          className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                        >
                          Edit
                        </button>
                      ) : following ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowUnfollowConfirm(true)}
                            className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                          >
                            Followed
                          </button>
                          {isMutualFollow && (
                            <button
                              onClick={async () => {
                                try {
                                  const conv = await chatApi.getOrCreateConversation(userId);
                                  router.push(`/chat?conversationId=${conv.id}`);
                                } catch {}
                              }}
                              className="h-7 px-3 rounded-full bg-surface-elevated border border-light-border text-text-base text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:border-text-base hover:bg-surface-elevated/80"
                            >
                              Message
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await followApi.follow(userId);
                              setFollowing(true);
                               setFollowStats(s => s ? { ...s, followers: (s.followers || 0) + 1 } : null);
                            } catch {
                            }
                          }}
                          className="h-7 px-3 rounded-full bg-sp-green border border-sp-green text-white text-[11px] font-bold uppercase tracking-wider normal-case transition-all hover:bg-sp-green/90"
                        >
                          Follow
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="hidden sm:block mt-3 text-sm text-text-base normal-case">
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

              {showUnfollowConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface rounded-[8px] p-6 max-w-sm w-full mx-4 shadow-xl">
                    <h3 className="text-text-base text-base font-bold mb-2">Unfollow user</h3>
                    <p className="text-text-secondary text-sm mb-6">
                      Are you sure you want to unfollow {user?.displayName || user?.username}?
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowUnfollowConfirm(false)}
                        className="px-4 py-2 text-sm text-text-base bg-surface-elevated border border-border-gray rounded hover:bg-surface transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!userId) return;
                          try {
                            await followApi.unfollow(userId);
                            setFollowing(false);
                            setFollowStats(s => s ? { ...s, following: Math.max((s.following || 1) - 1, 0) } : null);
                          } catch {
                          } finally {
                            setShowUnfollowConfirm(false);
                          }
                        }}
                        className="px-4 py-2 text-sm text-white bg-negative-red rounded hover:bg-negative-red/90 transition-colors"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showFollowersModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface rounded-[8px] p-6 max-w-md w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
                    <h3 className="text-text-base text-base font-bold mb-4">Followers</h3>
                    <div className="flex-1 overflow-y-auto">
                      {followersList.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-4">No followers yet</p>
                      ) : (
                        <div className="space-y-2">
                          {followersList.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setShowFollowersModal(false);
                                router.push(`/profile?userId=${u.id}`);
                              }}
                              className="flex items-center gap-3 w-full p-2 rounded hover:bg-surface-elevated transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                                {u.avatar ? (
                                  <img src={getFileUrl(u.avatar) || ""} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-4 h-4 text-text-secondary m-auto mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm text-text-base font-bold normal-case">{u.displayName || u.username}</span>
                                <span className="text-xs text-text-secondary normal-case">@{u.username}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setShowFollowersModal(false)}
                        className="px-4 py-2 text-sm text-text-base bg-surface-elevated border border-border-gray rounded hover:bg-surface transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showFollowingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface rounded-[8px] p-6 max-w-md w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
                    <h3 className="text-text-base text-base font-bold mb-4">Following</h3>
                    <div className="flex-1 overflow-y-auto">
                      {followingList.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-4">Not following anyone</p>
                      ) : (
                        <div className="space-y-2">
                          {followingList.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setShowFollowingModal(false);
                                router.push(`/profile?userId=${u.id}`);
                              }}
                              className="flex items-center gap-3 w-full p-2 rounded hover:bg-surface-elevated transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                                {u.avatar ? (
                                  <img src={getFileUrl(u.avatar) || ""} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-4 h-4 text-text-secondary m-auto mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm text-text-base font-bold normal-case">{u.displayName || u.username}</span>
                                <span className="text-xs text-text-secondary normal-case">@{u.username}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setShowFollowingModal(false)}
                        className="px-4 py-2 text-sm text-text-base bg-surface-elevated border border-border-gray rounded hover:bg-surface transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
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

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
