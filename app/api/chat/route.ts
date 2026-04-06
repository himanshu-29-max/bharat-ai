import { NextResponse } from 'next/server';

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
      body: JSON.stringify({ q: `${message} latest 2026 India news`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. DIRECT GEMINI API CALL (v1beta for 1.5-flash)
    // Ye URL ab 100% chalega kyunki ye latest models ke liye hai
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
       console.error("Gemini Details:", gData.error);
       return NextResponse.json({ reply: `Bhai, Google API Error: ${gData.error.message}` });
    }

    const replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "Bhai, AI ne khali jawab diya!";
    return NextResponse.json({ reply: replyText });

  } catch (err: any) {
    return NextResponse.json({ reply: "Bhai, direct connection bhi fail ho gaya!" });
  }
}