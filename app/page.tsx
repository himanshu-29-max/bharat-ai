"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Loader2, Sparkles } from "lucide-react";

export default function BharatAI() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Layout Shift rokne ke liye auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Bhai, server mein lafda hai. Net check karo!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#050505] text-zinc-100 font-sans">
      {/* Header Section */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0a0a0a] sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Bharat AI</h1>
        </div>
        <div className="text-[10px] text-zinc-500 text-right">
          By Himanshu Ranjan <br />
          <span className="text-green-500">● Live 2026</span>
        </div>
      </header>

      {/* Chat History Section */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
        style={{ scrollbarGutter: "stable" }} // Layout Shift Fix
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Bot size={48} className="text-zinc-700" />
            <p className="text-sm">Namaste! Main Bharat AI hoon.<br/>Aaj market ya cricket ke baare mein kya janna hai?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            } animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {/* Avatar with Discernible Identity */}
            <div className={`flex-shrink-0 p-2 rounded-xl ${
              msg.role === "user" ? "bg-blue-600" : "bg-zinc-800 border border-zinc-700"
            }`}>
              {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
            </div>

            {/* Message Bubble */}
            <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${
              msg.role === "user" 
                ? "bg-blue-700 text-white rounded-tr-none" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
            }`}>
              <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700">
              <Loader2 size={18} className="animate-spin text-zinc-500" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-tl-none">
              <span className="text-xs text-zinc-500 italic">Bharat AI update dhoondh raha hai...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Accessibility Fixed */}
      <footer className="p-4 bg-[#0a0a0a] border-t border-zinc-800 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 focus-within:ring-1 ring-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nifty ya IPL ka haal pucho..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm placeholder:text-zinc-600"
            aria-label="Chat input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="Send message" // Accessibility Fix
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:active:scale-100"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </main>
  );
}
