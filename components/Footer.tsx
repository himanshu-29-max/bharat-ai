import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f]/90 relative z-10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-col rounded-sm overflow-hidden w-6 h-4 border border-white/20">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full border border-[#000080]" />
            </div>
            <div className="flex-1 bg-[#138808]" />
          </div>
          <div>
            <span className="font-bold text-base tricolour-text">Bharat AI</span>
            <p className="text-xs text-white/40 mt-0.5">
              Developed by <strong className="text-white/70">Himanshu Ranjan</strong> — B.Tech Computer Science student &amp; developer
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/50">
          <Link href="/chat" className="hover:text-white transition-colors">Chat</Link>
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <p className="text-xs text-white/30 text-center md:text-right">
          © {new Date().getFullYear()} Bharat AI. Desh Ka Apna AI Assistant.
        </p>
      </div>
    </footer>
  );
}
