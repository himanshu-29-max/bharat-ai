"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, UserCircle, Menu, Sparkles, ImageIcon, Globe, Zap, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { 
      role: 'bot', 
      content: 'Namaste **Himanshu Ranjan**! Main **Bharat AI V28 Omniverse** hoon. Main 2026 ke live data aur Google Search se connect ho gaya hoon. Aaj Bihar ya desh-duniya ke baare mein kya jaanna hai?' 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic to keep latest messages in view
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
      setMessages(prev => [...prev, { role: "bot", content: "⚠️ **Connection Error:** Bhai, Vercel ya Net check karo!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/40">
      
      {/* SIDEBAR (Desktop Only) */}
      <aside className="w-72 bg-[#080808] border-r border-white/5 hidden md:flex flex-col p-6 space-y-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-black text-xl italic shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-transform hover:rotate-6">B</div>
          <span className="font-black text-xl tracking-tighter uppercase">Bharat AI</span>
        </div>
        <nav className="flex-1 space-y-3">
          <NavItem icon={<Zap size={18}/>} label="New Chat" active onClick={() => window.location.reload()} />
          <NavItem icon={<ImageIcon size={18}/>} label="Image Lab" onClick={() => setInput("/image ")} />
          <NavItem icon={<Globe size={18}/>} label="Web Search" />
        </nav>
        <div className="p-5 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Neural Core</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            <span className="text-[11px] font-bold text-white/80">STABLE V28.0</span>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_50%_0%,#151515_0%,#050505_100%)]">
        
        {/* TOP HEADER */}
        <header className="p-5 flex justify-between items-center border-b border-white/5 backdrop-blur-3xl sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <Menu className="md:hidden opacity-50 cursor-pointer hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 shadow-inner group">
                <TirangaIcon />
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/60 group-hover:text-white transition-colors">Omniverse V28</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 bg-orange-500/10 px-4 py-1.5 rounded-xl border border-orange-500/20 shadow-lg">
                <ShieldCheck size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Verified Pro</span>
             </div>
             <UserCircle size={35} className="text-white/10 hover:text-white transition-all cursor-pointer hover:scale-110" />
          </div>
        </header>

        {/* MESSAGES VIEWPORT */}
        <div className="flex-1 overflow-y-auto px-4 md:px-[22%] space-y-12 py-12 scrollbar-hide pb-52">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[90%] p-8 rounded-[2.5rem] shadow-2xl ${
                m.role === 'user' 
                ? 'bg-white text-black font-extrabold ring-1 ring-white/20' 
                : 'bg-[#0c0c0c] border border-white/10 backdrop-blur-xl'
              }`}>
                <div className={`prose prose-invert max-w-none text-[16px] leading-relaxed ${m.role === 'user' ? 'text-black' : 'text-white/95'}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-4 ml-8 animate-pulse">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce shadow-[0_0_8px_#f97316]"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s] shadow-[0_0_8px_#22c55e]"></div>
              </div>
              <span className="text-[10px] font-black tracking-[0.6em] text-white/30 uppercase italic">Thinking Live...</span>
            </div>
          )}
          <div ref={scrollRef} className="h-20" />
        </div>

        {/* INPUT DOCK */}
        <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-white to-green-600 rounded-[3rem] blur opacity-5 group-focus-within:opacity-20 transition duration-1000"></div>
            <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-3.5 shadow-2xl focus-within:border-white/40 transition-all backdrop-blur-3xl">
              <button className="p-4 text-white/20 hover:text-white hover:scale-110 transition-all"><Plus size={26} /></button>
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Bharat anything..." 
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 outline-none placeholder:text-white/10 text-white font-medium"
              />
              <button onClick={handleSend} className="bg-white text-black p-4.5 rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all group-focus-within:bg-orange-500 group-focus-within:text-white">
                <Send size={22} className="m-0.5" />
              </button>
            </div>
            <div className="mt-8 text-center text-[10px] font-black tracking-[0.8em] uppercase text-white/10 hover:text-white/30 transition-colors cursor-default">Bharat AI Omniverse Neural Engine</div>
          </div>
        </div>
      </main>
    </div>
  );
}

// UI COMPONENTS
function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-6 py-4.5 rounded-[1.5rem] cursor-pointer transition-all ${active ? 'bg-white text-black font-black shadow-xl scale-105' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}>
      {icon} <span className="text-[15px]">{label}</span>
    </div>
  );
}

function TirangaIcon() {
  return (
    <div className="flex flex-col rounded-[2px] overflow-hidden w-5 h-3.5 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white flex items-center justify-center p-[0.3px]"><div className="w-[3px] h-[3px] rounded-full border-[0.3px] border-blue-900 animate-spin-slow"></div></div>
        <div className="flex-1 bg-[#138808]"></div>
    </div>
  );
}