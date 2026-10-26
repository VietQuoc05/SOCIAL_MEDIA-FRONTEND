import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    // Ưu tiên dùng cùng origin với trang web để tránh lệch env
    return window.location.origin;
  }

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
  return url || "http://localhost:3000";
};

export const socket = io(getSocketUrl(), {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
} as any);
