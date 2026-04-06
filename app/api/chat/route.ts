import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!geminiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys load nahi hui hain!" });
    }

    // 🔍 1. LIVE SEARCH (Getting 2026 Context)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest news April 2026 India`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. GEMINI ENGINE (STABLE VERSION)
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // FIX: Agar 'gemini-1.5-flash' 404 de raha hai, toh 'gemini-1.5-flash-latest' use karo
    // Ya phir sabse stable 'gemini-pro' (Jo 1.0 version hai par 100% chalta hai)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    const prompt = `You are Bharat AI by Himanshu Ranjan. 
    Current Date: Monday, April 6, 2026.
    
    INSTRUCTIONS:
    - Use this LIVE DATA to answer: ${context}
    - Answer in natural Hinglish.
    - Always start with "Namaste!".
    - Strictly ignore 2024/2025 data.
    
    User Question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (err: any) {
    console.error("Gemini Error:", err);
    return NextResponse.json({ 
      reply: `Bhai, Gemini connect nahi ho raha. Technical Error: ${err.message}` 
    });
  }
}