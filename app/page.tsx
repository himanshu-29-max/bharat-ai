"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, UserCircle, Menu, Sparkles, ImageIcon, Globe, Zap, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { 
      role: 'bot', 
      content: 'Namaste! Main **Bharat AI** hoon. Bataiye main aapki kya sewa kar sakta hoon?' 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", content: "⚠️ **Seva mein badha:** Bhai, net check karo!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/40">
      
      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_50%_0%,#121212_0%,#050505_100%)]">
        
        {/* HEADER */}
        <header className="p-5 flex justify-between items-center border-b border-white/5 backdrop-blur-3xl sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 shadow-inner group">
                <TirangaIcon />
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/60">Omniverse V28</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-1.5 rounded-xl border border-orange-500/20">
                <ShieldCheck size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest italic">Verified Pro</span>
             </div>
             <UserCircle size={35} className="text-white/10 hover:text-white transition-all cursor-pointer" />
          </div>
        </header>

        {/* CHAT MESSAGES */}
        <div className="flex-1 overflow-y-auto px-4 md:px-[25%] space-y-12 py-12 scrollbar-hide pb-60">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[90%] p-8 rounded-[2.5rem] shadow-2xl ${
                m.role === 'user' 
                ? 'bg-white text-black font-extrabold' 
                : 'bg-[#0c0c0c] border border-white/10 backdrop-blur-xl'
              }`}>
                <div className={`prose prose-invert max-w-none text-[16.5px] leading-relaxed ${m.role === 'user' ? 'text-black' : 'text-white/95'}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-4 ml-8">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce shadow-[0_0_8px_#f97316]"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[10px] font-black tracking-[0.6em] text-white/30 uppercase italic">Bharat AI Searching...</span>
            </div>
          )}
          <div ref={scrollRef} className="h-10" />
        </div>

        {/* INPUT BOX + DEVELOPER NAME (FIXED) */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent flex flex-col items-center">
          <div className="max-w-4xl w-full relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-white to-green-600 rounded-[3rem] blur opacity-5 group-focus-within:opacity-20 transition duration-1000"></div>
            <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-3 shadow-2xl focus-within:border-white/30 transition-all backdrop-blur-3xl">
              <button className="p-4 text-white/20 hover:text-white transition-all"><Plus size={24} /></button>
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Bharat anything..." 
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 outline-none placeholder:text-white/10 text-white"
              />
              <button onClick={handleSend} className="bg-white text-black p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all">
                <Send size={20} />
              </button>
            </div>
          </div>
          
          {/* YE RAHI AAPKI LINE - DEVELOPED BY HIMANSHU RANJAN */}
          <div className="mt-8 text-center">
             <p className="text-[10px] font-black tracking-[0.8em] uppercase text-white/20 hover:text-white/40 transition-all cursor-default animate-pulse">
                Developed by Himanshu Ranjan
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// UI HELPERS
function TirangaIcon() {
  return (
    <div className="flex flex-col rounded-[1px] overflow-hidden w-5 h-3.5 shadow-sm">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white flex items-center justify-center p-[0.2px]"><div className="w-[2px] h-[2px] rounded-full border-[0.2px] border-blue-900 animate-spin-slow"></div></div>
        <div className="flex-1 bg-[#138808]"></div>
    </div>
  );
}