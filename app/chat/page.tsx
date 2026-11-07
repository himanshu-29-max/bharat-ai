"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Send,
  Plus,
  X,
  Sparkles,
  ImageIcon,
  FileText,
  Trash2,
  MessageSquare,
  LogOut,
  Menu,
  PenSquare,
  Download,
  Shield,
  Search,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "bot";
  content: string;
  image?: string;
  fileName?: string;
  generatedImage?: string;
  extraImages?: string[];
  imageSource?: string;
  isError?: boolean;
  promptUsed?: string;
  timestamp?: number;
};

type Mode = "chat" | "imagine" | "search_photo" | "analyze";
type Chat = { id: string; title: string; updatedAt: number };
type AttachedFile = { type: "image" | "pdf" | "text"; data: string; name: string; mime: string };

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const WELCOME = "Namaste! 🙏 Main Bharat AI hoon. Aaj kis baare me baat karni hai ya image banani hai?";

const SUGGESTIONS = [
  { text: "Taj Mahal ke baare me batao", mode: "chat" as Mode, icon: "🏛️" },
  { text: "Ek cute cat astronaut floating in space", mode: "imagine" as Mode, icon: "🎨" },
  { text: "Photosynthesis aasan bhasha me samjhao", mode: "chat" as Mode, icon: "🌱" },
  { text: "Aaj ki badi taaza khabrein kya hain?", mode: "chat" as Mode, icon: "📰" },
];

async function readFile(file: File): Promise<AttachedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    reader.onerror = reject;

    if (isImage || isPDF) {
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({
          type: isImage ? "image" : "pdf",
          data: base64,
          name: file.name,
          mime: file.type || (isPDF ? "application/pdf" : "image/jpeg"),
        });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onloadend = () =>
        resolve({
          type: "text",
          data: reader.result as string,
          name: file.name,
          mime: file.type || "text/plain",
        });
      reader.readAsText(file);
    }
  });
}

