"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function BharatAI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string; image?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Auto Scroll to Bottom ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chat, isLoading]);

  // --- Handle Image Selection ---
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

  // --- Send Message Logic ---
  const sendMessage = async () => {
    if (!message && !selectedImage) return;

    const userMsg = { role: "user", content: message, image: selectedImage || undefined };
    setChat((prev) => [...prev, userMsg]);
    
    const textToSend = message;
    const imgToSend = selectedImage;
    
    // Clear inputs immediately for better UI feel
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
      setChat((prev) => [...prev, { role: "assistant", content: "Bhai, connection mein kuch lafda ho gaya!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans selection:bg-gray-800">
      
      {/* --- Main Chat Display Area --- */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-0 pt-10 pb-40 scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto w-full">
          {chat.length === 0 && (
            <div className="h-[65vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
              <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                Bharat AI
              </h1>
              <p className="text-gray-500 text-lg font-light">
                Namaste Himanshu! How can I help you today?
              </p>
            </div>
          )}

          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-10`}>
              <div className={`group relative p-4 rounded-2xl max-w-[85%] transition-all ${
                msg.role === 'user' 
                ? 'bg-[#1a1a1a] border border-gray-800 shadow-xl text-gray-100' 
                : 'bg-transparent text-gray-200'
              }`}>
                {msg.image && (
                  <img 
                    src={msg.image} 
                    className="w-72 rounded-xl mb-4 border border-gray-800 shadow-2xl hover:scale-[1.02] transition-transform" 
                    alt="Uploaded content" 
                  />
                )}
                <div className="prose prose-invert max-w-none text-[16px] leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-10 animate-pulse">
              <div className="bg-transparent text-gray-500 text-sm italic">Bharat AI is thinking...</div>
            </div>
          )}
        </div>
      </div>

      {/* --- Bottom Input Bar (Classic Premium Look) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-3xl mx-auto w-full relative">
          
          {/* Image Preview Floating Box */}
          {selectedImage && (
            <div className="absolute -top-24 left-0 p-2 bg-[#111] border border-gray-800 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <img src={selectedImage} className="w-16 h-16 object-cover rounded-xl" alt="Preview" />
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-lg border border-black"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center bg-[#111]/80 backdrop-blur-xl border border-gray-800 rounded-[28px] px-5 py-3 focus-within:border-gray-500 shadow-2xl transition-all duration-300">
            {/* Plus Icon Button */}
            <button 
              onClick={handlePlusClick} 
              className="text-gray-400 hover:text-white transition-colors p-1 mr-2 active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            <input 
              type="file" ref={fileInputRef} onChange={handleFileChange} 
              className="hidden" accept="image/*" 
            />

            <input 
              id="main-input"
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Bharat anything..."
              className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-600 text-[16px] py-1"
            />

            {/* Send Button (White Circle) */}
            <button 
              onClick={sendMessage} 
              className="bg-white text-black p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all ml-2 shadow-lg group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}