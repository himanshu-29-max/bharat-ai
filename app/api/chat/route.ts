import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein OPENROUTER_API_KEY missing hai!" });
    }

    // 🔍 1. LIVE SEARCH (2026 Context)
    let context = "No live data found.";
    if (serperKey) {
        const serperRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: `${message} latest April 2026 India news`, gl: "in", num: 3 }),
        });
        const sData = await serperRes.json();
        context = sData.organic?.map((r: any) => r.snippet).join('\n') || context;
    }

    // 🧠 2. OPENROUTER CALL (Bypassing Google 404)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "X-Title": "Bharat AI"
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5", 
        messages: [
          {
            role: "system",
            content: `You are Bharat AI by Himanshu Ranjan. Current Date: Monday, April 6, 2026. 
            Instructions: Use context: ${context}. Answer in humble Hinglish. Start with Namaste!`
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
       return NextResponse.json({ reply: `Bhai, OpenRouter ne error diya: ${data.error.message}` });
    }

    const aiReply = data.choices?.[0]?.message?.content || "Bhai, AI ne khali jawab diya.";
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, server side connection fail ho gaya!" });
  }
}