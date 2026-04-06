import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein Keys check karo!" });
    }

    // 🔍 1. GENERIC LIVE SEARCH (Jo aap puchoge, uska live data layega)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: `${message} latest live update April 6 2026`, 
        gl: "in", 
        tbs: "qdr:h", // Sirf taaza khabar
        num: 3 
      }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "No live data found.";

    // 🧠 2. OPENROUTER CALL
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "X-Title": "Bharat AI"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [
          {
            role: "system",
            content: `You are Bharat AI by Himanshu Ranjan. Current Date: Monday, April 6, 2026.
            
            STRICT INSTRUCTIONS:
            - Answer ONLY based on the provided LIVE DATA.
            - If the user asks about Nifty, talk about Nifty. If Cricket, then Cricket.
            - Do NOT hallucinate or stick to one topic.
            - Answer in humble Hinglish. Start with Namaste!`
          },
          { role: "user", content: `LIVE DATA: ${context}\n\nQuestion: ${message}` }
        ]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Data nahi mila!" });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, connection error hai!" });
  }
}