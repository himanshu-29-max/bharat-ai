import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. AUTO DATE (Today: April 7, 2026)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. AGGRESSIVE LIVE SEARCH
    let searchContext = "";
    if (message && !imageBase64) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            // Query ko force kiya hai current price/news ke liye
            q: `${message} NSE India current price closing April 7 2026 news`, 
            gl: "in", 
            tbs: "qdr:h", // Last 1 hour only
            num: 4 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search failed"); }
    }

    // 🧠 3. AI INSTRUCTIONS
    const contentPayload: any = [
      { 
        type: "text", 
        text: `You are Bharat AI by Himanshu Ranjan. Today's Date: ${aajKiDate}.
        
        STRICT RULES:
        - Use ONLY this Live Data for market/news: ${searchContext}
        - If the user asks for Nifty 50, find the latest number in the data and report it.
        - NEVER say "data not available" if there is info in the context.
        - Answer in humble Hinglish. Start with Namaste!` 
      }
    ];

    if (imageBase64) {
      contentPayload.push({ type: "image_url", image_url: { url: imageBase64 } });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{ role: "user", content: contentPayload }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Server error hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection fail ho gaya!" });
  }
}