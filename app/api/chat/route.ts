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

    // 🔍 1. FORCE LIVE SEARCH
    let searchContext = "";
    const cleanMsg = message?.trim() || "";
    
    // Agar message mein 'news', 'haal', 'samachar' hai, toh SEARCH trigger hoga hi hoga
    const isNewsQuery = /news|haal|samachar|khabar|update|today|aaj/i.test(cleanMsg);

    if (cleanMsg && !imageBase64 && (cleanMsg.length > 2 || isNewsQuery)) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `latest top India news headlines today ${aajKiDate}`, 
            gl: "in", tbs: "qdr:h", num: 6 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search failed"); }
    }

    // 🧠 2. AI PROMPT (Strict Response Policy)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}.
            
            STRICT COMMANDS:
            1. User asked: "${message}". If this is about news/haal-samachar, you MUST provide the top news headlines immediately.
            2. Use this Live Data: ${searchContext}
            3. NEVER say "kaunsi khabar jaan-ni hai" or "tell me what you want to know". Just give the info.
            4. Use simple Hinglish (Strait instead of Jaladamrumadhya).
            5. Talk like a smart friend, not a robot. Start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Net issue hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection failed!" });
  }
}