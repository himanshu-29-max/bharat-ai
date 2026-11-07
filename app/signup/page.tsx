"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [providersStatus, setProvidersStatus] = useState<{
    google: boolean;
    github: boolean;
    microsoft: boolean;
    apple: boolean;
  }>({
    google: true,
    github: false,
    microsoft: false,
    apple: false,
  });

  useEffect(() => {
    fetch("/api/auth/providers-status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.configured) {
          setProvidersStatus(d.configured);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!acceptedTerms) {
      setErrorMsg("Aage badhne ke liye Terms aur Privacy Policy par tick karo.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Apna poora naam likhein.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Kripya ek valid email address enter karein.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords match nahi kar rahe hain.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          acceptedTerms,
          termsVersion: "v1",
          marketingOptIn,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Registration fail ho gaya.");
        setIsLoading(false);
        return;
      }

      // Automatically sign in upon successful registration
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: "/chat",
      });

      if (loginRes?.error) {
        window.location.href = "/login";
      } else {
        window.location.href = "/chat";
      }
    } catch (err: any) {
      setErrorMsg("Network error. Dobara koshish karein.");
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    if (!acceptedTerms) {
      setErrorMsg("Aage badhne ke liye Terms aur Privacy Policy par tick karo.");
      return;
    }
    setErrorMsg("");
    setOauthLoading(providerId);
    try {
      await signIn(providerId, { callbackUrl: "/chat" });
    } catch (err: any) {
      setErrorMsg(`${providerId} login start karne me problem aayi.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white relative">
      <div className="ambient-orbs">
        <div className="ambient-orb-saffron" />
        <div className="ambient-orb-green" />
      </div>

      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="glass-card w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="flex flex-col rounded-sm overflow-hidden w-8 h-5 border border-white/20">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full border border-[#000080]" />
                </div>
                <div className="flex-1 bg-[#138808]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
            <p className="text-xs text-white/50 mt-1">
              Bharat AI se judne ke liye apna account banayein
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Social Sign-in Buttons */}
          <div className="space-y-2.5">
            {/* Google */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={!acceptedTerms || !providersStatus.google || !!oauthLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all ${
                acceptedTerms && providersStatus.google
                  ? "bg-white text-black hover:bg-white/95 active:scale-[0.99] shadow-md cursor-pointer"
                  : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed opacity-50"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {oauthLoading === "google"
                ? "Connecting..."
                : providersStatus.google
                ? "Sign up with Google"
                : "Google — not configured yet"}
            </button>

            {/* Microsoft */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("azure-ad")}
              disabled={!acceptedTerms || !providersStatus.microsoft || !!oauthLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all ${
                acceptedTerms && providersStatus.microsoft
                  ? "bg-[#2F2F2F] text-white hover:bg-[#383838] border border-white/10 cursor-pointer"
                  : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed opacity-50"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              {oauthLoading === "azure-ad"
                ? "Connecting..."
                : providersStatus.microsoft
                ? "Sign up with Microsoft"
                : "Microsoft — not configured yet"}
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("apple")}
              disabled={!acceptedTerms || !providersStatus.apple || !!oauthLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all ${
                acceptedTerms && providersStatus.apple
                  ? "bg-black text-white hover:bg-[#1a1a1a] border border-white/20 cursor-pointer"
                  : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed opacity-50"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.35-.57.66-1.06 1.72-.93 2.74 1 .08 2.02-.5 2.63-1.24z"/>
              </svg>
              {oauthLoading === "apple"
                ? "Connecting..."
                : providersStatus.apple
                ? "Sign up with Apple"
                : "Apple — not configured yet"}
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={!acceptedTerms || !providersStatus.github || !!oauthLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all ${
                acceptedTerms && providersStatus.github
                  ? "bg-[#24292F] text-white hover:bg-[#2c3238] border border-white/10 cursor-pointer"
                  : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed opacity-50"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              {oauthLoading === "github"
                ? "Connecting..."
                : providersStatus.github
                ? "Sign up with GitHub"
                : "GitHub — not configured yet"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 bg-[#0e0e15] text-xs text-white/40 uppercase tracking-wider">
              ya email se sign up karein
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Himanshu Ranjan"
                  className="input-glass w-full pl-10 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aapka.naam@example.com"
                  className="input-glass w-full pl-10 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-glass w-full pl-10 pr-10 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-glass w-full pl-10 text-sm"
                  required
                />
              </div>
            </div>

            {/* MANDATORY CONSENT TICK-BOX */}
            <div className="pt-2 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-white/80 leading-normal select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-[#FF9933] focus:ring-[#FF9933]/50 cursor-pointer accent-[#FF9933]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-[#FF9933] underline hover:text-white">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="text-[#FF9933] underline hover:text-white">
                    Privacy Policy
                  </Link>{" "}
                  and consent to Bharat AI storing my account and chat data as described there.
                </span>
              </label>

              {/* OPTIONAL MARKETING CHECKBOX */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/60 select-none">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#FF9933] focus:ring-[#FF9933]/50 cursor-pointer accent-[#FF9933]"
                />
                <span>Send me updates about new Bharat AI features (optional)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !acceptedTerms}
              className={`btn-primary w-full text-sm !py-3 mt-3 font-semibold transition-all ${
                !acceptedTerms ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Creating Account..." : "Create Account & Start"}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center space-y-2 text-xs">
            <p className="text-white/60">
              Already have an account?{" "}
              <Link href="/login" className="text-[#FF9933] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
            <p>
              <Link href="/" className="text-white/40 hover:text-white transition-colors">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
