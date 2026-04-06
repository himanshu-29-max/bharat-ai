import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein OPENROUTER_API_KEY missing hai!" });
    }

    // 🔍 1. LIVE SEARCH (2026 News)
    let context = "No live data found.";
    try {
        if (serperKey) {
            const serperRes = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: `${message} latest news April 2026 India`, gl: "in", num: 3 }),
            });
            const sData = await serperRes.json();
            context = sData.organic?.map((r: any) => r.snippet).join('\n') || context;
        }
    } catch (e) { console.log("Search failed."); }

    // 🧠 2. OPENROUTER CALL (Most Stable Model String)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "X-Title": "Bharat AI"
      },
      body: JSON.stringify({
        // OpenRouter par ye model sabse zyada chalta hai
        model: "google/gemini-2.0-flash-001", 
        messages: [
          {
            role: "system",
            content: `You are Bharat AI by Himanshu Ranjan. Current Date: Monday, April 6, 2026. 
            Instructions: Use context: ${context}. Answer in humble Hinglish. Start with Namaste!`
          },
          { role: "user", content: message }
        ],
        // Agar Gemini down ho toh ye rasta dhund lega
        route: "fallback" 
      })
    });

    const data = await response.json();
    
    // Debugging: Agar error aaye toh poora message dikhao
    if (data.error) {
       console.error("OpenRouter Error Details:", data.error);
       return NextResponse.json({ reply: `Bhai, OpenRouter Error: ${data.error.message}` });
    }

    const aiReply = data.choices?.[0]?.message?.content || "Bhai, AI ne khali jawab diya.";
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, connection error hai!" });
  }
}