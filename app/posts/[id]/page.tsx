"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { postsApi, getFileUrl, Post, usersApi, User } from "@/services/api";
import Header from "@/components/Header";

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const [userData, postData] = await Promise.all([
          usersApi.getMe() as Promise<User>,
          postsApi.getPost(postId) as Promise<Post>,
        ]);
        setUser(userData);
        setPost(postData);
      } catch {
        router.replace("/home");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  const imagesCount = post?.images?.length || 0;
  const canNavigate = imagesCount > 1;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />

      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          {post && (
            <div className="bg-surface rounded-[8px] overflow-hidden">
              {imagesCount > 0 && (
                <div className="relative">
                  <img
                    src={getFileUrl(post.images[currentImageIndex]) || ""}
                    alt={`post-image-${currentImageIndex}`}
                    className="w-full max-h-96 object-contain bg-surface-elevated"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {canNavigate && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : imagesCount - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        aria-label="Previous image"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(i => i < imagesCount - 1 ? i + 1 : 0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        aria-label="Next image"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        {currentImageIndex + 1} / {imagesCount}
                      </div>
                    </>
                  )}
                </div>
              )}
              {post.caption && (
                <div className="p-4">
                  <p className="text-sm text-text-base normal-case">{post.caption}</p>
                </div>
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