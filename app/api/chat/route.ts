import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!geminiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys check karo!" });
    }

    // 🔍 1. LIVE SEARCH
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest news 2026`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data.";

    // 🧠 2. GEMINI ENGINE (Updated Model Name)
    const genAI = new GoogleGenerativeAI(geminiKey);
    // Yahan humne model ka naam 'gemini-1.5-flash' ki jagah simple rakha hai jo stable hai
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 

    const prompt = `You are Bharat AI by Himanshu Ranjan. 
    Current Date: April 6, 2026.
    Use this LIVE DATA: ${context}
    Answer in humble Hinglish. Always start with Namaste!
    User Question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (err: any) {
    console.error(err);
    // Agar gemini-pro bhi na chale toh gemini-1.0-pro try karo
    return NextResponse.json({ 
      reply: `Bhai, Gemini error: ${err.message}` 
    });
  }
}