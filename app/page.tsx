"use client";
import React, { useState, useRef } from 'react';

export default function BharatAI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string; image?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ➕ Plus Icon Click: computer ki gallery khulegi
  const handlePlusClick = () => fileInputRef.current?.click();

  // 📸 File Select: photo ko Base64 mein convert karna
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        // Zaroori Fix: Photo select hote hi, text input par focus karlo
        document.getElementById('text-input')?.focus();
      };
      reader.readAsDataURL(file);
    }
  };

  // 🚀 Send Message to Backend
  const sendMessage = async () => {
    if (!message && !selectedImage) return;

    // User ka message (text aur photo) chat mein add karo
    const userMsg = { role: "user", content: message, image: selectedImage || undefined };
    setChat((prev) => [...prev, userMsg]);
    
    try {
      // Backend ko data bhejo
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, imageBase64: selectedImage }),
      });
      const data = await res.json();
      // AI ka reply chat mein add karo
      setChat((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChat((prev) => [...prev, { role: "assistant", content: "Maaf karna bhai, error aa gaya!" }]);
    }

    // Input area ekdum clear karo (Preview aur Text dono)
    setMessage("");
    setSelectedImage(null);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      {/* --- Chat Window --- */}
      <div className="flex-1 overflow-y-auto space-y-6 max-w-4xl mx-auto w-full p-4 mb-20 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-transparent text-gray-200'}`}>
              {msg.image && <img src={msg.image} className="w-48 rounded-lg mb-3 shadow-lg" alt="upload" />}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- INPUT AREA (Clean, just like before) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm z-50">
        <div className="max-w-3xl mx-auto w-full relative">
          
          {/* 🖼️ Image Preview Box (Input ke upar floating, clean look) */}
          {selectedImage && (
            <div className="absolute -top-24 left-4 p-2 bg-[#111] border border-gray-700 rounded-xl shadow-2xl">
              <img src={selectedImage} className="w-16 h-16 object-cover rounded-lg" alt="preview" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full w-5 h-5 text-xs">✕</button>
            </div>
          )}

          <div className="flex items-center bg-[#111] border border-gray-800 rounded-full px-4 py-2 focus-within:border-gray-600 transition-all">
            {/* ➕ Plus Icon (Clean black tone) */}
            <button onClick={handlePlusClick} className="text-gray-400 hover:text-white p-2">
              <span className="text-2xl font-light">+</span>
            </button>
            <input 
              type="file" ref={fileInputRef} onChange={handleFileChange} 
              className="hidden" accept="image/*" 
            />

            {/* Input Bar */}
            <input 
              id="text-input"
              value={message} onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Bharat anything..."
              className="flex-1 bg-transparent border-none outline-none px-4 text-gray-100 placeholder-gray-600"
            />

            {/* Send Button (Pichle jaise white circle) */}
            <button onClick={sendMessage} className="bg-white text-black p-2 rounded-full w-10 h-10 flex items-center justify-center font-bold hover:bg-gray-200 active:scale-95 transition">
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}