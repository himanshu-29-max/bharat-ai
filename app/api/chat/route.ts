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

    // 🔍 1. LIVE SEARCH (Getting 2026 Context)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest news 2026 India`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. GEMINI ENGINE (STABLE VERSION FIX)
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // FIX: Hum 'gemini-pro' use karenge jo universal stable model hai 
    // Ye 404 error kabhi nahi deta kyunki ye har version mein supported hai.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 

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