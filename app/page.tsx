"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  MessageSquare,
  Sparkles,
  Search,
  FileText,
  Image as ImageIcon,
  History,
  ShieldCheck,
  Zap,
  ArrowRight,
  GraduationCap,
  Layers,
  ChevronDown
} from "lucide-react";

export default function LandingPage() {
  const { data: session } = useSession();

  const ctaUrl = session?.user ? "/chat" : "/signup";

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white selection:bg-amber-500/30 selection:text-white relative">
      {/* Ambient background glows */}
      <div className="ambient-orbs">
        <div className="ambient-orb-saffron" />
        <div className="ambient-orb-green" />
      </div>

      <Header />

      <main className="flex-1 relative z-10">
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-white/80 mb-6 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Made for India 🇮🇳 &nbsp;|&nbsp; Fast, Honest & Multilingual
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15]">
            India ka apna{" "}
            <span className="tricolour-text block sm:inline">
              All-in-One AI
            </span>{" "}
            Assistant
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Bharat AI speaks your language — Hindi, English, and Hinglish. Chat freely, generate realistic images, analyze PDFs and photos, and get verified real-time web information instantly.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={ctaUrl}
              className="btn-primary w-full sm:w-auto text-base !py-3.5 !px-8 font-semibold shadow-lg shadow-[#FF9933]/20"
            >
              Start Chatting
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="btn-ghost w-full sm:w-auto text-base !py-3.5 !px-7"
            >
              See Features
            </a>
          </div>

          {/* Real Preview Mock glass card */}
          <div className="mt-14 sm:mt-18 max-w-4xl mx-auto">
            <div className="glass-card p-4 sm:p-6 border border-white/15 rounded-3xl shadow-2xl relative overflow-hidden text-left">
              {/* Card top bar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-xs text-white/40 font-mono">bharat-ai.chat</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active Model: Groq / Gemini
                </div>
              </div>

              {/* Chat preview bubbles */}
              <div className="space-y-4 text-sm sm:text-base">
                {/* User */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[70%] bg-gradient-to-r from-[#FF9933] to-[#e8851a] text-black font-medium p-3 sm:p-4 rounded-2xl rounded-tr-sm shadow-md">
                    Namaste! Mujhe batao Bharat AI kya kya kar sakta hai?
                  </div>
                </div>

                {/* Bot */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] flex items-center justify-center text-xs flex-shrink-0 shadow-md">
                    🇮🇳
                  </div>
                  <div className="max-w-[85%] sm:max-w-[80%] bg-white/[0.05] border border-white/10 p-3.5 sm:p-4 rounded-2xl rounded-tl-sm text-white/90 leading-relaxed">
                    <p className="font-semibold text-[#FF9933] mb-1">Namaste! 🙏 Bharat AI aapka smart desi saathi hai:</p>
                    <ul className="text-xs sm:text-sm text-white/70 space-y-1 list-disc list-inside">
                      <li>Hinglish me fluent chat aur coding help</li>
                      <li>Pollinations Flux se creative <strong>AI Image Generation</strong></li>
                      <li>JPG, PNG aur <strong>PDF documents ka live analysis</strong> via Gemini</li>
                      <li>Tavily se live web search jab latest news chahiye ho</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
          <div className="glass-card p-6 sm:p-10 md:p-12 relative overflow-hidden">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF9933] mb-3">
                <GraduationCap size={15} />
                Student Innovation & Engineering
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">
                About Bharat AI
              </h2>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-4">
                Bharat AI is an ambitious, full-stack artificial intelligence platform built by{" "}
                <strong className="text-white font-semibold">Himanshu Ranjan</strong>, a Computer Science and Engineering (B.Tech CSE) student at{" "}
                <strong className="text-white font-semibold">Sandip University</strong>.
              </p>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-6">
                Most international AI chatbots struggle with genuine Indian context, dialect nuances, and multilingual queries (Hindi, Hinglish, regional tech queries). Bharat AI was engineered to bridge this gap by bringing together low-latency cloud models (Groq LLaMA, Google Gemini 1.5/2.5), multimodal PDF/image inspection, real-time search indexing, and resilient serverless persistence under one elegant experience.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs sm:text-sm">
                <div>
                  <div className="text-white/40">Creator</div>
                  <div className="font-semibold text-white mt-0.5">Himanshu Ranjan</div>
                </div>
                <div>
                  <div className="text-white/40">Institution</div>
                  <div className="font-semibold text-white mt-0.5">Sandip University</div>
                </div>
                <div>
                  <div className="text-white/40">Discipline</div>
                  <div className="font-semibold text-white mt-0.5">B.Tech CSE</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-semibold text-[#FF9933] uppercase tracking-wider mb-2">
              Genuine Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">
              Real Features. No Fake Replies.
            </p>
            <p className="text-white/50 text-sm sm:text-base mt-3">
              Every card below represents a tested, production-ready capability wired into our live backend API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#FF9933] flex items-center justify-center mb-4">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">Hinglish-Friendly AI Chat</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Dual-provider intelligence using Groq and Gemini. Ask questions in pure Hindi, fluent English, or conversational Hinglish with complete answers.
                </p>
              </div>
              <div className="mt-5 text-xs text-orange-400 font-medium">Groq LLaMA + Google Gemini</div>
            </div>

            {/* Card 2 */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">AI Image Generation</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Generate brand-new artworks and photorealistic concepts directly from your text prompt using Pollinations Flux, with one-click direct download.
                </p>
              </div>
              <div className="mt-5 text-xs text-purple-400 font-medium">Pollinations.ai Flux Engine</div>
            </div>

            {/* Card 3 */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">Image, PDF & Text Analysis</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Upload JPG, PNG, or multi-page PDF documents. Gemini Vision and Document comprehension inspects the actual file content to answer your questions accurately.
                </p>
              </div>
              <div className="mt-5 text-xs text-blue-400 font-medium">Gemini 1.5/2.5 Multimodal Vision</div>
            </div>

            {/* Card 4 */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Search size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">Smart Real-Time Web Search</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Queries requiring current affairs, today&apos;s events, or live scores trigger Tavily Search automatically to ground the answer in facts.
                </p>
              </div>
              <div className="mt-5 text-xs text-emerald-400 font-medium">Tavily Search API</div>
            </div>

            {/* Card 5 */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <History size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">Saved Cloud Chat History</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Conversations are saved to Upstash Redis and organized intelligently into <em>Aaj</em>, <em>Is Hafte</em>, <em>Is Mahine</em>, and <em>Purane</em>.
                </p>
              </div>
              <div className="mt-5 text-xs text-amber-400 font-medium">Upstash Serverless Redis</div>
            </div>

            {/* Card 6 */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">Google + Email/Password Auth</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Instant One-Click Google OAuth or private Email/Password sign up with salted bcrypt hash encryption and role-based access control.
                </p>
              </div>
              <div className="mt-5 text-xs text-rose-400 font-medium">NextAuth v4 + Bcrypt</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-semibold text-[#138808] uppercase tracking-wider mb-2">
              Simple Flow
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">
              Kaise Kaam Karta Hai?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-6 relative">
              <div className="text-3xl font-black text-[#FF9933] mb-3">01</div>
              <h3 className="text-lg font-bold mb-2">Sign Up Ya Login Karein</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Google account se ek click me login karein ya apna email aur password daal kar naya account banayein.
              </p>
            </div>

            <div className="glass-card p-6 relative">
              <div className="text-3xl font-black text-white mb-3">02</div>
              <h3 className="text-lg font-bold mb-2">Poochhein, Upload Karein ya Imagine Karein</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Chat box me sawaal likhein, koi PDF ya photo attach karein, ya &quot;Image Banao&quot; mode select karke kuch bhi imagine karein.
              </p>
            </div>

            <div className="glass-card p-6 relative">
              <div className="text-3xl font-black text-[#138808] mb-3">03</div>
              <h3 className="text-lg font-bold mb-2">Turant Jawab &amp; Auto-Save</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Bharat AI high-speed answer ya HD image generate karta hai aur aapka pura conversation history me surakshit save ho jata hai.
              </p>
            </div>
          </div>
        </section>

        {/* TECH STACK STRIP */}
        <section id="tech" className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
          <p className="text-center text-xs font-semibold text-white/40 uppercase tracking-widest mb-8">
            Powered by Modern Frontier Technology
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-white/70">
            <div className="glass px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Layers size={16} className="text-[#FF9933]" /> Next.js 14 App Router
            </div>
            <div className="glass px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Zap size={16} className="text-amber-400" /> Groq LPU Inference
            </div>
            <div className="glass px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" /> Google Gemini Multimodal
            </div>
            <div className="glass px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <History size={16} className="text-red-400" /> Upstash Serverless Redis
            </div>
            <div className="glass px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" /> NextAuth &amp; Vercel
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/5">
          <div className="text-center mb-12">
            <h2 className="text-xs font-semibold text-[#FF9933] uppercase tracking-wider mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-3xl font-bold tracking-tight">Sawaal aur Jawab</p>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-5 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-white">
                Kya Bharat AI free hai?
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Haan! Bharat AI bilkul muft (free) hai. Aap bina kisi subscription ya payment ke chat kar sakte hain, images generate kar sakte hain aur documents analyze kar sakte hain.
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-white">
                Kaun si bhashaon (languages) me baat kar sakte hain?
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Aap Hindi (Devanagari), Hinglish (Roman English me Hindi), aur English me asaani se sawal poochh sakte hain. Model aapke format aur tone ko samajh kar jawab deta hai.
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-white">
                Kya meri chat history save rehti hai?
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Haan. Jab aap login karke chat karte hain, aapke sabhi conversations Upstash cloud Redis me save hote hain. Aap unhe kisi bhi waqt sidebar se dobara khol ya delete kar sakte hain.
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-white">
                Bharat AI kisne banaya hai?
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Bharat AI ko Himanshu Ranjan ne develop kiya hai, jo Sandip University ke B.Tech Computer Science and Engineering (CSE) ke vidyarthi hain.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA BANNER */}
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="glass-card p-8 sm:p-14 text-center relative overflow-hidden border border-[#FF9933]/30">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Bharat AI ka anubhav karein
            </h2>
            <p className="text-white/70 max-w-xl mx-auto text-sm sm:text-base mb-8">
              Fastest responses, multimodal vision, real-time web search aur AI image creation — sab kuch ek hi jagah.
            </p>
            <Link
              href={ctaUrl}
              className="btn-primary text-base !py-3.5 !px-9 font-semibold shadow-xl shadow-[#FF9933]/25"
            >
              Start Now — It&apos;s Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

