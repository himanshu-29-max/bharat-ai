import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY;

    // 🔍 1. LIVE SEARCH (Serper is still the best for Google data)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest 2026 India news`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const liveContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "No live data.";

    // 🧠 2. GEMINI 1.5 FLASH (Fast & Smart)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.1 } // Accuracy ke liye
    });

    const prompt = `You are Bharat AI by Himanshu Ranjan. 
    Current Date: Monday, April 6, 2026.
    
    STRICT RULE:
    - Use ONLY the following LIVE SEARCH DATA to answer. 
    - Do NOT mention matches or events from 2023, 2024, or 2025. 
    - If the user asks about today's or yesterday's IPL, answer only based on the data below. 
    - Answer in humble Hinglish. Always start with "Namaste!".
    
    LIVE SEARCH DATA:
    ${liveContext}
    
    User Question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Bhai, Gemini connect nahi ho raha. Key check karo!" });
  }
}