"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function BharatAI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string; image?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Auto Scroll ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chat, isLoading]);

  const handlePlusClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        document.getElementById('main-input')?.focus();
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if (!message && !selectedImage) return;

    const userMsg = { role: "user", content: message, image: selectedImage || undefined };
    setChat((prev) => [...prev, userMsg]);
    
    const textToSend = message;
    const imgToSend = selectedImage;
    
    setMessage("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, imageBase64: imgToSend }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChat((prev) => [...prev, { role: "assistant", content: "Error aa gaya bhai!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      
      {/* --- Main Chat Display Area --- */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-10 pb-48 scrollbar-hide"
      >
        <div className="max-w-4xl mx-auto w-full">
          {chat.length === 0 && (
            <div className="h-[60vh] flex flex-col items-start justify-center animate-in fade-in slide-in-from-left-4 duration-1000">
              <h1 className="text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white via-gray-300 to-gray-600 bg-clip-text text-transparent">
                Bharat AI
              </h1>
              <p className="text-gray-400 text-xl font-light">
                Namaste Himanshu! How can I help you today?
              </p>
            </div>
          )}

          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-10`}>
              <div className={`p-5 rounded-2xl max-w-[85%] transition-all ${
                msg.role === 'user' 
                ? 'bg-[#111] border border-gray-800 shadow-2xl text-gray-100' 
                : 'bg-transparent text-gray-200 border-l-2 border-gray-800 ml-2'
              }`}>
                {msg.image && (
                  <img 
                    src={msg.image} 
                    className="w-80 rounded-xl mb-4 border border-gray-800 shadow-2xl hover:scale-[1.01] transition-transform" 
                    alt="Upload" 
                  />
                )}
                <div className="prose prose-invert max-w-none text-[17px] leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-10 animate-pulse ml-2">
              <div className="text-gray-600 text-sm italic">Bharat AI is thinking...</div>
            </div>
          )}
        </div>
      </div>

      {/* --- Bottom Area: Input Bar + Branding --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
          
          {/* Image Preview */}
          {selectedImage && (
            <div className="absolute -top-24 left-0 p-2 bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.05)] animate-in slide-in-from-bottom-4">
              <img src={selectedImage} className="w-16 h-16 object-cover rounded-xl" alt="Preview" />
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search Box with Light/Glow Effect */}
          <div className="w-full flex items-center bg-[#0a0a0a] border border-gray-800 rounded-[30px] px-6 py-4 focus-within:border-gray-500 focus-within:shadow-[0_0_25px_rgba(255,255,255,0.03)] shadow-xl transition-all duration-500 group">
            <button 
              onClick={handlePlusClick} 
              className="text-gray-500 hover:text-white transition-colors p-1 mr-3 active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            <input 
              id="main-input"
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Bharat anything..."
              className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-600 text-[16px] py-1"
            />

            <button 
              onClick={sendMessage} 
              className="bg-white text-black p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all ml-3 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>

          {/* --- Branding Section --- */}
          <div className="mt-4 pb-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-600 font-medium select-none">
              Developed by <span className="text-gray-400">Himanshu Ranjan</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}