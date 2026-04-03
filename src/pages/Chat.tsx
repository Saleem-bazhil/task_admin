import { startTransition, useEffect, useRef, useState } from "react";
import api from "../api";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import { ACCESS_TOKEN_KEY, getStoredUser } from "../utils/auth";

interface ChatUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: ChatUser;
  receiver: ChatUser;
  room_id: string;
}

interface Conversation {
  room_id: string;
  other_user: ChatUser;
  last_message: Message | null;
}

export default function Chat() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const suppressSocketErrorsRef = useRef(false);
  const fetchedInitialDataRef = useRef(false);
  const roomByUserIdRef = useRef<Record<number, string>>({});
  const messageCacheRef = useRef<Record<string, Message[]>>({});
  const messageRequestRef = useRef<AbortController | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currentUser = getStoredUser() || {};

  const formatContactName = (user: ChatUser) =>
    user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username;

  const formatMessageTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatConversationTime = (value?: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return formatMessageTime(value);
    }

    return date.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  const formatDayLabel = (value: string) => {
    const date = new Date(value);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return "Today";
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const loadChatData = async (signal?: AbortSignal) => {
    setLoadingUsers(true);
    setChatError(null);

    try {
      // Fetch all chat users
      console.log("🔍 Fetching chat users from API...");
      let usersData: ChatUser[] = [];

      try {
        const usersResponse = await api.get("chat/users/", { signal });
        console.log("✅ Users API Response:", usersResponse.data);

        if (Array.isArray(usersResponse.data)) {
          usersData = usersResponse.data.filter((u: ChatUser) => u.id !== currentUser.id);
          console.log(`📋 Filtered users (excluding self): ${usersData.length}`, usersData);
        } else {
          console.error("❌ Users response is not an array:", usersResponse.data);
          setChatError("Invalid users data format from server.");
          setUsers([]);
        }
      } catch (usersError: any) {
        if (usersError.name === "CanceledError" || usersError.name === "AbortError") {
          return;
        }
        console.error("❌ Failed to fetch users:", usersError);
        const errorMsg = usersError.response?.data?.detail || usersError.message || "Unable to fetch chat users";
        setChatError(errorMsg);
      }

      // Update users state
      if (usersData.length > 0) {
        startTransition(() => {
          setUsers(usersData);
        });
      } else {
        console.warn("⚠️ No users returned from API");
        setUsers([]);
      }

      // Reset room and message caches
      roomByUserIdRef.current = {};
      messageCacheRef.current = {};

      // Fetch existing conversations
      try {
        console.log("🔍 Fetching conversations...");
        const conversationsResponse = await api.get("chat/conversations/", { signal });
        console.log("✅ Conversations API Response:", conversationsResponse.data);

        const conversations: Conversation[] = conversationsResponse.data;
        conversations.forEach((conversation) => {
          roomByUserIdRef.current[conversation.other_user.id] = conversation.room_id;
          if (conversation.last_message) {
            messageCacheRef.current[conversation.room_id] = [conversation.last_message];
          }
        });
        console.log(`📨 Loaded ${conversations.length} conversations`);
      } catch (conversationsError: any) {
        console.error("⚠️ Failed to load conversations:", conversationsError);
        // Don't throw - conversations are optional
      }
    } catch (err: any) {
      console.error("❌ Fatal error in loadChatData:", err);
      if (err.name !== "CanceledError" && err.name !== "AbortError") {
        setChatError(err.response?.data?.detail || "Unable to load chat users. Please try again.");
        setUsers([]);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchedInitialDataRef.current = false;

    const fetchInitialChatData = async () => {
      await loadChatData(controller.signal);
    };

    fetchInitialChatData();

    return () => {
      controller.abort();
      messageRequestRef.current?.abort();
      if (wsRef.current) {
        suppressSocketErrorsRef.current = true;
        wsRef.current.close();
      }
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, activeRoom]);

  const openChat = async (user: ChatUser) => {
    if (activeUser?.id === user.id && activeRoomRef.current) {
      return;
    }

    setActiveUser(user);
    setChatError(null);

    const cachedRoomId = roomByUserIdRef.current[user.id];
    if (cachedRoomId) {
      setActiveRoom(cachedRoomId);
      activeRoomRef.current = cachedRoomId;
      setUnreadCounts((prev) => ({ ...prev, [cachedRoomId]: 0 }));

      const cachedMessages = messageCacheRef.current[cachedRoomId];
      if (cachedMessages) {
        startTransition(() => {
          setMessages(cachedMessages);
        });
      } else {
        setMessages([]);
      }

      setupWebSocket(cachedRoomId);
      if (cachedMessages) {
        void refreshMessages(cachedRoomId, false);
        return;
      }
    }

    try {
      setLoadingMessages(true);
      const response = await api.post("chat/rooms/", { user_id: user.id });
      const roomId = response.data.room_id;
      roomByUserIdRef.current[user.id] = roomId;
      setActiveRoom(roomId);
      activeRoomRef.current = roomId;
      setMessages(messageCacheRef.current[roomId] || []);
      setupWebSocket(roomId);
      await refreshMessages(roomId, false);
    } catch (err: any) {
      console.error("Error opening chat", err);
      setChatError(err.response?.data?.detail || "Unable to open chat right now.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const refreshMessages = async (roomId: string, showLoader: boolean) => {
    try {
      messageRequestRef.current?.abort();
      const controller = new AbortController();
      messageRequestRef.current = controller;

      if (showLoader) {
        setLoadingMessages(true);
      }

      const msgResponse = await api.get(`chat/rooms/${roomId}/messages/`, {
        signal: controller.signal,
      });
      messageCacheRef.current[roomId] = msgResponse.data;
      if (activeRoomRef.current === roomId) {
        startTransition(() => {
          setMessages(msgResponse.data);
        });
      }
    } catch (err: any) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        return;
      }
      console.error("Failed to load messages", err);
      setChatError("Unable to load messages.");
    } finally {
      if (showLoader) {
        setLoadingMessages(false);
      }
    }
  };

  const setupWebSocket = (roomId: string) => {
    if (activeRoomRef.current === roomId && wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      suppressSocketErrorsRef.current = true;
      wsRef.current.close();
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const apiBaseUrl = api.defaults.baseURL || "http://127.0.0.1:8000/api/";
    const apiUrl = new URL(apiBaseUrl);
    const search = token ? `?token=${encodeURIComponent(token)}` : "";
    const wsUrl = `${protocol}://${apiUrl.host}/ws/chat/${roomId}/${search}`;
    const ws = new WebSocket(wsUrl);
    suppressSocketErrorsRef.current = false;
    activeRoomRef.current = roomId;
    setSocketReady(false);

    ws.onopen = () => {
      setSocketReady(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "error") {
        setChatError(data.detail || "Unable to send message.");
        return;
      }

      const nextMessages = [...(messageCacheRef.current[roomId] || []), data];
      const dedupedMessages = nextMessages.filter(
        (message, index, collection) =>
          index === collection.findIndex((candidate) => candidate.id === message.id)
      );
      messageCacheRef.current[roomId] = dedupedMessages;

      if (activeRoomRef.current === roomId) {
        startTransition(() => {
          setMessages(dedupedMessages);
        });
      } else if (data.sender?.id !== currentUser.id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? 0) + 1,
        }));
      }
    };

    ws.onerror = (error) => {
      if (suppressSocketErrorsRef.current) {
        return;
      }
      console.error("WebSocket error:", error);
      setChatError("WebSocket connection failed.");
      setSocketReady(false);
    };

    ws.onclose = () => {
      if (suppressSocketErrorsRef.current) {
        suppressSocketErrorsRef.current = false;
        return;
      }
      setSocketReady(false);
    };

    wsRef.current = ws;
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        message: inputMessage.trim(),
      })
    );

    setInputMessage("");
  };

  const filteredUsers = users
    .filter((user) => {
      const label = `${formatContactName(user)} ${user.username}`.toLowerCase();
      return label.includes(searchQuery.trim().toLowerCase());
    })
    .sort((left, right) => {
      const leftRoomId = roomByUserIdRef.current[left.id];
      const rightRoomId = roomByUserIdRef.current[right.id];
      const leftMessages = leftRoomId ? messageCacheRef.current[leftRoomId] : undefined;
      const rightMessages = rightRoomId ? messageCacheRef.current[rightRoomId] : undefined;
      const leftLastMessage = leftMessages ? leftMessages[leftMessages.length - 1] : undefined;
      const rightLastMessage = rightMessages ? rightMessages[rightMessages.length - 1] : undefined;
      const leftTime = leftLastMessage ? new Date(leftLastMessage.timestamp).getTime() : 0;
      const rightTime = rightLastMessage ? new Date(rightLastMessage.timestamp).getTime() : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return formatContactName(left).localeCompare(formatContactName(right));
    });

  return (
    <>
      <PageMeta title="Chat | Task Tracker" description="Real-time chat with team members." />
      <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${activeRoom ? "hidden xl:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]`}>
          <div className="border-b border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Chats</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Direct conversations between your team members
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  {filteredUsers.length} contacts
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log("🔄 User clicked refresh users");
                    void loadChatData();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition dark:hover:bg-gray-800"
                  title="Refresh users list"
                >
                  <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.998 8.998 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.968 8.968 0 01-15.356-2m15.356 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-4">
              <Input
                type="text"
                placeholder="Search or start a new chat"
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="rounded-2xl border-0 bg-white shadow-sm dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            {chatError && (
              <div className="mb-3 rounded-2xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                {chatError}
              </div>
            )}

            {loadingUsers && (
              <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
                Loading contacts...
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {filteredUsers.map((user) => {
                const roomId = roomByUserIdRef.current[user.id];
                const roomMessages = roomId ? messageCacheRef.current[roomId] : undefined;
                const lastMessage = roomMessages ? roomMessages[roomMessages.length - 1] : undefined;
                const isActive = activeUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => openChat(user)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${isActive
                      ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20"
                      : "hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-semibold text-white shadow-sm">
                      {formatContactName(user).charAt(0).toUpperCase()}
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
                          {formatContactName(user)}
                        </h4>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {formatConversationTime(lastMessage?.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {lastMessage?.content || `Start a conversation with @${user.username}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className={`${!activeRoom ? "hidden xl:flex" : "flex"} relative min-h-0 flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]`}>
          {activeRoom ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50/80 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoom(null);
                    setActiveUser(null);
                    setMessages([]);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-gray-500 xl:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  Back
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
                  {activeUser ? formatContactName(activeUser).charAt(0).toUpperCase() : "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white/90">
                    {activeUser ? formatContactName(activeUser) : "Conversation"}
                  </h3>
                  <p className={`text-xs ${socketReady ? "text-emerald-500" : "text-gray-400"}`}>
                    {socketReady ? "online now" : "connecting..."}
                  </p>
                </div>
                <div className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm sm:block dark:bg-gray-900 dark:text-gray-400">
                  @{activeUser?.username}
                </div>
              </div>



              <div ref={messageListRef} className="custom-scrollbar relative flex-1 overflow-y-auto px-4 py-6">
                {loadingMessages && (
                  <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">Loading messages...</div>
                )}

                {messages.length === 0 && !loadingMessages && (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-[28px] border border-white/60 bg-white/80 px-6 py-8 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        C
                      </div>
                      <h4 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                        Start the conversation
                      </h4>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Send a message to {activeUser ? formatContactName(activeUser) : "your teammate"} to begin this chat.
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative flex flex-col gap-3">
                  {messages.map((msg, idx) => {
                    const isCurrent = msg.sender?.id === currentUser.id;
                    const previousMessage = idx > 0 ? messages[idx - 1] : null;
                    const showDateDivider =
                      !previousMessage ||
                      new Date(previousMessage.timestamp).toDateString() !==
                      new Date(msg.timestamp).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDateDivider && (
                          <div className="mb-3 flex justify-center">
                            <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400">
                              {formatDayLabel(msg.timestamp)}
                            </span>
                          </div>
                        )}

                        <div className={`flex w-full ${isCurrent ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm sm:max-w-[75%] ${isCurrent
                              ? "rounded-br-md bg-brand-500 text-white dark:bg-brand-600 dark:text-white"
                              : "rounded-bl-md border border-white/70 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                              }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                            <div className="mt-2 flex items-center justify-end gap-2">
                              {!isCurrent && (
                                <span className="text-[10px] font-medium text-gray-400">
                                  {msg.sender?.username}
                                </span>
                              )}
                              <span className={`text-[10px] ${isCurrent ? "text-brand-100" : "text-gray-400"}`}>
                                {formatMessageTime(msg.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={sendMessage} className="relative flex items-end gap-3 border-t border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder={`Message ${activeUser ? formatContactName(activeUser) : ""}`}
                    value={inputMessage}
                    onChange={(e: any) => setInputMessage(e.target.value)}
                    className="rounded-full border-0 bg-gray-100 pr-4 shadow-none dark:bg-gray-900"
                  />
                </div>
                <Button type="submit" size="sm" disabled={!inputMessage.trim() || !socketReady} className="h-11 rounded-full px-5 shadow-theme-md">
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="relative hidden flex-1 items-center justify-center overflow-hidden xl:flex">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(70,95,255,0.14),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(38,46,137,0.12),_transparent_28%)]" />
              <div className="relative max-w-md rounded-[32px] border border-white/60 bg-white/80 px-8 py-10 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-2xl font-semibold text-white">
                  C
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white">
                  Team chat
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Pick a contact from the left to open a real-time conversation between admin and employee accounts.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
