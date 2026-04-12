"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Loader2, Sparkles } from "lucide-react";

export default function BharatAI() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Layout Shift rokne aur smooth scrolling ke liye
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
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Bhai, connectivity issue hai." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0a0a0a] z-20">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-500" />
          <h1 className="font-bold text-base tracking-tight">Bharat AI</h1>
        </div>
        <div className="text-[10px] text-zinc-500 text-right leading-tight">
          By Himanshu Ranjan <br/> 
          <span className="text-green-500">● Live 2026</span>
        </div>
      </header>

      {/* Chat History */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050505]"
        style={{ scrollbarGutter: "stable" }}
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
            <Bot size={40} className="mb-2" />
            <p className="text-xs">Namaste! Main Bharat AI hoon.<br/>Kya help kar sakta hoon?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-1 duration-200`}
          >
            <div className={`flex-shrink-0 p-1.5 rounded-lg ${msg.role === "user" ? "bg-blue-600" : "bg-zinc-800 border border-zinc-700"}`}>
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === "user" 
                ? "bg-blue-700 text-white rounded-tr-none" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-800 rounded-lg border border-zinc-700">
              <Loader2 size={14} className="animate-spin text-zinc-500" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-2xl rounded-tl-none text-[11px] text-zinc-500 italic">
              Bharat AI soch raha hai...
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <footer className="p-4 bg-[#0a0a0a] border-t border-zinc-800">
        <div className="max-w-2xl mx-auto flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 focus-within:ring-1 ring-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nifty ya IPL ka haal pucho..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm placeholder:text-zinc-600"
            aria-label="Message input"
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            aria-label="Send"
            className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-20"
          >
            <Send size={16} />
          </button>
        </div>
      </footer>
    </main>
  );
}
