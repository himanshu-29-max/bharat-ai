import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein Keys check karo!" });
    }

    // 🔍 1. PURE LIVE SEARCH (No hardcoded topics)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: `${message} latest live update April 6 2026`, 
        gl: "in", 
        tbs: "qdr:h", // Last 1 hour only
        num: 3 
      }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "No live information found right now.";

    // 🧠 2. OPENROUTER CALL (Aazaad AI)
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
            
            CORE INSTRUCTION:
            - Answer ONLY using the provided LIVE DATA.
            - Do NOT stick to any specific topic like IPL unless the user asks for it.
            - If the user asks for Nifty, PSL, or Weather, use the search results to answer.
            - Be natural, humble, and answer in Hinglish. Start with Namaste!`
          },
          { role: "user", content: `LIVE DATA FROM GOOGLE: ${context}\n\nUSER QUESTION: ${message}` }
        ]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Maaf karna bhai, data nahi mil pa raha." });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, network ya server ka lafda hai!" });
  }
}