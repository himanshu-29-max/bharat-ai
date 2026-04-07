"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function BharatAI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string; image?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Zaroori: New message aane par auto-scroll niche ho
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const handlePlusClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        // Photo select hote hi input box par wapas focus karlo
        document.getElementById('ask-input')?.focus();
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if (!message && !selectedImage) return;

    // User message chat state mein daalo
    const userMsg = { role: "user", content: message, image: selectedImage || undefined };
    setChat((prev) => [...prev, userMsg]);
    
    // Send inputs, then clear them from UI immediately
    const textToSend = message;
    const imgToSend = selectedImage;
    setMessage("");
    setSelectedImage(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, imageBase64: imgToSend }),
      });
      const data = await res.json();
      // AI reply state mein daalo
      setChat((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      console.error(e);
      setChat((prev) => [...prev, { role: "assistant", content: "Error aa gaya bhai!" }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* --- Main Chat Window (Premium Scrollable) --- */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent scroll-smooth"
      >
        <div className="max-w-3xl mx-auto w-full">
          {chat.length === 0 && (
            <div className="h-[60vh] flex items-center justify-center text-gray-600 text-xl font-light select-none">
              Namaste Himanshu! How can Bharat AI help you today?
            </div>
          )}
          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
              <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-[#1a1a1a] border border-gray-800 shadow-md' : 'bg-transparent text-gray-200'}`}>
                {msg.image && <img src={msg.image} className="w-56 rounded-xl mb-3 border border-gray-700" alt="upload" />}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- INPUT BAR (Fixed at bottom) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-3xl mx-auto w-full relative">
          
          {/* 🖼️ Image Preview Box */}
          {selectedImage && (
            <div className="absolute -top-24 left-0 p-2 bg-[#111] border border-gray-800 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <img src={selectedImage} className="w-16 h-16 object-cover rounded-lg" alt="preview" />
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center bg-[#111]/90 backdrop-blur-md border border-gray-800 rounded-full px-5 py-3 focus-within:border-gray-600 shadow-lg transition-all">
            {/* ➕ Plus Icon */}
            <button 
              onClick={handlePlusClick} 
              className="text-gray-400 hover:text-white transition p-1 mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <input 
              type="file" ref={fileInputRef} onChange={handleFileChange} 
              className="hidden" accept="image/*" 
            />

            {/* Main Input Bar */}
            <input 
              id="ask-input"
              value={message} onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Bharat anything..."
              className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500 text-[16px]"
            />

            {/* Send Button (Pichle look jaise circle) */}
            <button 
              onClick={sendMessage} 
              className="bg-white text-black p-2 rounded-full w-10 h-10 flex items-center justify-center font-bold hover:bg-gray-200 active:scale-95 transition-all ml-2"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}