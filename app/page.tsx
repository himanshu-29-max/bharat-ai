"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Bot, Sparkles, Plus, Mic, Crown, Download, Paperclip, Paintbrush, Video, UserCircle, SearchCode
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BharatAI() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string, imageUrl?: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPro, setIsPro] = useState(true); 

  const scrollRef = useRef<HTMLDivElement>(null);
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- 🛠️ 100% STABLE IMAGE ENGINE (NO 401 REDIRECT) ---
  const generateImage = async (promptText: string) => {
    setLoading(true);
    setShowMenu(false);
    
    const seed = Math.floor(Math.random() * 999999);
    // Stable Pollinations Static Link
    const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(promptText)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    // AI Response with Image
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `### ✨ Vision Generated\n\nBhai, aapka vision **"${promptText}"** ab taiyaar hai!`,
        imageUrl: imageUrl 
      }]);
      setLoading(false);
    }, 3000);
  };

  const handleSend = async (val?: string) => {
    const finalInput = val || input;
    if (!finalInput.trim() || loading) return;

    // Check for image generation request
    if (finalInput.toLowerCase().includes("banao") || finalInput.toLowerCase().includes("image") || finalInput.toLowerCase().includes("photo")) {
      setMessages(prev => [...prev, { role: 'user', content: finalInput }]);
      generateImage(finalInput);
      setInput("");
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: finalInput }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: "You are Bharat AI, a world-class professional assistant." }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: finalInput }],
          model: "llama-3.3-70b-versatile",
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Bhai, API key check karo ya network!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#e3e3e3] flex-col font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="p-4 flex items-center justify-between z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px] text-white">IN</div>
          <h1 className="text-xl font-bold tracking-tight">Bharat AI <span className="text-[10px] text-zinc-500 font-normal ml-2 tracking-widest">V28 OMNI</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full text-xs font-bold text-amber-500 flex items-center gap-1">
            <Crown size={14}/> PRO
          </div>
          <UserCircle size={26} className="text-zinc-600"/>
        </div>
      </header>

      {/* CHAT MAIN */}
      <main className="flex-1 overflow-y-auto px-4 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000 opacity-20">
            <Sparkles size={80} strokeWidth={0.5}/>
            <h2 className="text-4xl md:text-5xl font-medium text-center max-w-2xl leading-tight">What's on the agenda?</h2>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-10 space-y-12 pb-44">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 md:gap-6 animate-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 bg-[#1a1a1a] text-blue-400 shadow-xl"><Bot size={20}/></div>
                )}
                <div className={`max-w-[85%] space-y-4 ${msg.role === 'user' ? 'bg-[#1e1e1e] px-6 py-3 rounded-[2rem] rounded-br-none text-white border border-white/5 shadow-2xl' : 'text-[#e3e3e3] text-lg font-light leading-relaxed'}`}>
                   <div className="prose prose-invert max-w-none text-zinc-200"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                   
                   {/* STABLE IMAGE RENDERING */}
                   {msg.imageUrl && (
                     <div className="mt-4 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group bg-zinc-900 min-h-[400px] flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center opacity-20"><Loader2 className="animate-spin text-white" size={40}/></div>
                        <img 
                          src={msg.imageUrl} 
                          alt="AI" 
                          className="relative w-full h-auto object-cover transition-opacity duration-1000"
                          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                          style={{ opacity: 0 }}
                        />
                        <a href={msg.imageUrl} target="_blank" className="absolute bottom-6 right-6 bg-white text-black p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-2xl hover:scale-110 active:scale-90"><Download size={20}/></a>
                     </div>
                   )}
                </div>
              </div>
            ))}
            {loading && <div className="flex gap-4 md:gap-6 animate-pulse max-w-3xl mx-auto"><div className="w-9 h-9 rounded-full bg-[#1a1a1a]" /><div className="h-4 w-24 bg-[#1a1a1a] rounded-full mt-3"></div></div>}
            <div ref={scrollRef} className="h-10"/>
          </div>
        )}
      </main>

      {/* INPUT SYSTEM */}
      <footer className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
        <div className="max-w-3xl mx-auto relative">
          
          {showMenu && (
            <div className="absolute bottom-full left-0 mb-4 w-72 bg-[#1e1e1e] border border-white/10 rounded-[2rem] p-3 shadow-2xl animate-in slide-in-from-bottom-4">
              <button onClick={() => {setShowMenu(false); setInput("Sher ki image banao");}} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl text-sm transition-all text-left"><Paintbrush size={18} className="text-purple-400"/> Create image</button>
              <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl text-sm transition-all text-left"><Paperclip size={18} className="text-blue-400"/> Add photos & files</button>
              <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl text-sm transition-all text-left"><SearchCode size={18} className="text-amber-400"/> Deep research</button>
            </div>
          )}

          <div className="relative flex items-center bg-[#1e1e1f] rounded-[2.5rem] min-h-[64px] p-2 border border-white/10 focus-within:bg-[#28292a] transition-all shadow-2xl">
            <button onClick={() => setShowMenu(!showMenu)} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${showMenu ? 'bg-white/10 rotate-45' : 'text-zinc-400 hover:text-white'}`}><Plus size={24}/></button>
            <input 
               className="flex-1 bg-transparent px-4 py-3 outline-none text-lg text-white font-light placeholder:text-zinc-800" 
               placeholder="Ask anything, generate image..." 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <div className="flex items-center gap-1 pr-2">
              <button className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white rounded-full"><Mic size={22}/></button>
              <button onClick={() => handleSend()} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-all hover:bg-zinc-200"><Send size={18}/></button>
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-800 mt-4 uppercase tracking-[0.4em]">Neural Core: Bharat AI V28 Stable</p>
        </div>
      </footer>
    </div>
  );
}