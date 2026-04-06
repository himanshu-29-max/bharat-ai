import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!geminiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein Keys check karo!" });
    }

    // 🔍 1. LIVE SEARCH (2026 Context)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest news April 2026`, gl: "in", num: 3 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data.";

    // 🧠 2. THE BYPASS METHOD (Using the most stable globally available URL)
    // Hum "gemini-1.5-flash" use karenge par simplified URL ke saath
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Bharat AI by Himanshu Ranjan. 
            Today's Date: Monday, April 6, 2026.
            Context: ${context}. 
            Task: Answer in humble Hinglish. Start with "Namaste!".
            Question: ${message}`
          }]
        }]
      })
    });

    const data = await response.json();

    // 🛠️ AGAR PHIR BHI 404 AAYE, TOH YE FALLBACK CHALEGA
    if (data.error) {
       console.error("Debug Error:", data.error);
       if (data.error.code === 404) {
         return NextResponse.json({ reply: "Bhai, Google ka model connect nahi ho raha. Ek baar AI Studio mein jaakar naya Project bana kar nayi Key generate karo!" });
       }
       return NextResponse.json({ reply: `Google Error: ${data.error.message}` });
    }

    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Bhai, AI ne khali jawab diya.";
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, Network ka lafda hai!" });
  }
}