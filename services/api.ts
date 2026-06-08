const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface User {
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
  updateProfile: (data: { username?: string; displayName?: string; bio?: string }) =>
    api.patch<User>("/users/me", data),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.patchForm<User>("/users/me", fd);
  },
  uploadCover: (file: File) => {
    const fd = new FormData();
    fd.append("cover", file);
    return api.patchForm<User>("/users/me", fd);
  },
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

export const getFileUrl = (fileName?: string) => {
  if (!fileName) return null;
  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost:9000";
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || "social";
  return `http://${endpoint}/${bucket}/${fileName}`;
};
