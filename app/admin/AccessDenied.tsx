import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldAlert, ArrowLeft, Key, ExternalLink } from "lucide-react";

interface AccessDeniedProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

export function AccessDenied({ user }: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white selection:bg-amber-500/30 selection:text-white relative">
      <div className="ambient-orbs">
        <div className="ambient-orb-saffron" />
        <div className="ambient-orb-green" />
      </div>

      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="glass-card w-full max-w-lg p-6 sm:p-10 rounded-3xl border border-rose-500/30 shadow-2xl relative text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <ShieldAlert size={28} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-white">
            Access Denied
          </h1>
          <p className="text-base text-rose-300/90 font-medium mb-6">
            Ye page sirf Admin ke liye hai.
          </p>

          <div className="glass p-4 rounded-2xl mb-6 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/40">Signed in as:</span>
              <span className="text-white font-medium">{user.email || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/40">Current Role:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-white/70">
                {user.role || "user"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-white/40">Access Required:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                admin
              </span>
            </div>
          </div>

          {/* Owner Instruction Guide */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-left text-xs leading-relaxed space-y-2 mb-6">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Key size={14} />
              <span>Agar aap site ke owner hain:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-white/80 pl-1">
              <li>
                <strong className="text-white">Vercel</strong> &rarr; Project Settings &rarr; Environment Variables me jayein.
              </li>
              <li>
                <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">ADMIN_EMAILS</code> variable banayein ya update karein aur usme apna yehi email daalein:
                <div className="font-mono text-[11px] bg-black/60 p-1.5 rounded mt-1 text-white break-all select-all">
                  {user.email}
                </div>
              </li>
              <li>Vercel project ko <strong>Redeploy</strong> karein.</li>
              <li>Bharat AI par aakar ek baar <strong>Logout</strong> karein aur phir se <strong>Login</strong> karein.</li>
            </ol>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/chat"
              className="btn-primary text-xs !py-2.5 !px-5"
            >
              <ArrowLeft size={14} />
              Back to Chat
            </Link>
            <Link
              href="/"
              className="btn-ghost text-xs !py-2.5 !px-5"
            >
              Home Page
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
