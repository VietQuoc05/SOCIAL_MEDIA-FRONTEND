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
  const [previewImages, setPreviewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Total unread across all conversations (for Header badge)
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

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

  // Mark conversation as read when selected
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await chatApi.markAsRead(conversationId);
      // Update local state: set unreadCount to 0 for this conversation
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch {
      // Ignore errors
    }
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
        // Mark as read after loading messages
        await markAsRead(activeConversation);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
        scrollToBottom();
      }
    };
    loadMessages();
  }, [activeConversation, markAsRead, scrollToBottom]);

  // Listen for typing events
  useEffect(() => {
    if (!activeConversation) return;

    const handleTyping = (data: { conversationId: string; displayName: string }) => {
      if (data.conversationId === activeConversation) {
        setTypingUser(data.displayName);
      }
    };

    const handleStopTyping = () => {
      setTypingUser(null);
    };

    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      setTypingUser(null);
    };
  }, [activeConversation]);

  // Emit typing event
  const emitTyping = useCallback(() => {
    if (!activeConversation || !user) return;
    socket.emit('typing', {
      conversationId: activeConversation,
      userId: user.id,
      displayName: user.displayName || user.username,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: activeConversation });
    }, 3000);
  }, [activeConversation, user]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Listen for new messages via socket
  useEffect(() => {
    if (!activeConversation || !user) return;

    const handleNewMessage = (data: ChatMessage) => {
      if (data.conversationId === activeConversation) {
        setMessages(prev => [...prev, data]);
        scrollToBottom();
        // Auto-mark as read when receiving a message in the active conversation
        markAsRead(activeConversation);
      }

      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id === data.conversationId) {
            // If the active conversation, unreadCount stays 0 (already marked read)
            // Otherwise, increment unreadCount if the sender is not the current user
            const newUnread = activeConversation === data.conversationId
              ? 0
              : data.senderId !== user?.id
                ? (c.unreadCount || 0) + 1
                : c.unreadCount || 0;
            return {
              ...c,
              lastMessage: data.content || (data.image ? "[Image]" : c.lastMessage),
              lastMessageImage: data.image || c.lastMessageImage,
              lastMessageAt: data.createdAt,
              lastSenderId: data.senderId,
              unreadCount: newUnread,
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
  }, [activeConversation, user, markAsRead, scrollToBottom]);

  // Listen for conversation_updated (when other user reads messages)
  useEffect(() => {
    const handleConversationUpdated = (data: Conversation) => {
      setConversations(prev =>
        prev.map(c => {
          if (c.id === data.id) {
            return {
              ...c,
              lastMessage: data.lastMessage,
              lastMessageImage: data.lastMessageImage,
              lastMessageAt: data.lastMessageAt,
              lastSenderId: data.lastSenderId,
            };
          }
          return c;
        })
      );
    };

    socket.on("conversation_updated", handleConversationUpdated);
    return () => {
      socket.off("conversation_updated", handleConversationUpdated);
    };
  }, []);

  // Listen for messages_read (when other user reads your messages)
  useEffect(() => {
    const handleMessagesRead = (data: { conversationId: string; userId: string; readAt: string }) => {
      // The other user read our messages - we could update UI to show "Seen" status
      // For now, this event is received but we don't need to change conversations
    };

    socket.on("messages_read", handleMessagesRead);
    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, []);

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
    if ((!text.trim() && previewImages.length === 0) || !activeConversation || sending) return;
    setSending(true);

    try {
      // Upload images first
      const imageKeys: string[] = [];
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const token = localStorage.getItem("token");

      for (const file of previewImages) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${baseUrl}/upload/file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const uploadResult = await res.json();
        imageKeys.push(uploadResult.key);
      }

      // Send images first (appear on top in chat)
      for (const key of imageKeys) {
        await chatApi.sendMessage(activeConversation, undefined, key);
      }

      // Send text after images (appears below in chat)
      if (text.trim()) {
        await chatApi.sendMessage(activeConversation, text.trim());
      }

      // Reset
      setText("");
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewImages([]);
      setPreviewUrls([]);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newFiles.push(files[i]);
      newUrls.push(URL.createObjectURL(files[i]));
    }

    setPreviewImages(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newUrls]);
    e.target.value = "";
    emitTyping();
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    const newFiles: File[] = [];
    const newUrls: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          newFiles.push(file);
          newUrls.push(URL.createObjectURL(file));
        }
      }
    }

    if (newFiles.length > 0) {
      e.preventDefault();
      setPreviewImages(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
      emitTyping();
    }
  };

  const handleRemovePreview = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversation(convId);
    setShowConvList(false);
    // Reset preview when switching conversation
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewImages([]);
    setPreviewUrls([]);
    router.push(`/chat?conversationId=${convId}`, { scroll: false });
    // Mark as read when switching to a conversation
    markAsRead(convId);
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

  const canSend = (text.trim() || previewImages.length > 0) && !sending;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header user={user} totalUnreadChats={totalUnread} />

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Desktop sidebar */}
        <div className={`${showConvList ? "block" : "hidden"} md:block w-full md:w-80 lg:w-96 border-r border-border-gray bg-surface flex flex-col`}>
          <div className="p-3 border-b border-border-gray">
            <h2 className="text-text-base text-base font-bold normal-case">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-text-secondary text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const hasUnread = (conv.unreadCount || 0) > 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-surface-elevated transition-colors ${
                      activeConversation === conv.id ? "bg-surface-elevated" : ""
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
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
                      {/* Unread dot on avatar */}
                      {hasUnread && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-sp-green rounded-full border-2 border-surface" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${
                          hasUnread
                            ? "text-text-base font-bold normal-case"
                            : "text-text-base normal-case"
                        }`}>
                          {conv.otherUser?.displayName || conv.otherUser?.username || "Unknown"}
                        </span>
                        {conv.lastMessageAt && (
                          <span className={`text-xs flex-shrink-0 ml-2 ${
                            hasUnread ? "text-text-base font-bold" : "text-text-secondary"
                          }`}>
                            {formatTime(conv.lastMessageAt || "")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {conv.lastSenderId && conv.lastSenderId === user?.id && (
                          <span className={`text-xs ${hasUnread ? "text-text-base font-bold" : "text-text-secondary"}`}>You: </span>
                        )}
                        <span className={`text-xs truncate ${
                          hasUnread ? "text-text-base font-bold" : "text-text-secondary"
                        }`}>
                          {conv.lastMessageImage ? "[Image]" : conv.lastMessage || "No messages yet"}
                        </span>
                      </div>
                    </div>
                    {/* Unread count badge */}
                    {hasUnread && (
                      <div className="flex-shrink-0 w-5 h-5 bg-sp-green rounded-full flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">
                          {conv.unreadCount! > 9 ? "9+" : conv.unreadCount}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
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
                  {typingUser ? (
                    <span className="text-xs text-sp-green animate-pulse">
                      {typingUser} is typing...
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary normal-case">
                      @{otherUser.username}
                    </span>
                  )}
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
                              {isMine && msg.readAt && (
                                <span className="ml-1 text-[10px]">· Seen</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input with Preview */}
              <div className="border-t border-border-gray bg-surface">
                {/* Image Previews */}
                {previewUrls.length > 0 && (
                  <div className="p-3 pb-0">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative flex-shrink-0">
                          <img
                            src={url}
                            alt={`preview-${index}`}
                            className="h-20 w-20 rounded object-cover border border-border-gray"
                          />
                          <button
                            onClick={() => handleRemovePreview(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-surface rounded-full border border-border-gray flex items-center justify-center text-text-secondary hover:text-negative-red transition-colors shadow-sm"
                            title="Remove image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface-elevated transition-colors flex-shrink-0"
                      title="Send images"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleSelectImages}
                    />
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        emitTyping();
                      }}
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
                      disabled={!canSend}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-sp-green text-white hover:bg-sp-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
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