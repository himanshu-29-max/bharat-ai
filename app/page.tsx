"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, UserCircle, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Namaste! Main **Bharat AI** hoon. Bataiye main aapki kya sewa kar sakta hoon?' }
  ]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll logic
  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isLoading]);

  // Image selection logic
  const handlePlusClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg = input;
    const userImg = selectedImage;
    
    // UI update for User
    setMessages(prev => [...prev, { role: "user", content: userMsg, image: userImg || undefined }]);
    
    // Clear Inputs immediately
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, imageBase64: userImg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", content: "Network check karo bhai!" }]);
    } finally {
      setIsLoading(true); // Small delay feel for processing
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30 overflow-hidden">
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_50%_0%,#151515_0%,#050505_100%)]">
        
        {/* HEADER - OMNIVERSE V28 (Restored) */}
        <header className="p-6 flex justify-between items-center border-b border-white/5 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <Menu size={22} className="opacity-40 hover:opacity-100 cursor-pointer transition-all" />
            <div className="flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full border border-white/10 shadow-inner">
                <div className="flex flex-col rounded-sm overflow-hidden w-5 h-3.5">
                   <div className="flex-1 bg-[#FF9933]"></div>
                   <div className="flex-1 bg-white flex items-center justify-center p-[0.2px]"><div className="w-[1px] h-[1px] rounded-full border-[0.2px] border-blue-900"></div></div>
                   <div className="flex-1 bg-[#138808]"></div>
                </div>
                <span className="text-[11px] font-black tracking-[0.3em] uppercase opacity-70">OMNIVERSE V28</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-[10px] font-black text-white/20 tracking-widest uppercase">Himanshu Ranjan Edition</div>
             <UserCircle size={32} className="opacity-20 hover:opacity-100 transition-all cursor-pointer" />
          </div>
        </header>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto px-6 md:px-[20%] lg:px-[25%] space-y-12 py-12 scrollbar-hide pb-60">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[95%] p-7 rounded-[2.5rem] shadow-2xl transition-all ${
                m.role === 'user' 
                ? 'bg-white text-black font-extrabold shadow-[0_15px_50px_rgba(255,255,255,0.05)]' 
                : 'bg-[#0d0d0d] border border-white/10 backdrop-blur-sm'
              }`}>
                {/* @ts-ignore - Dynamic image support in user bubble */}
                {m.image && <img src={m.image} className="w-64 rounded-2xl mb-4 border-2 border-black/10" alt="Upload" />}
                <div className={`prose prose-invert max-w-none text-[17px] leading-relaxed ${m.role === 'user' ? 'text-black' : 'text-white/90'}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 ml-4 animate-pulse">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase">BHARAT AI PROCESSING...</span>
            </div>
          )}
          <div ref={scrollRef} className="h-10" />
        </div>

        {/* FLOATING INPUT DOCK */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent flex flex-col items-center">
          <div className="max-w-4xl w-full relative group">
            
            {/* Image Preview Area */}
            {selectedImage && (
              <div className="absolute -top-24 left-4 p-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
                <img src={selectedImage} className="w-16 h-16 object-cover rounded-xl" alt="Preview" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full text-white"><X size={12}/></button>
              </div>
            )}

            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-white to-green-600 rounded-[2.5rem] blur opacity-5 group-focus-within:opacity-15 transition duration-1000"></div>
            
            <div className="relative flex items-center bg-[#0d0d0d] border border-white/10 rounded-[3rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-within:border-white/30 transition-all backdrop-blur-3xl">
              <button 
                onClick={handlePlusClick}
                className="p-4 text-white/20 hover:text-white transition-all active:scale-90"
              >
                <Plus size={24} />
              </button>
              
              <input 
                type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" 
              />

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
          
          <div className="mt-8 text-center">
             <p className="text-[10px] font-black tracking-[0.8em] uppercase text-white/10 transition-all cursor-default hover:text-white/30">
                Developed by Himanshu Ranjan
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}