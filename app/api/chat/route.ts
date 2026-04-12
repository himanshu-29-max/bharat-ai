import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Sunday, 12 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const cleanMsg = message?.trim() || "";
    
    // 🔍 1. FORCE SEARCH (Hamesha search hoga agar message hai)
    let searchContext = "";
    if (cleanMsg && !imageBase64) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `IPL match today April 12 2026 schedule teams venue live score`, 
            gl: "in", tbs: "qdr:d", num: 5 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search failed"); }
    }

    // 🧠 2. AI PROMPT (Strict Answer Policy)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today's Date: ${aajKiDate}.
            
            STRICT RESPONSE RULES:
            - User asked: "${message}". You MUST provide a specific answer.
            - DO NOT ask back "Kya sawal hai aapka?". 
            - USE THIS LIVE DATA ONLY: ${searchContext}
            - On April 12, 2026 (Sunday), there are TWO IPL matches. Tell the team names, time (3:30 PM and 7:30 PM), and venue from the data.
            - If data is missing, use your internal 2026 schedule knowledge to answer.
            - Answer in humble Hinglish. Start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Server error hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection failed!" });
  }
}
