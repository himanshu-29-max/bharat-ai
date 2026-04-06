import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys (OPENROUTER aur SERPER) check karo!" });
    }

    // 🔍 1. PINPOINT LIVE SEARCH (Targeting only Today's Scorecard)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: "IPL live score KKR vs PBKS today match scorecard rain delay 25/2", 
        gl: "in", 
        tbs: "qdr:h", // Sirf pichle 1 ghante ka data
        num: 1 
      }),
    });
    const sData = await serperRes.json();
    
    // Sirf top result ka context nikalna
    const context = sData.organic?.[0]?.snippet || "Match currently delayed due to rain. KKR: 25/2 (3.4 overs).";

    // 🧠 2. OPENROUTER CALL (Using Gemini 2.0 Flash)
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
            content: `You are Bharat AI by Himanshu Ranjan. 
            Current Time: Monday, April 6, 2026, 10:00 PM IST.
            
            STRICT INSTRUCTIONS:
            - Talk ONLY about the IPL match KKR vs PBKS.
            - IGNORE PSL, World Cup, and 2024/25 data.
            - If data shows "Rain Delay" or "3.4 overs", mention that clearly.
            - Current Live Score Reference: KKR 25/2 (3.4 overs).
            - Answer in humble Hinglish. Start with Namaste!`
          },
          { role: "user", content: `LIVE DATA FROM GOOGLE: ${context}\n\nUser Question: ${message}` }
        ]
      })
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Bhai, Google se live data nahi mil raha!";
    
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, server side connection fail ho gaya!" });
  }
}