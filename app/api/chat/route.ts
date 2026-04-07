import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. AUTO DATE (Strictly 7 April 2026)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. LIVE SEARCH (Only if no image, or if user asks a question with image)
    let searchContext = "";
    if (message && message.length > 2) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${message} latest update today ${aajKiDate} IPL 2026`, 
            gl: "in", tbs: "qdr:h" 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => r.snippet).join('\n') || "";
      } catch (e) { console.log("Search error"); }
    }

    // 🧠 3. AI PAYLOAD (Vision + Search Context)
    const contentPayload: any = [
      { 
        type: "text", 
        text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}.
        
        STRICT RULES:
        - Use this LIVE DATA for current events: ${searchContext}
        - If the user asks about today's IPL, check the live data and answer specifically for April 7, 2026.
        - Answer in humble Hinglish. Always start with Namaste!
        
        User Query: ${message || "Explain this image"}` 
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
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Data nahi mila!" });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, connection error hai!" });
  }
}