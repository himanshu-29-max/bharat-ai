import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Today's Date: Wednesday, 8 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 1. LIVE SEARCH
    let searchContext = "";
    const cleanMsg = message?.trim() || "";
    
    if (cleanMsg && !imageBase64 && cleanMsg.length > 2) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${cleanMsg} latest India news today ${aajKiDate}`, 
            gl: "in", tbs: "qdr:h", num: 5 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search error"); }
    }

    // 🧠 2. AI PROMPT (Strict Natural Hinglish)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}.
            
            STRICT STYLE RULES:
            - Answer the user's question using this data: ${searchContext}
            - Use NATURAL HINGLISH. Avoid heavy Sanskrit/Urdu words.
            - Example: Use "Strait" instead of "Jaladamrumadhya", "Meeting" instead of "Shirkat", "Price" instead of "Bhav".
            - Talk like a normal Indian friend. Keep it short and crisp.
            - Start with a simple "Namaste!".` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Net ka chakkar hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection failed!" });
  }
}