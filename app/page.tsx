"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { Send, Plus, X, Sparkles, ImageIcon, FileText, Trash2, MessageSquare, LogOut, Menu, PenSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "bot"; content: string; image?: string; generatedImage?: string };
type Mode = "chat" | "imagine" | "analyze";
type Chat = { id: string; title: string; updatedAt: number };

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const WELCOME = "Namaste! 🙏 Kya poochna hai aaj?";

export default function Home() {
  const { data: session, status } = useSession();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", content: WELCOME }]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>(genId());
  const [isMobile, setIsMobile] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeout = useRef<any>(null);
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto scroll to bottom
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

  // Load history only once when authenticated
  useEffect(() => {
    if (status === "authenticated" && !historyLoadedRef.current) {
      historyLoadedRef.current = true;
      fetch("/api/history")
        .then(r => r.json())
        .then(d => { if (Array.isArray(d.chats)) setChats(d.chats); })
        .catch(e => console.error("History load failed:", e));
    }
  }, [status]);

  const saveChat = useCallback(async (msgs: Message[], chatId: string) => {
    if (status !== "authenticated" || msgs.length <= 1) return;
    const title = msgs.find(m => m.role === "user")?.content?.slice(0, 40) || "Naya Chat";
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title, messages: msgs }),
      });
      setChats(prev => {
        const filtered = prev.filter(c => c.id !== chatId);
        return [{ id: chatId, title, updatedAt: Date.now() }, ...filtered].slice(0, 50);
      });
    } catch (e) { console.error("Save failed:", e); }
  }, [status]);

  const loadChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/history?chatId=${chatId}`);
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length) {
        setMessages(data.messages);
        setHistory(data.messages.map((m: Message) => ({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.content
        })));
        setCurrentChatId(chatId);
      }
      if (isMobile) setSidebarOpen(false);
    } catch (e) { console.error("Load chat failed:", e); }
  };

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId })
      });
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (currentChatId === chatId) newChat();
    } catch (e) { console.error("Delete failed:", e); }
  };

  const newChat = () => {
    setCurrentChatId(genId());
    setMessages([{ role: "bot", content: WELCOME }]);
    setHistory([]);
    setInput("");
    setSelectedImage(null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    const userMsg = input.trim();
    const userImg = selectedImage;
    const currentMode = mode;
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg, image: userImg || undefined }];
    setMessages(newMessages);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, imageBase64: userImg, history, mode: currentMode === "imagine" ? "imagine" : undefined }),
      });
      const data = await res.json();
      const botMsg: Message = { role: "bot", content: data.reply, generatedImage: data.generatedImage };
      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);
      if (currentMode === "chat") {
        setHistory(prev => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: data.reply }]);
      }
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => saveChat(finalMessages, currentChatId), 1200);
    } catch {
      setMessages(prev => [...prev, { role: "bot", content: "Network check karo bhai! 🙏" }]);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  const modeConfig = {
    chat: { label: "Chat", icon: <Sparkles size={13} />, placeholder: "Bharat AI se kuch bhi poochho..." },
    imagine: { label: "Image Banao", icon: <ImageIcon size={13} />, placeholder: "Image describe karo — e.g. sunset over Taj Mahal" },
    analyze: { label: "Analyze", icon: <FileText size={13} />, placeholder: "Document ya image upload karo aur poochho..." },
  };

  const groupChats = (chats: Chat[]) => {
    const now = Date.now();
    const groups: Record<string, Chat[]> = { "Aaj": [], "Is Hafte": [], "Is Mahine": [], "Purane": [] };
    chats.forEach(c => {
      const diff = (now - c.updatedAt) / 86400000;
      if (diff < 1) groups["Aaj"].push(c);
      else if (diff < 7) groups["Is Hafte"].push(c);
      else if (diff < 30) groups["Is Mahine"].push(c);
      else groups["Purane"].push(c);
    });
    return groups;
  };
  const grouped = groupChats(chats);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#fff" }}>

      {sidebarOpen && isMobile && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} />}

      {/* SIDEBAR */}
      <div style={{ width: "255px", flexShrink: 0, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", borderRight: "1px solid rgba(255,255,255,0.06)", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", position: isMobile ? "fixed" : "relative", height: "100vh", zIndex: 45 }}>
        <div style={{ padding: "14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", borderRadius: "3px", overflow: "hidden", width: "20px", height: "14px" }}>
                <div style={{ flex: 1, background: "#FF9933" }} /><div style={{ flex: 1, background: "#fff" }} /><div style={{ flex: 1, background: "#138808" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: "15px", background: "linear-gradient(90deg,#FF9933,#fff 50%,#138808)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Bharat AI</span>
            </div>
            {isMobile && <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><X size={16} /></button>}
          </div>
          <button onClick={newChat} style={{ width: "100%", padding: "8px 12px", borderRadius: "10px", cursor: "pointer", background: "rgba(255,153,51,0.08)", border: "1px solid rgba(255,153,51,0.2)", color: "#FF9933", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "7px" }}>
            <PenSquare size={14} /> Naya Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", scrollbarWidth: "none" }}>
          {chats.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: "12px", padding: "32px 12px" }}>
              <MessageSquare size={22} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
              Abhi koi chat nahi
            </div>
          ) : (
            Object.entries(grouped).map(([group, groupChats]) =>
              groupChats.length === 0 ? null : (
                <div key={group}>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 6px 4px" }}>{group}</div>
                  {groupChats.map(chat => (
                    <div key={chat.id} onClick={() => loadChat(chat.id)} className="chat-item"
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 8px", borderRadius: "8px", cursor: "pointer", marginBottom: "1px", background: currentChatId === chat.id ? "rgba(255,153,51,0.08)" : "transparent", border: currentChatId === chat.id ? "1px solid rgba(255,153,51,0.18)" : "1px solid transparent", transition: "all 0.15s" }}>
                      <span style={{ fontSize: "12.5px", color: currentChatId === chat.id ? "#FF9933" : "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{chat.title}</span>
                      <button onClick={e => deleteChat(e, chat.id)} className="delete-btn" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "2px", flexShrink: 0, opacity: 0, transition: "opacity 0.15s" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>

        {session?.user && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "9px" }}>
            {session.user.image && <img src={session.user.image} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)" }} alt="avatar" />}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.name}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ff4444"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.22)"}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.22)", padding: "4px", borderRadius: "6px", transition: "color 0.15s" }}>
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* MAIN — flex column, fixed height */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", position: "relative", background: "linear-gradient(135deg,#0a0a0f 0%,#0d0a1a 50%,#0a0f0a 100%)" }}>
        <div style={{ position: "absolute", top: "-20%", left: "10%", width: "500px", height: "500px", background: "radial-gradient(circle,rgba(255,153,51,0.05) 0%,transparent 70%)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "5%", width: "400px", height: "400px", background: "radial-gradient(circle,rgba(19,136,8,0.05) 0%,transparent 70%)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none", zIndex: 0 }} />

        {/* Header — fixed at top */}
        <header style={{ flexShrink: 0, padding: "11px 18px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", zIndex: 30 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#fff"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex", transition: "color 0.15s" }}>
            <Menu size={19} />
          </button>
          <div style={{ fontSize: "15px", fontWeight: 700, background: "linear-gradient(90deg,#FF9933,#fff 50%,#138808)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Bharat AI</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "4px 9px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>ONLINE</span>
          </div>
        </header>

        {/* Chat area — scrollable, takes remaining space */}
        <div ref={chatAreaRef} style={{ flex: 1, overflowY: "auto", padding: "24px 16px 20px", scrollbarWidth: "none", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "18px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
                {m.role === "bot" && <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#FF9933,#138808)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", marginRight: "8px", marginTop: "3px", boxShadow: "0 0 8px rgba(255,153,51,0.2)" }}>🇮🇳</div>}
                <div style={{ maxWidth: "78%" }}>
                  {m.image && <img src={m.image} alt="upload" style={{ width: "160px", borderRadius: "12px", marginBottom: "5px", display: "block", marginLeft: "auto" }} />}
                  <div style={{ padding: "11px 15px", borderRadius: m.role === "user" ? "16px 16px 3px 16px" : "16px 16px 16px 3px", background: m.role === "user" ? "linear-gradient(135deg,#FF9933,#e8851a)" : "rgba(255,255,255,0.04)", border: m.role === "bot" ? "1px solid rgba(255,255,255,0.06)" : "none", color: m.role === "user" ? "#000" : "rgba(255,255,255,0.87)", fontSize: "14px", lineHeight: "1.65", fontWeight: m.role === "user" ? 600 : 400, backdropFilter: m.role === "bot" ? "blur(10px)" : "none" }}>
                    {m.role === "bot" ? <div className="prose prose-invert max-w-none" style={{ fontSize: "14px" }}><ReactMarkdown>{m.content}</ReactMarkdown></div> : <span>{m.content}</span>}
                  </div>
                  {m.generatedImage && (
                    <div style={{ marginTop: "8px" }}>
                      <img src={m.generatedImage} alt="generated" style={{ width: "100%", maxWidth: "400px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }} />
                      <a href={m.generatedImage} download="bharat-ai.jpg" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "5px", padding: "4px 10px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)", fontSize: "11px", textDecoration: "none" }}>⬇️ Download</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#FF9933,#138808)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>🇮🇳</div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i===0?"#FF9933":i===1?"#fff":"#138808", animation: `bounce 0.9s ease ${i*0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={scrollRef} style={{ height: "1px" }} />
          </div>
        </div>

        {/* Input — fixed at bottom, never overlaps chat */}
        <div style={{ flexShrink: 0, padding: "10px 16px 16px", background: "linear-gradient(to top,#0a0a0f 80%,transparent)", zIndex: 10 }}>
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "7px", justifyContent: "center" }}>
              {(Object.keys(modeConfig) as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 11px", borderRadius: "16px", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: mode===m?"rgba(255,153,51,0.1)":"rgba(255,255,255,0.03)", border: mode===m?"1px solid rgba(255,153,51,0.3)":"1px solid rgba(255,255,255,0.06)", color: mode===m?"#FF9933":"rgba(255,255,255,0.28)" }}>
                  {modeConfig[m].icon}{modeConfig[m].label}
                </button>
              ))}
            </div>
            {selectedImage && (
              <div style={{ marginBottom: "7px", display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
                <img src={selectedImage} style={{ width: "36px", height: "36px", borderRadius: "5px", objectFit: "cover" }} alt="preview" />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Image ready</span>
                <button onClick={() => setSelectedImage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff3b30", fontSize: "14px", lineHeight: 1 }}>×</button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "7px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "7px 7px 7px 13px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", backdropFilter: "blur(20px)" }}>
              <button onClick={() => { setMode("analyze"); fileInputRef.current?.click(); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", padding: "6px", cursor: "pointer", color: "rgba(255,255,255,0.3)", flexShrink: 0, display: "flex" }}>
                <Plus size={15} />
              </button>
              <input type="file" ref={fileInputRef} onChange={e => { const f=e.target.files?.[0]; if(f){const r=new FileReader();r.onloadend=()=>setSelectedImage(r.result as string);r.readAsDataURL(f);}}} style={{ display: "none" }} accept="image/*" />
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder={modeConfig[mode].placeholder} rows={1}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.87)", fontSize: "14px", lineHeight: "1.5", resize: "none", fontFamily: "inherit", padding: "4px 0" }} />
              <button onClick={handleSend} disabled={isLoading} style={{ background: input.trim()||selectedImage?"linear-gradient(135deg,#FF9933,#e8851a)":"rgba(255,255,255,0.04)", border: "none", borderRadius: "9px", padding: "8px 12px", cursor: input.trim()||selectedImage?"pointer":"default", color: input.trim()||selectedImage?"#000":"rgba(255,255,255,0.12)", flexShrink: 0, display: "flex", transition: "all 0.15s" }}>
                <Send size={15} />
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: "6px" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.09)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Developed by Himanshu Ranjan</p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        ::-webkit-scrollbar{display:none}
        .chat-item:hover{background:rgba(255,255,255,0.04) !important}
        .chat-item:hover .delete-btn{opacity:1 !important}
        .prose p{margin:0.3em 0}.prose ul,.prose ol{margin:0.3em 0;padding-left:1.2em}
        .prose code{background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:3px;font-size:12px}
        .prose pre{background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;overflow-x:auto}
        .prose strong{color:#FF9933}.prose a{color:#60a5fa}
        textarea::placeholder{color:rgba(255,255,255,0.17)}
      `}</style>
    </div>
  );
}
