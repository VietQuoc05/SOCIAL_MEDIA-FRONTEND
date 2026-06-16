"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postsApi, getFileUrl, Post, User, usersApi, reactionsApi, commentsApi, Comment } from "@/services/api";
import Header from "@/components/Header";
import { socket } from "@/services/socket";

function CommentItem({ comment, depth = 0, onReply, onUpdateComment, onDeleteComment, currentUserId, postAuthorId }: { comment: Comment; depth?: number; onReply: (parentId: string) => void; onUpdateComment: (commentId: string, isLiked: boolean, totalReactions: number) => void; onDeleteComment: (commentId: string) => void; currentUserId?: string; postAuthorId?: string }) {
  const router = useRouter();
  const [showReplies, setShowReplies] = useState(false);
  const indent = depth * 16;

  const handleCommentReact = async () => {
    const newIsLiked = !comment.isLiked;
    const newTotal = newIsLiked ? (comment.totalReactions || 0) + 1 : Math.max((comment.totalReactions || 1) - 1, 0);
    onUpdateComment(comment.id, newIsLiked, newTotal);
    try {
      await reactionsApi.toggleComment(comment.id);
    } catch {
      onUpdateComment(comment.id, !newIsLiked, comment.totalReactions || 0);
    }
  };

  return (
    <div className="flex gap-2 py-2" style={{ marginLeft: `${indent}px` }}>
      <button
        onClick={() => router.push(`/profile?userId=${comment.author?.id}`)}
        className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0"
      >
        {comment.author?.avatar ? (
          <img
            src={getFileUrl(comment.author.avatar) || ""}
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
      </button>
      <div className="flex-1">
        <div className="flex flex-col">
          <button
            onClick={() => router.push(`/profile?userId=${comment.author?.id}`)}
            className="text-text-base font-bold text-sm normal-case hover:underline text-left"
          >
            {comment.author?.displayName || comment.author?.username}
          </button>
          <p className="text-sm text-text-secondary normal-case">
            {comment.author?.username}
          </p>
        </div>
        <p className="text-sm text-text-base normal-case mt-1">{comment.content}</p>
        {comment.image && (
          <img
            src={getFileUrl(comment.image) || ""}
            alt="comment"
            className="w-32 h-32 object-cover rounded mt-2 bg-surface-elevated"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleCommentReact}
            className={`flex items-center gap-1 text-xs transition-colors ${comment.isLiked ? 'text-red-500' : 'text-text-secondary'} hover:text-red-400`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{comment.totalReactions || 0}</span>
          </button>
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-text-secondary hover:underline"
          >
            Reply
          </button>
          {(currentUserId && (comment.author?.id === currentUserId || postAuthorId === currentUserId)) && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this comment?")) {
                  onDeleteComment(comment.id);
                }
              }}
              className="text-xs text-negative-red hover:underline"
            >
              Delete
            </button>
          )}
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-1">
            {(comment.replies.length > 2 && !showReplies ? comment.replies.slice(0, 2) : comment.replies).map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} onUpdateComment={onUpdateComment} onDeleteComment={onDeleteComment} currentUserId={currentUserId} postAuthorId={postAuthorId} />
            ))}
            {comment.replies.length > 2 && !showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="text-xs text-text-secondary hover:underline"
              >
                View {comment.replies.length - 2} more replies
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId') || "";
  const [user, setUser] = useState<User | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!postId) {
      router.replace("/home");
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

  useEffect(() => {
    if (!postId) return;
    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const data = await commentsApi.getByPost(postId) as Comment[];
        setComments(data || []);
      } catch {
      } finally {
        setCommentsLoading(false);
      }
    };
    loadComments();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    const handleNewComment = (data: { deleted?: boolean; commentId?: string; postId?: string }) => {
      if (data.postId && data.postId === postId) {
        if (data.deleted) {
          setComments(prev => prev.filter(c => c.id !== data.commentId));
        }
        commentsApi.getByPost(postId).then((comments) => {
          setComments(comments || []);
        }).catch(() => {});
      }
    };

    const handleReactionUpdate = (data: { postId?: string; commentId?: string; action: string }) => {
      setPost(prev => {
        if (!prev) return prev;
        if (data.postId && data.postId === prev.id) {
          const wasLiked = prev.isLiked;
          return {
            ...prev,
            isLiked: data.action === 'created' ? true : data.action === 'removed' ? false : wasLiked,
            totalReactions: data.action === 'created' 
              ? (prev.totalReactions || 0) + 1 
              : data.action === 'removed' 
                ? Math.max((prev.totalReactions || 1) - 1, 0) 
                : prev.totalReactions,
          };
        }
        return prev;
      });
      if (data.commentId) {
        setComments(prev => prev.map(c => {
          if (c.id === data.commentId) {
            return {
              ...c,
              isLiked: data.action === 'created' ? true : data.action === 'removed' ? false : c.isLiked,
              totalReactions: data.action === 'created' 
                ? (c.totalReactions || 0) + 1 
                : data.action === 'removed' 
                  ? Math.max((c.totalReactions || 1) - 1, 0) 
                  : c.totalReactions,
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r => r.id === data.commentId ? {
                ...r,
                isLiked: data.action === 'created' ? true : data.action === 'removed' ? false : r.isLiked,
                totalReactions: data.action === 'created' 
                  ? (r.totalReactions || 0) + 1 
                  : data.action === 'removed' 
                    ? Math.max((r.totalReactions || 1) - 1, 0) 
                    : r.totalReactions,
              } : r)
            };
          }
          return c;
        }));
      }
    };

    socket.on('new_comment', handleNewComment);
    socket.on('reaction_update', handleReactionUpdate);

    return () => {
      socket.off('new_comment', handleNewComment);
      socket.off('reaction_update', handleReactionUpdate);
    };
  }, [postId]);

  const updateCommentReaction = (commentId: string, isLiked: boolean, totalReactions: number) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, isLiked, totalReactions };
      }
      if (c.replies) {
        return {
          ...c,
          replies: c.replies.map(r => r.id === commentId ? { ...r, isLiked, totalReactions } : r)
        };
      }
      return c;
    }));
  };

  const handleReact = async () => {
    if (!post || reacting) return;
    setReacting(true);
    try {
      await reactionsApi.togglePost(post.id);
      const updatedPost = await postsApi.getPost(postId) as Post;
      setPost(updatedPost);
    } catch {
    } finally {
      setReacting(false);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyParentId(parentId);
  };

  const deleteComment = async (commentId: string) => {
    try {
      await commentsApi.delete(commentId, postId);
      const data = await commentsApi.getByPost(postId) as Comment[];
      setComments(data || []);
    } catch {
      alert("Failed to delete comment");
    }
  };

  const handleDelete = async () => {
    if (!post || deleting) return;
    if (!confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    try {
      await postsApi.deletePost(post.id);
      router.replace("/home");
    } catch {
      alert("Failed to delete post");
      setDeleting(false);
    }
  };

  const submitReply = async () => {
    if (!replyContent.trim() || !replyParentId) return;
    try {
      if (replyParentId === "__ROOT__") {
        await commentsApi.create(postId, { content: replyContent });
      } else {
        await commentsApi.create(postId, { content: replyContent, parentId: replyParentId });
      }
      setReplyContent("");
      setReplyParentId(null);
      const data = await commentsApi.getByPost(postId) as Comment[];
      setComments(data || []);
    } catch {
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await commentsApi.create(postId, { content: commentText });
      setCommentText("");
      const data = await commentsApi.getByPost(postId) as Comment[];
      setComments(data || []);
    } catch {
    } finally {
      setSubmittingComment(false);
    }
  };

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
              <div className="p-4">
                {post.author && (
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => router.push(`/profile?userId=${post.author?.id}`)}
                      className="w-10 h-10 rounded-full border-2 border-border-gray bg-surface-elevated overflow-hidden"
                    >
                      {post.author.avatar ? (
                        <img
                          src={getFileUrl(post.author.avatar) || ""}
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
                    </button>
                    <div className="flex flex-col">
                      <button
                        onClick={() => router.push(`/profile?userId=${post.author?.id}`)}
                        className="text-text-base font-bold normal-case hover:underline text-left"
                      >
                        {post.author.displayName || post.author.username}
                      </button>
                      <p className="text-base text-text-secondary normal-case">
                        {post.author.username}
                      </p>
                    </div>
                  </div>
                )}
                {post.caption && (
                  <p className="text-sm text-text-base normal-case mb-3">{post.caption}</p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-border-gray">
                  <button
                    onClick={handleReact}
                    disabled={reacting}
                    className={`flex items-center gap-1 transition-colors ${post.isLiked ? 'text-red-500' : 'text-text-secondary'} ${reacting ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-400'}`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span className="text-xs">{post.totalReactions || 0}</span>
                  </button>
                  <button
                    onClick={() => setReplyParentId("__ROOT__")}
                    className="flex items-center gap-1 text-text-secondary hover:text-text-base transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-4.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs">Comment</span>
                  </button>
                  {user && post.author && user.id === post.author.id && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1 text-negative-red hover:text-negative-red/80 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-xs">{deleting ? "Deleting..." : "Delete"}</span>
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  {replyParentId && (
                    <div className="p-3 bg-surface-elevated rounded mb-4">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={replyParentId === "__ROOT__" ? "Write a comment..." : "Write a reply..."}
                        className="w-full p-2 text-sm text-text-base normal-case bg-surface border border-border-gray rounded resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button
                          onClick={() => {
                            setReplyParentId(null);
                            setReplyContent("");
                          }}
                          className="px-3 py-1 text-xs text-text-secondary hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitReply}
                          disabled={!replyContent.trim()}
                          className="px-3 py-1 text-xs bg-sp-green text-white rounded disabled:opacity-50"
                        >
                          {replyParentId === "__ROOT__" ? "Comment" : "Reply"}
                        </button>
                      </div>
                    </div>
                  )}
                  {commentsLoading ? (
                    <p className="text-text-secondary text-xs">Loading comments...</p>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="py-3 border-t border-border-gray">
                        <CommentItem comment={comment} onReply={handleReply} onUpdateComment={updateCommentReaction} onDeleteComment={deleteComment} currentUserId={user?.id} postAuthorId={post?.author?.id} />
                      </div>
                    ))
                  ) : (
                    <p className="text-text-secondary text-xs">No comments yet</p>
                  )}
                </div>
              </div>
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