// Generated/real image with a loading skeleton and gentle auto-retry.
// Pollinations images are created on first request, so the first load can
// legitimately take 15-30s — show progress instead of a blank/broken box.
function GeneratedImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [tries, setTries] = useState(0);
  return (
    <div className="relative">
      {!loaded && (
        <div className="w-full max-w-md h-64 rounded-xl border border-white/10 bg-white/5 animate-pulse flex items-center justify-center text-white/50 text-xs">
          Image ban rahi hai, thoda intezaar karein…
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={tries}
        src={src}
        alt="image result"
        className={`w-full max-w-md rounded-xl border border-white/10 shadow-lg object-cover ${loaded ? "" : "hidden"}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (tries < 4) {
            setTimeout(() => setTries((t) => t + 1), 4000 + tries * 3000);
          } else {
            setLoaded(true); // give up retrying; alt text dikhega
          }
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", content: WELCOME, timestamp: Date.now() }]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string>(genId());
  const [isMobile, setIsMobile] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [serverErrorBanner, setServerErrorBanner] = useState<string | null>(null);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentMessagesRef = useRef<Message[]>(messages);
  const currentChatIdRef = useRef<string>(currentChatId);
  const titlesRef = useRef<Record<string, string>>({});
  const titleRequestedRef = useRef<Set<string>>(new Set());

  currentMessagesRef.current = messages;
  currentChatIdRef.current = currentChatId;

  const userEmail = session?.user?.email?.toLowerCase();
  const role = (session?.user as any)?.role || "user";
  const isAdmin = role === "admin";

  // Helper for localStorage keys
  const getLocalKey = useCallback((email?: string) => {
    return email ? `bharat-ai:history:${email}` : null;
  }, []);

  // 1. Initial responsive check
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (m) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 2. Auto scroll to bottom
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // 3. Auto resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  // 4. Load history from server + fallback to localStorage merge
  const loadHistoryList = useCallback(async (email: string) => {
    setServerErrorBanner(null);
    let serverChats: Chat[] = [];
    let serverFailed = false;

    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chats)) {
          serverChats = data.chats;
        }
      } else {
        serverFailed = true;
        const errData = await res.json().catch(() => ({}));
        setServerErrorBanner(`History server se load nahi ho saki: ${errData.error || `HTTP ${res.status}`}`);
      }
    } catch (e: any) {
      serverFailed = true;
      setServerErrorBanner(`History load error: ${e.message || "Network issue"}`);
    }

    // Load local storage backup
    const localKey = getLocalKey(email);
    let localChats: Chat[] = [];
    if (localKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.chats)) localChats = parsed.chats;
        }
      } catch (e) {
        console.warn("Failed to parse local history cache:", e);
      }
    }

    // Merge: union by id with newest updatedAt
    const chatMap = new Map<string, Chat>();
    for (const c of localChats) {
      if (c?.id) chatMap.set(c.id, c);
    }
    for (const c of serverChats) {
      if (c?.id) {
        const existing = chatMap.get(c.id);
        if (!existing || (c.updatedAt || 0) >= (existing.updatedAt || 0)) {
          chatMap.set(c.id, c);
        }
      }
    }

    const mergedList = Array.from(chatMap.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    setChats(mergedList);

    if (serverFailed && localChats.length > 0) {
      setServerErrorBanner("Database connection temporarily unavailable — local backup se history load ki gayi hai.");
    }
  }, [getLocalKey]);

  useEffect(() => {
    if (status === "authenticated" && userEmail) {
      loadHistoryList(userEmail);
    }
  }, [status, userEmail, loadHistoryList]);

  // Fallback title until the smart (AI) title arrives: cleaned first message.
  const fallbackTitle = (msgs: Message[]) => {
    const raw = msgs.find((m) => m.role === "user")?.content || "";
    const clean = raw.replace(/\s+/g, " ").trim();
    if (!clean) return "Naya Chat";
    const base = clean.length > 44 ? clean.slice(0, 44).trimEnd() + "\u2026" : clean;
    const titled = base.charAt(0).toUpperCase() + base.slice(1);
    return msgs.some((m) => m.generatedImage) ? "\u{1F5BC} " + titled : titled;
  };

  // 5. IMMEDIATE Save with localStorage mirror + server sync + retry
  const saveChatImmediately = useCallback(
    async (msgs: Message[], chatId: string, retryCount = 0) => {
      if (!userEmail || msgs.length <= 1) return;
      const title = titlesRef.current[chatId] || fallbackTitle(msgs);
      const now = Date.now();

      // One-time smart title (ChatGPT-style) once the first exchange exists.
      if (
        !titlesRef.current[chatId] &&
        !titleRequestedRef.current.has(chatId) &&
        msgs.length >= 2
      ) {
        titleRequestedRef.current.add(chatId);
        const u = msgs.find((m) => m.role === "user")?.content || "";
        const a = msgs.find((m) => m.role === "bot")?.content || "";
        fetch("/api/chat-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: u, assistant: a }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.title) {
              titlesRef.current[chatId] = d.title;
              saveChatImmediately(msgs, chatId);
            }
          })
          .catch(() => {});
      }

      // Mirror to localStorage instantly
      const localKey = getLocalKey(userEmail);
      if (localKey && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(localKey);
          let localData: { chats: Chat[]; messagesByChat: Record<string, Message[]> } = saved
            ? JSON.parse(saved)
            : { chats: [], messagesByChat: {} };

          const filtered = (localData.chats || []).filter((c) => c.id !== chatId);
          const updatedChats = [{ id: chatId, title, updatedAt: now }, ...filtered].slice(0, 50);

          localData.chats = updatedChats;
          if (!localData.messagesByChat) localData.messagesByChat = {};
          localData.messagesByChat[chatId] = msgs;

          localStorage.setItem(localKey, JSON.stringify(localData));
          setChats(updatedChats);
        } catch (e) {
          console.warn("Local storage write failed:", e);
        }
      }

      // Sync to server via API
      try {
        const saveMsgs = msgs.map((m) => ({
          role: m.role,
          content: m.content,
          fileName: m.fileName,
          image: m.image && !m.image.startsWith("data:") ? m.image : undefined,
          generatedImage: m.generatedImage,
          extraImages: m.extraImages,
          imageSource: m.imageSource,
        }));

        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, title, messages: saveMsgs }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
      } catch (err: any) {
        console.error(`Save to server failed (attempt ${retryCount + 1}):`, err.message);
        if (retryCount === 0) {
          // Retry once after 2 seconds
          setTimeout(() => {
            saveChatImmediately(msgs, chatId, 1);
          }, 2000);
        } else {
          setServerErrorBanner(`History server me save nahi hui (${err.message}) — local backup me save kar liya gaya hai.`);
        }
      }
    },
    [userEmail, getLocalKey]
  );

  // 6. beforeunload flush with keepalive fetch
  useEffect(() => {
    const handleBeforeUnload = () => {
      const msgs = currentMessagesRef.current;
      const cId = currentChatIdRef.current;
      if (userEmail && msgs.length > 1) {
        const title = titlesRef.current[cId] || fallbackTitle(msgs);
        const payload = JSON.stringify({
          chatId: cId,
          title,
          messages: msgs.map((m) => ({
            role: m.role,
            content: m.content,
            fileName: m.fileName,
            generatedImage: m.generatedImage,
          extraImages: m.extraImages,
          imageSource: m.imageSource,
          })),
        });
        try {
          fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          });
        } catch (e) {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [userEmail]);

  // Start new chat (flushing any pending unsaved state)
  const newChat = () => {
    if (messages.length > 1) {
      saveChatImmediately(messages, currentChatId);
    }
    setCurrentChatId(genId());
    setMessages([{ role: "bot", content: WELCOME, timestamp: Date.now() }]);
    setHistory([]);
    setInput("");
    setAttachedFile(null);
    if (isMobile) setSidebarOpen(false);
  };

  // Load chat by id (server first, with local fallback)
  const loadChat = async (chatId: string) => {
    titleRequestedRef.current.add(chatId); // purani chats ke title na badlo
    try {
      const res = await fetch(`/api/history?chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length) {
          setMessages(data.messages);
          setHistory(
            data.messages.map((m: Message) => ({
              role: m.role === "bot" ? "assistant" : "user",
              content: m.content,
            }))
          );
          setCurrentChatId(chatId);
          if (isMobile) setSidebarOpen(false);
          return;
        }
      }
    } catch (e) {}

    // Fallback to local storage cache if server load fails or returned empty
    const localKey = getLocalKey(userEmail);
    if (localKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          const cachedMessages = parsed.messagesByChat?.[chatId];
          if (Array.isArray(cachedMessages) && cachedMessages.length) {
            setMessages(cachedMessages);
            setHistory(
              cachedMessages.map((m: Message) => ({
                role: m.role === "bot" ? "assistant" : "user",
                content: m.content,
              }))
            );
            setCurrentChatId(chatId);
          }
        }
      } catch (e) {}
    }
    if (isMobile) setSidebarOpen(false);
  };

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm("Kya aap sach me is chat ko delete karna chahte hain?")) return;

    // Delete locally
    const localKey = getLocalKey(userEmail);
    if (localKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.chats = (parsed.chats || []).filter((c: Chat) => c.id !== chatId);
          if (parsed.messagesByChat) delete parsed.messagesByChat[chatId];
          localStorage.setItem(localKey, JSON.stringify(parsed));
        }
      } catch (e) {}
    }

    setChats((prev) => prev.filter((c) => c.id !== chatId));

    // Delete on server
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
    } catch (e) {
      console.warn("Server delete call failed:", e);
    }

    if (currentChatId === chatId) newChat();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("Maximum 15MB file allow hai.");
      return;
    }
    try {
      const result = await readFile(file);
      setAttachedFile(result);
      setMode("analyze");
    } catch {
      alert("File read nahi ho saki.");
    }
    e.target.value = "";
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      const link = document.createElement("a");
      link.href = proxyUrl;
      link.download = `bharat-ai-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const handleSend = async (overridePrompt?: string, overrideMode?: Mode) => {
    const targetMsg = (overridePrompt ?? input).trim();
    const targetMode = overrideMode ?? mode;
    const file = attachedFile;

    if ((!targetMsg && !file) || isLoading) return;

    const newMsg: Message = {
      role: "user",
      content: targetMsg || `📎 ${file?.name}`,
      image: file?.type === "image" ? `data:${file.mime};base64,${file.data}` : undefined,
      fileName: file?.type === "pdf" || file?.type === "text" ? file.name : undefined,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setInput("");
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const body: any = {
        message: targetMsg,
        history,
        mode: targetMode,
      };

      if (file?.type === "image") {
        body.imageBase64 = `data:${file.mime};base64,${file.data}`;
      }
      if (file?.type === "pdf") {
        body.fileBase64 = file.data;
        body.fileMime = "application/pdf";
      }
      if (file?.type === "text") {
        try {
          body.fileBase64 = btoa(unescape(encodeURIComponent(file.data)));
        } catch {
          body.fileBase64 = btoa(file.data);
        }
        body.fileMime = "text/plain";
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || (!data.reply && !data.generatedImage)) {
        const errorContent = data?.reply || data?.error || `Server error (${res.status})`;
        const errorMsg: Message = {
          role: "bot",
          content: errorContent,
          isError: true,
          promptUsed: targetMsg,
          timestamp: Date.now(),
        };
        const finalMessages = [...newMessages, errorMsg];
        setMessages(finalMessages);
        saveChatImmediately(finalMessages, currentChatId);
        return;
      }

      const botMsg: Message = {
        role: "bot",
        content: data.reply || "",
        generatedImage: data.generatedImage,
        extraImages: data.extraImages,
        imageSource: data.imageSource,
        promptUsed: targetMsg,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);

      if (targetMode === "chat") {
        setHistory((prev) => [
          ...prev,
          { role: "user", content: targetMsg },
          { role: "assistant", content: data.reply },
        ]);
      }

      // SAVE IMMEDIATELY (no delay/debounce loss)
      saveChatImmediately(finalMessages, currentChatId);
    } catch (err: any) {
      const errorMsg: Message = {
        role: "bot",
        content: `Server se jawab nahi aaya — ${err.message || "Network issue"}`,
        isError: true,
        promptUsed: targetMsg,
        timestamp: Date.now(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      saveChatImmediately(finalMessages, currentChatId);
    } finally {
      setIsLoading(false);
    }
  };

  const modeConfig = {
    chat: {
      label: "Chat",
      icon: <Sparkles size={13} />,
      placeholder: "Bharat AI se kuch bhi poochho...",
    },
    imagine: {
      label: "Image Banao",
      icon: <ImageIcon size={13} />,
      placeholder: "Image describe karo — e.g. cute cat astronaut floating in space",
    },
    search_photo: {
      label: "Real Photo Dhundo",
      icon: <Search size={13} />,
      placeholder: "Real web photo search karein — e.g. Taj Mahal, Red Fort",
    },
    analyze: {
      label: "Analyze",
      icon: <FileText size={13} />,
      placeholder: "Document ya Image attach karein aur poochhein...",
    },
  };

  // Filtered chats based on search query
  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const groupChats = (list: Chat[]) => {
    const now = Date.now();
    const g: Record<string, Chat[]> = { Aaj: [], "Is Hafte": [], "Is Mahine": [], Purane: [] };
    list.forEach((c) => {
      const d = (now - c.updatedAt) / 86400000;
      if (d < 1) g["Aaj"].push(c);
      else if (d < 7) g["Is Hafte"].push(c);
      else if (d < 30) g["Is Mahine"].push(c);
      else g["Purane"].push(c);
    });
    return g;
  };

  const grouped = groupChats(filteredChats);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-white selection:bg-amber-500/30 selection:text-white relative">
      {/* Three Soft Ambient Orbs */}
      <div className="ambient-orbs">
        <div className="ambient-orb-saffron" />
        <div className="ambient-orb-green" />
        <div className="absolute top-[40%] right-[30%] w-[500px] height-[500px] bg-radial from-blue-500/5 to-transparent rounded-full blur-[70px] pointer-events-none" />
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
        />
      )}

      {/* SIDEBAR: True Liquid Glass with 1px top highlight */}
      <aside
        className={`w-64 flex-shrink-0 flex flex-col bg-[#0a0a0f]/85 border-r border-white/10 z-50 backdrop-blur-2xl transition-transform duration-200 ease-in-out ${
          isMobile ? "fixed inset-y-0 left-0 shadow-2xl" : "relative h-screen"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:overflow-hidden md:border-r-0"}`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex flex-col rounded-sm overflow-hidden w-5 h-3.5 border border-white/20">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full border border-[#000080]" />
                </div>
                <div className="flex-1 bg-[#138808]" />
              </div>
              <span className="font-bold text-sm tricolour-text group-hover:opacity-90">Bharat AI</span>
            </Link>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-white/40 hover:text-white rounded"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <button
            onClick={newChat}
            className="w-full py-2 px-3 rounded-xl btn-primary text-xs !shadow-sm flex items-center justify-center gap-2"
          >
            <PenSquare size={14} />
            <span>Naya Chat</span>
          </button>

          {/* Search Chats Input */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-white/30" />
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:border-[#FF9933]/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Chats Timeline List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs scrollbar-none">
          {filteredChats.length === 0 ? (
            <div className="text-center text-white/30 py-12 px-4">
              <MessageSquare size={22} className="mx-auto mb-2 opacity-30" />
              <span>{chats.length === 0 ? "Abhi koi chat nahi" : "Koi match nahi mila"}</span>
            </div>
          ) : (
            Object.entries(grouped).map(([group, list]) =>
              list.length === 0 ? null : (
                <div key={group} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                    {group}
                  </div>
                  {list.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                        currentChatId === chat.id
                          ? "bg-gradient-to-r from-[#FF9933]/15 to-[#FF9933]/5 text-[#FF9933] border border-[#FF9933]/30 shadow-xs"
                          : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="truncate flex-1 text-xs">{chat.title}</span>
                      <button
                        onClick={(e) => deleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>

        {/* Sidebar Footer User Card with Role Badge & Admin Link */}
        {session?.user && (
          <div className="p-3 border-t border-white/10 bg-white/[0.02] flex flex-col gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Shield size={13} />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <div className="flex items-center gap-2.5">
              {session.user.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={session.user.image}
                  className="w-8 h-8 rounded-full border border-white/20 object-cover flex-shrink-0"
                  alt="avatar"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] text-black font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {(session.user.name || session.user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white/90 truncate flex items-center gap-1.5">
                  <span className="truncate">{session.user.name || "User"}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      isAdmin
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-white/10 text-white/50 border border-white/10"
                    }`}
                  >
                    {isAdmin ? "ADMIN" : "USER"}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 truncate">{session.user.email}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign out"
                className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Chat Top Bar */}
        <header className="sticky top-0 z-30 glass-header px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tricolour-text">Bharat AI</span>
              <span className="text-xs text-white/30 hidden sm:inline">|</span>
              <span className="text-xs text-white/40 hidden sm:inline">All-in-One AI Assistant</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Role badge in header */}
            {session?.user && (
              <span
                className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-white/10 text-white/50 border border-white/10"
                }`}
              >
                {isAdmin ? "ADMIN" : "USER"}
              </span>
            )}

            {/* Admin button if admin */}
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-all shadow-xs"
              >
                <Shield size={13} />
                Admin
              </Link>
            )}

            <Link
              href="/"
              className="hidden sm:inline-flex text-xs text-white/40 hover:text-white transition-colors"
            >
              Landing
            </Link>

            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-[10px]">ONLINE</span>
            </div>
          </div>
        </header>

        {/* Server Database Alert Banner */}
        {serverErrorBanner && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0 text-amber-400" />
              <span>{serverErrorBanner}</span>
            </div>
            <button
              onClick={() => setServerErrorBanner(null)}
              className="text-white/40 hover:text-white text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Empty State Welcome Card with Suggestions */}
            {messages.length === 1 && messages[0].content === WELCOME && (
              <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 text-center my-6 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF9933] to-[#138808] text-white text-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  🇮🇳
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                  Namaste, {session?.user?.name || "Friend"}!
                </h2>
                <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto mb-6 leading-relaxed">
                  Main Bharat AI hoon — aapka smart desi assistant. Niche diye gaye topics par click karke turant shuru karein:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMode(s.mode);
                        handleSend(s.text, s.mode);
                      }}
                      className="glass p-3 rounded-2xl hover:border-[#FF9933]/40 hover:bg-white/[0.06] transition-all flex items-center gap-3 group text-xs text-white/80"
                    >
                      <span className="text-lg flex-shrink-0">{s.icon}</span>
                      <span className="font-medium group-hover:text-white transition-colors">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn group`}
              >
                {m.role === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] flex items-center justify-center text-xs flex-shrink-0 mr-3 mt-1 shadow-md">
                    🇮🇳
                  </div>
                )}

                <div className="max-w-[85%] sm:max-w-[78%]">
                  {/* Uploaded User Attachment */}
                  {m.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.image}
                      alt="upload"
                      className="max-w-[220px] rounded-xl mb-2 ml-auto border border-white/20 shadow-md"
                    />
                  )}

                  {m.fileName && (
                    <div className="flex items-center gap-2 bg-[#FF9933]/10 border border-[#FF9933]/30 rounded-xl px-3 py-1.5 mb-2 ml-auto w-fit text-xs text-[#FF9933]">
                      <FileText size={14} />
                      <span className="truncate max-w-[200px]">{m.fileName}</span>
                    </div>
                  )}

                  {/* Message Bubble: Soft saffron gradient for user, true glass with inner highlight for bot */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed relative ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-[#FF9933] to-[#e8851a] text-black font-medium rounded-tr-xs shadow-[0_6px_20px_rgba(255,153,51,0.25)]"
                        : m.isError
                        ? "glass border border-red-500/40 text-red-300 rounded-tl-xs shadow-md"
                        : "glass text-white/90 rounded-tl-xs border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                    }`}
                  >
                    {m.role === "bot" ? (
                      <div className="prose prose-invert max-w-none text-sm break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}

                    {/* Bot Message Action Row (Copy + Retry on error) */}
                    {m.role === "bot" && (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                        <span>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(m.content, i)}
                            className="p-1 hover:text-white rounded hover:bg-white/5 transition-colors flex items-center gap-1"
                            title="Copy reply"
                          >
                            {copiedIndex === i ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {m.isError && m.promptUsed && (
                            <button
                              onClick={() => handleSend(m.promptUsed)}
                              className="p-1 text-[#FF9933] hover:text-white rounded hover:bg-white/5 transition-colors flex items-center gap-1 font-semibold"
                            >
                              <RotateCcw size={12} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generated Image Result Card: nologo URL, Action row (Download, Open, Regenerate) */}
                  {m.generatedImage && (
                    <div className="mt-3 p-3 rounded-2xl glass-card border border-white/10 space-y-2.5">
                      <GeneratedImage src={m.generatedImage} />
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1">
                        <span className="text-[11px] text-white/40">{m.imageSource === "real" ? "Real photo • Google Search" : "AI Generated Image"}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownload(m.generatedImage!)}
                            className="btn-ghost !py-1 !px-2.5 text-xs flex items-center gap-1"
                            title="Download file"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                          <a
                            href={m.generatedImage}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost !py-1 !px-2.5 text-xs flex items-center gap-1"
                            title="Open full size in new tab"
                          >
                            <ExternalLink size={13} />
                            <span>Open</span>
                          </a>
                          {m.promptUsed && (
                            <button
                              onClick={() => handleSend(m.promptUsed, "imagine")}
                              className="btn-ghost !py-1 !px-2.5 text-xs flex items-center gap-1"
                              title="Regenerate with same prompt"
                            >
                              <RotateCcw size={13} />
                              <span>Regen</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {m.extraImages && m.extraImages.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {m.extraImages.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" title="Open full size">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={u}
                            alt="aur photo"
                            className="w-24 h-24 object-cover rounded-lg border border-white/10"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Loading Skeleton */}
            {isLoading && (
              <div className="flex items-center gap-3 animate-fadeIn">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] flex items-center justify-center text-xs shadow-md">
                  🇮🇳
                </div>
                <div className="glass px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-2 border border-white/10">
                  {mode === "imagine" ? (
                    <div className="flex items-center gap-2 text-xs text-[#FF9933]">
                      <Sparkles size={14} className="animate-spin" />
                      <span>Image ban rahi hai...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#FF9933] animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-[#138808] animate-bounce [animation-delay:0.3s]" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FLOATING GLASS COMPOSER */}
        <div className="p-3 sm:p-5 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent relative z-20">
          <div className="max-w-3xl mx-auto">
            {/* Mode Selector Tabs */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2.5 overflow-x-auto py-1 scrollbar-none">
              {(Object.keys(modeConfig) as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    mode === m
                      ? "bg-gradient-to-r from-[#FF9933]/25 to-[#FF9933]/10 text-[#FF9933] border border-[#FF9933]/40 shadow-xs"
                      : "bg-white/5 text-white/50 hover:text-white border border-white/5"
                  }`}
                >
                  {modeConfig[m].icon}
                  {modeConfig[m].label}
                </button>
              ))}
            </div>

            {/* Attached file chip */}
            {attachedFile && (
              <div className="mb-2 inline-flex items-center gap-2 p-1.5 pr-3 bg-[#FF9933]/10 border border-[#FF9933]/30 rounded-xl text-xs text-[#FF9933]">
                {attachedFile.type === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`data:${attachedFile.mime};base64,${attachedFile.data}`}
                    className="w-7 h-7 rounded-lg object-cover"
                    alt="attachment"
                  />
                ) : (
                  <FileText size={16} />
                )}
                <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="text-white/40 hover:text-red-400 ml-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Composer Card */}
            <div className="glass-card rounded-2xl p-2 sm:p-2.5 flex items-end gap-2 border border-white/10 shadow-2xl focus-within:border-[#FF9933]/50 transition-colors">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Image, PDF or Text file"
                className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors flex-shrink-0"
              >
                <Plus size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.csv,.json"
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={modeConfig[mode].placeholder}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/30 resize-none py-1.5 px-1 max-h-36 scrollbar-none"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && !attachedFile)}
                className="btn-primary !p-2.5 !rounded-xl flex-shrink-0 disabled:opacity-20 transition-all"
                aria-label="Send Message"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="text-center mt-2.5">
              <span className="text-[10px] text-white/30">
                Bharat AI by Himanshu Ranjan &nbsp;|&nbsp; Multilingual &amp; Multimodal Assistant
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
