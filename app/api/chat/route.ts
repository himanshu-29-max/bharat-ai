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
      body: JSON.stringify({ q: `${message} latest news 2026 India`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. GEMINI ENGINE
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Sabse stable model version: 'gemini-1.5-flash-latest'
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    const prompt = `You are Bharat AI by Himanshu Ranjan. 
    Current Date: Monday, April 6, 2026.
    Use this LIVE DATA to answer: ${context}
    Answer in humble Hinglish. Always start with Namaste!
    User Question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (err: any) {
    console.error(err);
    // Agar ye ab bhi error de, toh model name ko "gemini-1.5-flash-latest" karke try karenge
    return NextResponse.json({ 
      reply: `Bhai, Gemini connect nahi ho raha. Error: ${err.message}` 
    });
  }
}