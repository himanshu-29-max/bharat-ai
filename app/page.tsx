"use client";
import React, { useState, useRef } from 'react';

export default function BharatAI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string; image?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setLoading(true);

    const userMsg = { role: "user", content: message, image: selectedImage || undefined };
    setChat((prev) => [...prev, userMsg]);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, imageBase64: selectedImage }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChat((prev) => [...prev, { role: "assistant", content: "Bhai, error aa gaya!" }]);
    }

    setMessage("");
    setSelectedImage(null);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white p-4 font-sans">
      <div className="flex-1 overflow-y-auto space-y-6 max-w-4xl mx-auto w-full p-4">
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-[#0f0f0f]'}`}>
              {msg.image && <img src={msg.image} className="w-64 rounded-lg mb-3 shadow-lg" alt="upload" />}
              <div className="prose prose-invert text-gray-200 leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-500 animate-pulse">Bharat AI is thinking...</div>}
      </div>

      <div className="max-w-3xl mx-auto w-full relative pb-6">
        {selectedImage && (
          <div className="absolute -top-24 left-4 p-2 bg-[#111] border border-gray-700 rounded-xl shadow-2xl">
            <img src={selectedImage} className="w-16 h-16 object-cover rounded-lg" alt="preview" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full w-5 h-5 text-xs font-bold">✕</button>
          </div>
        )}

        <div className="flex items-center bg-[#111] border border-gray-800 rounded-2xl px-4 py-3 focus-within:border-gray-600 transition-all shadow-inner">
          <button onClick={handlePlusClick} className="text-gray-400 hover:text-white p-2 transition">
            <span className="text-2xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          <input 
            value={message} onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask Bharat anything..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-gray-100 placeholder-gray-600"
          />
          <button onClick={sendMessage} className="bg-white text-black px-5 py-2 rounded-xl font-semibold hover:bg-gray-200 transition active:scale-95">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}