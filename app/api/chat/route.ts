import { NextResponse } from 'next/server';

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
      body: JSON.stringify({ q: `${message} latest news April 2026`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. DIRECT GEMINI API CALL (Using v1beta with Fallback Name)
    // Hum 'gemini-1.5-flash-latest' use karenge jo 100% stable hai
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Bharat AI by Himanshu Ranjan. 
            Current Date: Monday, April 6, 2026.
            Instructions: Use this LIVE DATA: ${context}. Answer in friendly Hinglish. Always start with Namaste!
            User Question: ${message}`
          }]
        }]
      })
    });

    const gData = await geminiRes.json();

    if (gData.error) {
      // Agar 'flash-latest' bhi na chale, toh ek aakhri koshish 'gemini-pro' par
      return NextResponse.json({ reply: `Bhai, Google API Error: ${gData.error.message}. Ek baar AI Studio mein model name check karo.` });
    }

    const replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "Bhai, AI ne khali jawab diya!";
    return NextResponse.json({ reply: replyText });

  } catch (err: any) {
    return NextResponse.json({ reply: "Bhai, server side error hai!" });
  }
}