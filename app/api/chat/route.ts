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
      body: JSON.stringify({ q: `${message} April 2026 news India`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. DIRECT GEMINI API CALL (v1beta)
    // Hum 'gemini-1.5-flash' use karenge jo aapke dashboard mein dikh raha hai
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

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
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const gData = await geminiRes.json();

    // Check if response has content
    if (gData.candidates && gData.candidates[0]?.content?.parts?.[0]?.text) {
      const replyText = gData.candidates[0].content.parts[0].text;
      return NextResponse.json({ reply: replyText });
    } else {
      // Agar error aaye toh poora error message dikhao taaki humein pata chale
      console.error("Full Google Response:", gData);
      return NextResponse.json({ 
        reply: `Bhai, Google API Error: ${gData.error?.message || "Unknown error from Google"}` 
      });
    }

  } catch (err: any) {
    return NextResponse.json({ reply: "Bhai, server side error hai!" });
  }
}