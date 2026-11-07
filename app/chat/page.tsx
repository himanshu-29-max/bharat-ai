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
  ChevronRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "bot";
  content: string;
  image?: string;
  fileName?: string;
  generatedImage?: string;
};

type Mode = "chat" | "imagine" | "search_photo" | "analyze";
type Chat = { id: string; title: string; updatedAt: number };
type AttachedFile = { type: "image" | "pdf" | "text"; data: string; name: string; mime: string };

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const WELCOME = "Namaste! 🙏 Main Bharat AI hoon. Aaj kya poochhna ya banana chahte hain?";

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

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", content: WELCOME }]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>(genId());
  const [isMobile, setIsMobile] = useState(false);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeout = useRef<any>(null);
  const prevStatusRef = useRef<string>("");

  const isAdmin = (session?.user as any)?.role === "admin";

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

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (status === "authenticated" && prevStatusRef.current !== "authenticated") {
      prevStatusRef.current = "authenticated";
      fetch("/api/history")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.chats)) setChats(d.chats);
        })
        .catch(console.error);
    }
    if (status !== "authenticated") prevStatusRef.current = status;
  }, [status]);

  const saveChat = useCallback(
    async (msgs: Message[], chatId: string) => {
      if (status !== "authenticated" || msgs.length <= 1) return;
      const title = msgs.find((m) => m.role === "user")?.content?.slice(0, 40) || "Naya Chat";
      try {
        const saveMsgs = msgs.map((m) => ({
          role: m.role,
          content: m.content,
          fileName: m.fileName,
          image: m.image,
          generatedImage: m.generatedImage,
        }));
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, title, messages: saveMsgs }),
        });
        setChats((prev) =>
          [{ id: chatId, title, updatedAt: Date.now() }, ...prev.filter((c) => c.id !== chatId)].slice(0, 50)
        );
      } catch (e) {
        console.error("Save failed:", e);
      }
    },
    [status]
  );

  const newChat = () => {
    setCurrentChatId(genId());
    setMessages([{ role: "bot", content: WELCOME }]);
    setHistory([]);
    setInput("");
    setAttachedFile(null);
    if (isMobile) setSidebarOpen(false);
  };

  const loadChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/history?chatId=${chatId}`);
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
      }
      if (isMobile) setSidebarOpen(false);
    } catch (e) {
      console.error("Load failed:", e);
    }
  };

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
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
      alert("File padhi nahi ja saki.");
    }
    e.target.value = "";
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      // Use proxy for clean cross-origin download
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

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;
    const userMsg = input.trim();
    const file = attachedFile;
    const currentMode = mode;

    const newMsg: Message = {
      role: "user",
      content: userMsg || `📎 ${file?.name}`,
      image: file?.type === "image" ? `data:${file.mime};base64,${file.data}` : undefined,
      fileName: file?.type === "pdf" || file?.type === "text" ? file.name : undefined,
    };

    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const body: any = {
        message: userMsg,
        history,
        mode: currentMode,
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
        const errorMsg: Message = { role: "bot", content: errorContent };
        setMessages([...newMessages, errorMsg]);
        // Do NOT clear user input on failure so they can retry
        return;
      }

      // Success: Clear input and attached file
      setInput("");
      setAttachedFile(null);

      const botMsg: Message = {
        role: "bot",
        content: data.reply || "",
        generatedImage: data.generatedImage,
      };

      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);

      if (currentMode === "chat") {
        setHistory((prev) => [
          ...prev,
          { role: "user", content: userMsg },
          { role: "assistant", content: data.reply },
        ]);
      }

      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => saveChat(finalMessages, currentChatId), 1500);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `Server se jawab nahi aaya — ${err.message || "Network issue"}` },
      ]);
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
      placeholder: "Image describe karo — e.g. cute cat astronaut in space",
    },
    search_photo: {
      label: "Real Photo Dhundo",
      icon: <Search size={13} />,
      placeholder: "Web photo search karo — e.g. Taj Mahal, Red Fort Delhi",
    },
    analyze: {
      label: "Analyze",
      icon: <FileText size={13} />,
      placeholder: "File upload karein aur uske baare me poochhein...",
    },
  };

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

  const grouped = groupChats(chats);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-white selection:bg-amber-500/30 selection:text-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-64 flex-shrink-0 flex flex-col bg-[#0a0a0f]/95 border-r border-white/10 z-50 transition-transform duration-200 ease-in-out ${
          isMobile ? "fixed inset-y-0 left-0" : "relative h-screen"
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

          <button
            onClick={newChat}
            className="w-full py-2 px-3 rounded-xl bg-[#FF9933]/10 border border-[#FF9933]/30 text-[#FF9933] hover:bg-[#FF9933]/20 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <PenSquare size={14} />
            <span>Naya Chat</span>
          </button>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs scrollbar-none">
          {chats.length === 0 ? (
            <div className="text-center text-white/30 py-12 px-4">
              <MessageSquare size={22} className="mx-auto mb-2 opacity-30" />
              <span>Abhi koi chat nahi</span>
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
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        currentChatId === chat.id
                          ? "bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/25"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
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

        {/* Sidebar Footer User Info */}
        {session?.user && (
          <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center gap-2.5">
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
              <div className="text-xs font-semibold text-white/90 truncate flex items-center gap-1">
                <span>{session.user.name || "User"}</span>
                {isAdmin && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                    ADMIN
                  </span>
                )}
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
        )}
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Ambient background */}
        <div className="ambient-orbs">
          <div className="ambient-orb-saffron" />
          <div className="ambient-orb-green" />
        </div>

        {/* Chat Header */}
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
              <span className="text-xs text-white/40 hidden sm:inline">India Ka AI Assistant</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
              >
                <Shield size={12} />
                Admin
              </Link>
            )}

            <Link
              href="/"
              className="hidden sm:inline-flex text-xs text-white/40 hover:text-white transition-colors"
            >
              Landing Page
            </Link>

            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span>ONLINE</span>
            </div>
          </div>
        </header>

        {/* Messages Scroll Area */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none relative z-10">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                {m.role === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] flex items-center justify-center text-xs flex-shrink-0 mr-3 mt-1 shadow-md">
                    🇮🇳
                  </div>
                )}
                <div className="max-w-[85%] sm:max-w-[78%]">
                  {/* Uploaded User Image */}
                  {m.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.image}
                      alt="upload"
                      className="max-w-[220px] rounded-xl mb-2 ml-auto border border-white/20"
                    />
                  )}

                  {/* Uploaded Document Badge */}
                  {m.fileName && (
                    <div className="flex items-center gap-2 bg-[#FF9933]/10 border border-[#FF9933]/30 rounded-xl px-3 py-1.5 mb-2 ml-auto w-fit text-xs text-[#FF9933]">
                      <FileText size={14} />
                      <span className="truncate max-w-[200px]">{m.fileName}</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-[#FF9933] to-[#e8851a] text-black font-medium rounded-tr-xs shadow-md"
                        : "glass text-white/90 rounded-tl-xs border border-white/10"
                    }`}
                  >
                    {m.role === "bot" ? (
                      <div className="prose prose-invert max-w-none text-sm break-words">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>

                  {/* Generated Image Result Card */}
                  {m.generatedImage && (
                    <div className="mt-3 p-2 rounded-2xl glass border border-white/10 space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.generatedImage}
                        alt="generated result"
                        className="w-full max-w-md rounded-xl border border-white/10 shadow-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).alt = "Image load error";
                        }}
                      />
                      <div className="flex items-center justify-between pt-1 px-1">
                        <span className="text-[11px] text-white/40">Generated via Pollinations Flux</span>
                        <button
                          onClick={() => handleDownload(m.generatedImage!)}
                          className="btn-ghost !py-1 !px-3 text-xs flex items-center gap-1.5"
                        >
                          <Download size={13} />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Loading Skeleton */}
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] flex items-center justify-center text-xs shadow-md">
                  🇮🇳
                </div>
                <div className="glass px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#FF9933] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-[#138808] animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar Area */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent relative z-20">
          <div className="max-w-3xl mx-auto">
            {/* Mode Selector Tabs */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2.5 overflow-x-auto py-1 scrollbar-none">
              {(Object.keys(modeConfig) as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    mode === m
                      ? "bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/40 shadow-xs"
                      : "bg-white/5 text-white/40 hover:text-white border border-white/5"
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

            {/* Input Box */}
            <div className="glass rounded-2xl p-2 sm:p-2.5 flex items-end gap-2 border border-white/10 shadow-xl focus-within:border-[#FF9933]/50 transition-colors">
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
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/30 resize-none py-1.5 px-1 max-h-32"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !attachedFile)}
                className="btn-primary !p-2 sm:!p-2.5 !rounded-xl flex-shrink-0 disabled:opacity-20"
                aria-label="Send Message"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="text-center mt-2">
              <span className="text-[10px] text-white/30">
                Bharat AI by Himanshu Ranjan (Sandip University) &nbsp;|&nbsp; Multilingual &amp; Multimodal
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
