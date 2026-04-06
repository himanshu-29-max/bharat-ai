import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!geminiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein Keys check karo!" });
    }

    // 🔍 1. LIVE SEARCH
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest news April 2026`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data.";

    // 🧠 2. DIRECT FETCH (Stable Version)
    // Humne URL ko ekdum direct rakha hai bina kisi extra prefix ke
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Bharat AI by Himanshu Ranjan. 
            Current Date: Monday, April 6, 2026.
            Instructions: Use this LIVE DATA: ${context}. Answer in humble Hinglish. Always start with Namaste!
            User Question: ${message}`
          }]
        }]
      })
    });

    const gData = await geminiRes.json();

    if (gData.error) {
      return NextResponse.json({ 
        reply: `Bhai, Google mana kar raha hai. Error: ${gData.error.message}` 
      });
    }

    if (gData.candidates && gData.candidates[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({ reply: gData.candidates[0].content.parts[0].text });
    }

    return NextResponse.json({ reply: "Bhai, AI ne khali jawab diya. Ek baar credits check karo." });

  } catch (err: any) {
    return NextResponse.json({ reply: "Bhai, connection fail ho gaya!" });
  }
}