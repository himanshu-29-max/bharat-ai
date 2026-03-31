"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, UserCircle, Menu, Sparkles, ImageIcon, Globe, Zap, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Namaste Himanshu! Main **Bharat AI V28 Omniverse** hoon. Main 2026 ke live data se connect ho gaya hoon. Aaj Bihar ya Darbhanga ke baare mein kya jaanna hai?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

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
      
      {/* SIDEBAR (Hidden on mobile) */}
      <aside className="w-72 bg-[#080808] border-r border-white/5 hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-black text-xl italic shadow-[0_0_20px_rgba(255,255,255,0.2)]">B</div>
          <span className="font-black text-xl tracking-tighter uppercase">Bharat AI</span>
        </div>
        <nav className="flex-1 space-y-3">
          <NavItem icon={<Zap size={18}/>} label="New Chat" active onClick={() => window.location.reload()} />
          <NavItem icon={<ImageIcon size={18}/>} label="Image Lab" />
          <NavItem icon={<Globe size={18}/>} label="Web Search" />
        </nav>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Neural Status</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold">STABLE V28.0</span>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_50%_0%,#121212_0%,#050505_100%)]">
        
        {/* HEADER */}
        <header className="p-5 flex justify-between items-center border-b border-white/5 backdrop-blur-2xl sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <Menu className="md:hidden opacity-50 cursor-pointer" />
            <div className="flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full border border-white/10 shadow-inner">
                <TirangaIcon />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Omniverse V28</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20">
                <ShieldCheck size={14} className="text-orange-500" />
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Verified Pro</span>
             </div>
             <UserCircle size={32} className="text-white/20 hover:text-white transition-all cursor-pointer shadow-2xl" />
          </div>
        </header>

        {/* CHAT VIEWPORT */}
        <div className="flex-1 overflow-y-auto px-4 md:px-[20%] space-y-12 py-10 scrollbar-hide pb-52">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
              <div className={`max-w-[90%] p-8 rounded-[2.5rem] ${
                m.role === 'user' 
                ? 'bg-white text-black font-extrabold shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
                : 'bg-[#0d0d0d] border border-white/10 shadow-2xl backdrop-blur-sm'
              }`}>
                <div className={`prose prose-invert max-w-none text-[16.5px] leading-relaxed ${m.role === 'user' ? 'text-black' : 'text-white/90'}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-4 ml-6">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase">Neural Processing...</span>
            </div>
          )}
          <div ref={scrollRef} className="h-20" />
        </div>

        {/* INPUT DOCK */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-white to-green-600 rounded-[2.5rem] blur opacity-5 group-focus-within:opacity-20 transition duration-1000"></div>
            <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl focus-within:border-white/30 transition-all">
              <button className="p-4 text-white/20 hover:text-white transition-all"><Plus size={24} /></button>
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Bharat anything..." 
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 outline-none placeholder:text-white/10"
              />
              <button onClick={handleSend} className="bg-white text-black p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"><Send size={20} /></button>
            </div>
            <div className="mt-5 text-center text-[10px] font-black tracking-[0.8em] uppercase text-white/10">Bhart AI Omniverse Engine</div>
          </div>
        </div>
      </main>
    </div>
  );
}

// UI HELPER COMPONENTS
function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all ${active ? 'bg-white text-black font-bold shadow-xl scale-105' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}>
      {icon} <span className="text-sm">{label}</span>
    </div>
  );
}

function TirangaIcon() {
  return (
    <div className="flex flex-col rounded-[1px] overflow-hidden w-5 h-3.5 shadow-sm">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white flex items-center justify-center p-[0.2px]"><div className="w-[2px] h-[2px] rounded-full border-[0.2px] border-blue-900"></div></div>
        <div className="flex-1 bg-[#138808]"></div>
    </div>
  );
}