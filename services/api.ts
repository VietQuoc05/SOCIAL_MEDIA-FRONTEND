const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  role?: string;
}

interface LoginResponse {
  access_token: string;
}

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

const buildHeaders = (extra?: Record<string, string>) => ({
  "Content-Type": "application/json",
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
  ...extra,
});

export const api = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: buildHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }

    return res.json();
  },

  post: async <T>(url: string, body: unknown): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }

    return res.json();
  },

  del: async (url: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "DELETE",
      headers: buildHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }
  },

  patch: async <T>(url: string, body: unknown): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }

    return res.json();
  },

  patchForm: async <T>(url: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "PATCH",
      headers: {
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }

    return res.json();
  },

  postForm: async <T>(url: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: {
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }

    return res.json();
  },
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
  register: (email: string, username: string, displayName: string, password: string) =>
    api.post<{ id: string; email: string; username: string; displayName: string }>(
      "/auth/register",
      { email, username, displayName, password }
    ),
};

export const usersApi = {
  getMe: () => api.get<User>("/users/me"),
  getUser: (id: string) => api.get<User>(`/users/${id}`),
  search: (q: string) => api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  updateProfile: (data: { username?: string; displayName?: string; bio?: string }) =>
    api.patch<User>("/users/me", data),
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await api.postForm<{ key: string; url: string }>("/upload/file", formData);
    return api.patch<User>("/users/me", { avatar: result.key });
  },
  uploadCover: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await api.postForm<{ key: string; url: string }>("/upload/file", formData);
    return api.patch<User>("/users/me", { cover: result.key });
  },
};

export interface FollowRecord {
  id: string;
  follower: User;
  following: User;
  createdAt?: string;
}

export const followApi = {
  follow: (id: string) => api.post(`/follow/${id}`, {}),
  unfollow: (id: string) => api.del(`/follow/${id}`),
  getFollowers: (userId?: string) => api.get<FollowRecord[]>(`/follow/followers${userId ? `?userId=${userId}` : ""}`),
  getFollowing: (userId?: string) => api.get<FollowRecord[]>(`/follow/following${userId ? `?userId=${userId}` : ""}`),
  getFollowStats: (userId?: string) => userId 
    ? api.get<{ followers: number; following: number }>(`/follow/stats?userId=${userId}`)
    : api.get<{ followers: number; following: number }>("/follow/stats"),
};

export interface Post {
  id: string;
  caption?: string;
  images: string[];
  createdAt?: string;
  author?: User;
  isLiked?: boolean;
  totalReactions?: number;
}

export interface Comment {
  id: string;
  author?: User;
  content: string;
  image?: string;
  isLiked?: boolean;
  totalReactions?: number;
  replies?: Comment[];
  createdAt?: string;
}

export const reactionsApi = {
  togglePost: (postId: string) => api.post(`/reactions/post/${postId}`, {}),
  toggleComment: (commentId: string) => api.post(`/reactions/comment/${commentId}`, {}),
};

export const commentsApi = {
  getByPost: (postId: string) => api.get<Comment[]>(`/comments/post/${postId}`),
  create: (postId: string, dto: { content: string; parentId?: string }) =>
    api.post<Comment>(`/comments/${postId}`, dto),
  update: (id: string, dto: { content: string }) => api.patch<Comment>(`/comments/${id}`, dto),
  delete: (id: string, postId: string) => api.del(`/comments/${id}/${postId}`),
};

export const postsApi = {
  getMyPosts: () => api.get<Post[]>("/posts/me"),
  getPost: (id: string) => api.get<Post>(`/posts/${id}`),
  getByUser: (userId: string) => api.get<Post[]>(`/posts/user/${userId}`),
  getFeed: (cursor?: string, limit = 10) =>
    api.get<{ data: Post[]; nextCursor: string | null; hasMore: boolean }>(
      `/posts/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=${limit}` : `?limit=${limit}`}`,
    ),
  createPost: async (caption: string, files: File[]) => {
    const keys: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.postForm<{ key: string; url: string }>("/upload/file", formData);
      keys.push(result.key);
    }

    return api.post<Post>("/posts", { caption, images: keys });
  },
  deletePost: (id: string) => api.del(`/posts/${id}`),
};

export const decodeToken = (token: string) => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
};

export interface Conversation {
  id: string;
  otherUser: User;
  lastMessage: string | null;
  lastMessageImage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string | null;
  image: string | null;
  createdAt: string;
}

export interface MessagesResponse {
  data: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const chatApi = {
  getOrCreateConversation: (userId: string) =>
    api.post<Conversation>(`/chat/conversation/${userId}`, {}),
  getConversations: () =>
    api.get<Conversation[]>("/chat/conversations"),
  getMessages: (conversationId: string, cursor?: string | null, limit = 50) =>
    api.get<MessagesResponse>(
      `/chat/messages/${conversationId}${cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=${limit}` : `?limit=${limit}`}`
    ),
  sendMessage: (conversationId: string, content?: string, image?: string) =>
    api.post<ChatMessage>("/chat/message", { conversationId, content, image }),
};

export const getFileUrl = (fileName?: string) => {
  if (!fileName) return "";
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName;
  }
  const publicUrl = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/${fileName}`;
  }
  // fallback: nếu chưa set env, trả về URL upload local
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/uploads/${fileName}`;
};
