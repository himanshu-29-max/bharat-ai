import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Bharat AI (भारत AI) — India Ka Apna All-in-One AI Assistant",
  description: "Bharat AI is an Indian AI assistant built by Himanshu Ranjan (Sandip University) featuring fast multilingual chat, live web search, document and vision analysis, image generation, and cloud history.",
  keywords: ["Bharat AI", "Indian AI", "Hinglish AI", "AI Assistant", "Himanshu Ranjan", "Sandip University"],
  authors: [{ name: "Himanshu Ranjan" }],
  openGraph: {
    title: "Bharat AI — India Ka Apna AI Assistant",
    description: "Multilingual chat, image generation, document analysis, and live web knowledge.",
    url: "https://bharat-ai-zeta.vercel.app/",
    siteName: "Bharat AI",
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-white antialiased min-h-screen flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
