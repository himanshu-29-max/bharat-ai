"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, X, Sparkles, ImageIcon, FileText, Mic, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'bot';
  content: string;
  image?: string;
  generatedImage?: string;
};

type Mode = 'chat' | 'imagine' | 'analyze';

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Namaste! 🙏 Kya poochna hai aaj?' }
  ]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('chat');
  const [showModeMenu, setShowModeMenu] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handlePlusClick = () => {
    setMode('analyze');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const modeConfig = {
    chat: { label: 'Chat', icon: <Sparkles size={14} />, color: 'from-orange-500 to-amber-500', placeholder: 'Bharat AI se kuch bhi poochho...' },
    imagine: { label: 'Image Banao', icon: <ImageIcon size={14} />, color: 'from-violet-500 to-purple-500', placeholder: 'Image describe karo — e.g. "sunset over Taj Mahal"' },
    analyze: { label: 'Analyze', icon: <FileText size={14} />, color: 'from-emerald-500 to-teal-500', placeholder: 'Document/image ke baare mein poochho...' },
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg = input.trim();
    const userImg = selectedImage;
    const currentMode = mode;

    setMessages(prev => [...prev, {
      role: "user",
      content: userMsg,
      image: userImg || undefined
    }]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          imageBase64: userImg,
          history,
          mode: currentMode === 'imagine' ? 'imagine' : undefined,
        }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: "bot",
        content: data.reply,
        generatedImage: data.generatedImage,
      }]);

      if (currentMode === 'chat') {
        setHistory(prev => [
          ...prev,
          { role: "user", content: userMsg },
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "bot", content: "Network check karo bhai! 🙏" }]);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0a1a 50%, #0a0f0a 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>

      {/* Ambient background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(255,153,51,0.06) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(19,136,8,0.06) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '50%', width: '400px', height: '400px',
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)'
        }} />
      </div>

      <main className="flex-1 flex flex-col relative">

        {/* ── HEADER ── */}
        <header style={{
          padding: '14px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,15,0.8)',
          backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          {/* Logo + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Indian flag mini */}
            <div style={{
              display: 'flex', flexDirection: 'column', borderRadius: '4px',
              overflow: 'hidden', width: '28px', height: '20px',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.1)'
            }}>
              <div style={{ flex: 1, background: '#FF9933' }} />
              <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid #000080' }} />
              </div>
              <div style={{ flex: 1, background: '#138808' }} />
            </div>

            <div>
              <div style={{
                fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #FF9933, #fff 40%, #138808)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Bharat AI
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginTop: '-2px', textTransform: 'uppercase' }}>
                by Himanshu Ranjan
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '6px 12px'
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e',
              boxShadow: '0 0 6px #22c55e'
            }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>ONLINE</span>
          </div>
        </header>

        {/* ── CHAT AREA ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '32px 16px 200px',
          scrollbarWidth: 'none'
        }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeSlideIn 0.4s ease'
              }}>
                {/* Bot avatar */}
                {m.role === 'bot' && (
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #FF9933, #138808)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', marginRight: '10px', marginTop: '4px',
                    boxShadow: '0 0 12px rgba(255,153,51,0.3)'
                  }}>🇮🇳</div>
                )}

                <div style={{ maxWidth: '80%' }}>
                  {/* User uploaded image */}
                  {m.image && (
                    <img src={m.image} alt="upload"
                      style={{ width: '200px', borderRadius: '16px', marginBottom: '8px', display: 'block', marginLeft: 'auto' }} />
                  )}

                  {/* Message bubble */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #FF9933 0%, #ff6b00 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: m.role === 'bot' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    color: m.role === 'user' ? '#000' : 'rgba(255,255,255,0.9)',
                    fontSize: '15px', lineHeight: '1.65',
                    fontWeight: m.role === 'user' ? 600 : 400,
                    backdropFilter: m.role === 'bot' ? 'blur(10px)' : 'none',
                  }}>
                    {m.role === 'bot' ? (
                      <div className="prose prose-invert max-w-none" style={{ fontSize: '15px' }}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{m.content}</span>
                    )}
                  </div>

                  {/* Generated image */}
                  {m.generatedImage && (
                    <div style={{ marginTop: '12px' }}>
                      <img src={m.generatedImage} alt="generated"
                        style={{
                          width: '100%', maxWidth: '480px', borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }} />
                      <a href={m.generatedImage} download="bharat-ai-image.jpg" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        marginTop: '8px', padding: '6px 14px', borderRadius: '20px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', fontSize: '12px', textDecoration: 'none',
                        cursor: 'pointer'
                      }}>
                        ⬇️ Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF9933, #138808)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>🇮🇳</div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: i === 0 ? '#FF9933' : i === 1 ? '#fff' : '#138808',
                      animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Soch raha hoon...
                </span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* ── INPUT DOCK ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '16px 16px 24px',
          background: 'linear-gradient(to top, #0a0a0f 60%, transparent)',
        }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>

            {/* Mode selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', justifyContent: 'center' }}>
              {(Object.keys(modeConfig) as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: mode === m ? 'rgba(255,153,51,0.15)' : 'rgba(255,255,255,0.04)',
                  border: mode === m ? '1px solid rgba(255,153,51,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: mode === m ? '#FF9933' : 'rgba(255,255,255,0.35)',
                }}>
                  {modeConfig[m].icon}
                  {modeConfig[m].label}
                </button>
              ))}
            </div>

            {/* Image preview */}
            {selectedImage && (
              <div style={{
                marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.04)',
                borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
                display: 'inline-flex', alignItems: 'center', gap: '10px'
              }}>
                <img src={selectedImage} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} alt="preview" />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Image ready</span>
                <button onClick={() => setSelectedImage(null)} style={{
                  background: 'rgba(255,59,48,0.2)', border: 'none', borderRadius: '50%',
                  width: '20px', height: '20px', cursor: 'pointer', color: '#ff3b30',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                }}>×</button>
              </div>
            )}

            {/* Input box */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: '10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '10px 10px 10px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
              transition: 'border-color 0.2s',
            }}
              onFocus={() => {}}
            >
              {/* Attach button */}
              <button onClick={handlePlusClick} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Plus size={18} />
              </button>

              <input type="file" ref={fileInputRef} onChange={handleFileChange}
                className="hidden" accept="image/*,application/pdf" style={{ display: 'none' }} />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={modeConfig[mode].placeholder}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: '1.5',
                  resize: 'none', fontFamily: 'inherit', padding: '4px 0',
                }}
              />

              {/* Send button */}
              <button onClick={handleSend} disabled={isLoading} style={{
                background: input.trim() || selectedImage
                  ? 'linear-gradient(135deg, #FF9933, #e8851a)'
                  : 'rgba(255,255,255,0.06)',
                border: 'none', borderRadius: '12px', padding: '10px 14px',
                cursor: input.trim() || selectedImage ? 'pointer' : 'default',
                color: input.trim() || selectedImage ? '#000' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.2s', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: isLoading ? 'scale(0.95)' : 'scale(1)'
              }}>
                <Send size={18} />
              </button>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.12)',
                letterSpacing: '0.15em', textTransform: 'uppercase'
              }}>
                Developed by Himanshu Ranjan
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        ::-webkit-scrollbar { display: none; }
        .prose p { margin: 0.4em 0; }
        .prose ul, .prose ol { margin: 0.4em 0; padding-left: 1.4em; }
        .prose code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .prose pre { background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px; overflow-x: auto; }
        .prose strong { color: #FF9933; }
        .prose a { color: #60a5fa; }
        textarea::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
