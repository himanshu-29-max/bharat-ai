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

    // 🔍 1. LIVE SEARCH (2026 Context)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest 2026 India`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. GEMINI ENGINE (Stable Configuration)
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Yahan humne model name ko ekdum simple 'gemini-1.5-flash' rakha hai
    // Jo ki aapke package.json (0.24.1) ke saath perfectly kaam karega
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    const prompt = `You are Bharat AI, a smart assistant developed by Himanshu Ranjan. 
    Current Date: Monday, April 6, 2026.
    
    RULES:
    - Use this LIVE DATA to answer: ${context}
    - Answer in humble Hinglish. Always start with "Namaste!".
    - Never mention old data from 2024/25.
    
    User: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (err: any) {
    console.error("Gemini Error:", err);
    // Agar 404 phir bhi aaye toh ye fallback message dikhayega
    return NextResponse.json({ 
      reply: `Bhai, Gemini connect nahi ho raha. Technical Error: ${err.message}` 
    });
  }
}