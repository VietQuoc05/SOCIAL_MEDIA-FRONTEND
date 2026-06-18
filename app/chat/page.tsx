"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Conversation,
  ChatMessage,
  chatApi,
  getFileUrl,
  usersApi,
} from "@/services/api";
import Header from "@/components/Header";
import { socket } from "@/services/socket";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversationId");

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(conversationIdParam);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showConvList, setShowConvList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load user & conversations
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const userData = (await usersApi.getMe()) as User;
        setUser(userData);
        const convs = (await chatApi.getConversations()) as Conversation[];
        setConversations(convs || []);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await chatApi.getMessages(activeConversation);
        setMessages(res.data || []);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
        scrollToBottom();
      }
    };
    loadMessages();
  }, [activeConversation, scrollToBottom]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!activeConversation || !user) return;

    const handleNewMessage = (data: ChatMessage) => {
      if (data.conversationId === activeConversation) {
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      }

      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id === data.conversationId) {
            return {
              ...c,
              lastMessage: data.content || (data.image ? "[Image]" : c.lastMessage),
              lastMessageImage: data.image || c.lastMessageImage,
              lastMessageAt: data.createdAt,
              lastSenderId: data.senderId,
            };
          }
          return c;
        });
        // Sort: most recent first
        updated.sort((a, b) => {
          const aTime = a.lastMessageAt || a.createdAt;
          const bTime = b.lastMessageAt || b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        return updated;
      });
    };

    socket.on("new_message", handleNewMessage);
    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [activeConversation, user]);

  const loadMoreMessages = async () => {
    if (!nextCursor || !activeConversation || loadingMessages) return;
    setLoadingMessages(true);
    try {
      const res = await chatApi.getMessages(activeConversation, nextCursor);
      setMessages(prev => [...(res.data || []), ...prev]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !activeConversation || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      await chatApi.sendMessage(activeConversation, content);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  const uploadAndSendImage = async (file: File) => {
    if (!activeConversation) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/upload/file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const uploadResult = await res.json();
      await chatApi.sendMessage(activeConversation, undefined, uploadResult.key);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send image", err);
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    await uploadAndSendImage(file);
    e.target.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadAndSendImage(file);
        }
        break;
      }
    }
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversation(convId);
    setShowConvList(false);
    router.push(`/chat?conversationId=${convId}`, { scroll: false });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("vi-VN", { weekday: "short" });
    }
    return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  };

  const activeConvData = conversations.find(c => c.id === activeConversation);
  const otherUser = activeConvData?.otherUser;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header user={user} />

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Desktop sidebar */}
        <div className={`${showConvList ? "block" : "hidden"} md:block w-full md:w-80 lg:w-96 border-r border-border-gray bg-surface flex flex-col`}>
          <div className="p-4 border-b border-border-gray">
            <h2 className="text-text-base text-base font-bold normal-case">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-text-secondary text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-surface-elevated transition-colors ${
                    activeConversation === conv.id ? "bg-surface-elevated" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                    {conv.otherUser?.avatar ? (
                      <img
                        src={getFileUrl(conv.otherUser.avatar) || ""}
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-base font-bold normal-case truncate">
                        {conv.otherUser?.displayName || conv.otherUser?.username || "Unknown"}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-text-secondary flex-shrink-0 ml-2">
                          {formatTime(conv.lastMessageAt || "")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.lastSenderId && conv.lastSenderId === user?.id && (
                        <span className="text-xs text-text-secondary">You: </span>
                      )}
                      <span className="text-xs text-text-secondary truncate">
                        {conv.lastMessageImage ? "[Image]" : conv.lastMessage || "No messages yet"}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${!showConvList || activeConversation ? "flex" : "hidden"} md:flex flex-1 flex-col`}>
          {activeConversation && otherUser ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-3 border-b border-border-gray bg-surface">
                <button
                  onClick={() => setShowConvList(true)}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push(`/profile?userId=${otherUser.id}`)}
                  className="w-10 h-10 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0"
                >
                  {otherUser.avatar ? (
                    <img
                      src={getFileUrl(otherUser.avatar) || ""}
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
                  <span className="text-sm text-text-base font-bold normal-case">
                    {otherUser.displayName || otherUser.username}
                  </span>
                  <span className="text-xs text-text-secondary normal-case">
                    @{otherUser.username}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-background"
              >
                {hasMore && (
                  <div className="text-center py-2">
                    <button
                      onClick={loadMoreMessages}
                      disabled={loadingMessages}
                      className="text-xs text-sp-green hover:underline disabled:opacity-50"
                    >
                      {loadingMessages ? "Loading..." : "Load older messages"}
                    </button>
                  </div>
                )}

                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-text-secondary text-sm">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-text-secondary text-sm">No messages yet</p>
                      <p className="text-text-secondary text-xs mt-1">
                        Send a message to start chatting
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMine = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-3 py-2 rounded-[8px] ${
                              isMine
                                ? "bg-sp-green text-white rounded-br-sm"
                                : "bg-surface-elevated text-text-base rounded-bl-sm"
                            }`}
                          >
                            {msg.content && (
                              <p className="text-sm normal-case whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}
                            {msg.image && (
                              <img
                                src={getFileUrl(msg.image) || ""}
                                alt="sent image"
                                className="max-w-full rounded mt-1 max-h-48 object-cover cursor-pointer"
                                onClick={() => window.open(getFileUrl(msg.image ?? undefined) || "", "_blank")}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <div className={`text-xs mt-1 ${isMine ? "text-white/70" : "text-text-secondary"}`}>
                              {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border-gray bg-surface">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors flex-shrink-0"
                    title="Send image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSendImage}
                  />
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder="Type a message..."
                    className="flex-1 h-9 px-3 text-sm text-text-base normal-case bg-surface-elevated border border-border-gray rounded-full focus:outline-none focus:border-sp-green"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-sp-green text-white hover:bg-sp-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center">
                <svg className="w-16 h-16 text-text-secondary/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-text-secondary text-sm">Select a conversation</p>
                <p className="text-text-secondary text-xs mt-1">
                  or start a new one from a user profile
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}