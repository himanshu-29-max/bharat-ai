"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function BharatAI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string; image?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new message arrives
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
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if (!message && !selectedImage) return;

    const userMsg = { role: "user", content: message, image: selectedImage || undefined };
    setChat((prev) => [...prev, userMsg]);
    
    const currentMsg = message;
    const currentImg = selectedImage;
    setMessage("");
    setSelectedImage(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentMsg, imageBase64: currentImg }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChat((prev) => [...prev, { role: "assistant", content: "Error aa gaya bhai!" }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* --- Main Chat Window --- */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto w-full">
          {chat.length === 0 && (
            <div className="h-[60vh] flex items-center justify-center text-gray-500 text-xl font-light">
              Namaste Himanshu! How can Bharat AI help you today?
            </div>
          )}
          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
              <div className={`p-4 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-[#1a1a1a] border border-gray-800 shadow-lg' : 'bg-transparent text-gray-100'}`}>
                {msg.image && <img src={msg.image} className="w-64 rounded-xl mb-4 border border-gray-700" alt="upload" />}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Fixed Input Bar (Always at bottom) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-3xl mx-auto w-full relative">
          
          {/* Image Preview Area */}
          {selectedImage && (
            <div className="absolute -top-24 left-0 p-2 bg-[#111] border border-gray-800 rounded-xl animate-in fade-in slide-in-from-bottom-4">
              <img src={selectedImage} className="w-16 h-16 object-cover rounded-lg" alt="preview" />
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-700"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center bg-[#111]/90 backdrop-blur-md border border-gray-800 rounded-[28px] px-5 py-3 focus-within:border-gray-600 shadow-2xl transition-all">
            <button 
              onClick={handlePlusClick} 
              className="text-gray-400 hover:text-white transition-colors p-1 mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            <input 
              type="file" ref={fileInputRef} onChange={handleFileChange} 
              className="hidden" accept="image/*" 
            />

            <input 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Bharat anything..."
              className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500 text-[16px]"
            />

            <button 
              onClick={sendMessage} 
              className="bg-white text-black p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all ml-2 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}