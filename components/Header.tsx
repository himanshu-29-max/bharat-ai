"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Shield, LogOut, ArrowRight, User } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = (session?.user as any)?.role || "user";
  const isAdmin = role === "admin";

  return (
    <header className="sticky top-0 z-50 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex flex-col rounded-sm overflow-hidden w-6 h-4 shadow-sm border border-white/20">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full border border-[#000080]" />
            </div>
            <div className="flex-1 bg-[#138808]" />
          </div>
          <span className="font-bold text-lg tricolour-text tracking-tight group-hover:opacity-90 transition-opacity">
            Bharat AI
          </span>
        </Link>

        {/* Center: Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-white/70">
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#capabilities" className="hover:text-white transition-colors">What it can do</a>
          <a href="/#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="/#tech" className="hover:text-white transition-colors">Tech</a>
          <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        {/* Right: Auth Controls (Always visible top-right) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {status === "loading" ? (
            <div className="w-20 h-9 rounded-xl bg-white/5 animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role badge visible to EVERY logged-in user */}
              <span
                className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                  isAdmin
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-white/10 text-white/50 border border-white/10"
                }`}
              >
                {isAdmin ? "ADMIN" : "USER"}
              </span>

              {/* Admin Button on Header (Only when ADMIN) */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-all shadow-sm"
                >
                  <Shield size={13} />
                  Admin
                </Link>
              )}

              <Link
                href="/chat"
                className="btn-primary text-xs sm:text-sm !py-1.5 sm:!py-2 !px-3 sm:!px-4 font-semibold"
              >
                Open App
                <ArrowRight size={14} className="hidden sm:inline" />
              </Link>

              <div className="flex items-center gap-2 pl-1 border-l border-white/10">
                {session.user.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Avatar"}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808] text-black font-bold text-xs flex items-center justify-center">
                    {(session.user.name || session.user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="btn-ghost text-xs sm:text-sm !py-1.5 sm:!py-2 !px-3 sm:!px-4 whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="btn-primary text-xs sm:text-sm !py-1.5 sm:!py-2 !px-3 sm:!px-4 whitespace-nowrap"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-white/60 hover:text-white rounded-lg transition-colors ml-1"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl px-4 py-4 space-y-3">
          {session?.user && (
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
              <div className="truncate text-white/80 font-medium">
                {session.user.email}
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isAdmin
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {isAdmin ? "ADMIN" : "USER"}
              </span>
            </div>
          )}

          <nav className="flex flex-col space-y-2 text-sm text-white/80 font-medium">
            <a
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Features
            </a>
            <a
              href="/#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              What it can do
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              How it works
            </a>
            <a
              href="/#tech"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Tech Stack
            </a>
            <a
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              FAQ
            </a>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-amber-400 bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 font-semibold"
              >
                <Shield size={14} /> Admin Dashboard
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
