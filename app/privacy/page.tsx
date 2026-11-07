import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { ShieldCheck, Lock, Eye } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Bharat AI",
  description: "Privacy policy describing data storage and handling on the Bharat AI platform.",
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "https://github.com/himanshu-29-max/bharat-ai";

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white selection:bg-amber-500/30 selection:text-white relative">
      <div className="ambient-orbs">
        <div className="ambient-orb-saffron" />
        <div className="ambient-orb-green" />
      </div>

      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-white/40 mt-1">Version 1.0 • Last updated: November 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-white/70 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Overview</h2>
              <p>
                Bharat AI is committed to transparent, privacy-first data handling. This policy explains what information is collected, how it is processed to deliver AI responses, and how you can manage or delete your data.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Information We Collect</h2>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>
                  <strong className="text-white">Account Details:</strong> Your name, email address, password hash (salted using bcrypt; plain-text passwords are never stored or logged), and timestamps of registration and last login.
                </li>
                <li>
                  <strong className="text-white">Third-Party Authentication:</strong> When using Google, GitHub, Microsoft, or Apple OAuth, we receive your verified profile email, display name, and avatar image URL.
                </li>
                <li>
                  <strong className="text-white">Chat History &amp; Generations:</strong> Messages you send and AI replies are saved in serverless Upstash Redis to power your multi-device conversation history.
                </li>
                <li>
                  <strong className="text-white">Consent Metadata:</strong> When signing up, we record your consent verification (Terms version and timestamp).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. Third-Party AI &amp; Search Services</h2>
              <p>
                To generate answers, images, and live lookups, your queries may be transmitted to:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Groq Inc.</strong> — Low-latency LLaMA inference</li>
                <li><strong>Google Generative AI</strong> — Gemini multimodal reasoning and document analysis</li>
                <li><strong>Pollinations.ai</strong> — Flux image synthesis</li>
                <li><strong>Tavily Search / Serper</strong> — Real-time web factual verification</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. Cookies &amp; Local Sessions</h2>
              <p>
                We use secure, HTTP-only session cookies strictly necessary to maintain your logged-in authentication state via NextAuth. We do not use third-party advertising tracking cookies.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. User Control &amp; Deletion</h2>
              <p>
                You have full ownership of your data. You may delete any conversation at any time through the chat sidebar. To request complete deletion of your account and all associated indexes, contact us or request account deletion via the platform administrator.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">6. Contact Information</h2>
              <p>
                For privacy requests or questions, reach out via{" "}
                {contactEmail.startsWith("http") ? (
                  <a href={contactEmail} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                    our GitHub repository
                  </a>
                ) : (
                  <a href={`mailto:${contactEmail}`} className="text-emerald-400 underline">
                    {contactEmail}
                  </a>
                )}
                .
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs">
            <Link href="/terms" className="text-emerald-400 hover:underline">
              &larr; Read Terms of Service
            </Link>
            <Link href="/" className="text-white/40 hover:text-white">
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

