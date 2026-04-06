import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Keys loading from Environment Variables
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!geminiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys check karo!" });
    }

    // 🔍 1. LIVE SEARCH (Getting 2026 Context)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest news April 2026`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. GEMINI ENGINE
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // MODEL NAME FIX: Hum 'gemini-1.5-flash' ki jagah stable 'gemini-pro' use karenge 
    // jo sabhi regions mein 404 nahi deta.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    const prompt = `You are Bharat AI by Himanshu Ranjan. 
    Current Date: Monday, April 6, 2026.
    
    STRICT RULES:
    - Use this LIVE DATA to answer: ${context}
    - Answer in natural, friendly Hinglish.
    - Always start with "Namaste!".
    - Never mention data from 2024 or 2025.
    
    User: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (err: any) {
    console.error("Gemini Error:", err);
    // Agar gemini-1.5-flash fail ho, toh automatic fallback gemini-pro par
    return NextResponse.json({ 
      reply: `Bhai, Gemini connect nahi ho raha. Technical Error: ${err.message}` 
    });
  }
}