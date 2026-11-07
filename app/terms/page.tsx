import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { ShieldCheck, FileText, Scale } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Bharat AI",
  description: "Terms and conditions for using the Bharat AI assistant platform.",
};

export default function TermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#FF9933] flex items-center justify-center">
              <Scale size={20} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Terms of Service</h1>
              <p className="text-xs text-white/40 mt-1">Version 1.0 • Last updated: November 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-white/70 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Introduction & Acceptance</h2>
              <p>
                Welcome to Bharat AI (&quot;the Service&quot;), an Indian AI assistant developed by Himanshu Ranjan. By accessing, creating an account, or using our chat, image generation, and document analysis services, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Accounts & Authentication</h2>
              <p>
                To save conversation history and access full features, you may register via Email/Password or authenticate with supported third-party providers (Google, GitHub, Microsoft, or Apple). You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. Acceptable Use Policy</h2>
              <p>
                You agree not to use Bharat AI for unlawful activities, generating illegal or harmful material, attempting to reverse engineer or disrupt service operations, or bypassing access limitations. Automated scraping or bot abuse is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. AI Output Disclaimer</h2>
              <p>
                Bharat AI generates text, code, analysis, and images powered by artificial intelligence models (such as Groq LLaMA, Google Gemini, and Pollinations Flux). While we strive for accuracy, AI responses may occasionally contain inaccuracies, hallucinations, or outdated information. Outputs are provided for informational and creative purposes without warranty of any kind.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. Data Storage & User Control</h2>
              <p>
                Your account profile, chat history, and image generation links are stored securely in cloud-hosted Upstash Redis. You retain full control to delete individual conversations directly from the chat sidebar at any time.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">6. Contact & Inquiries</h2>
              <p>
                If you have questions regarding these Terms, contact us via{" "}
                {contactEmail.startsWith("http") ? (
                  <a href={contactEmail} target="_blank" rel="noreferrer" className="text-[#FF9933] underline">
                    our official project repository
                  </a>
                ) : (
                  <a href={`mailto:${contactEmail}`} className="text-[#FF9933] underline">
                    {contactEmail}
                  </a>
                )}
                .
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs">
            <Link href="/privacy" className="text-[#FF9933] hover:underline">
              Read Privacy Policy &rarr;
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

