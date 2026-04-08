import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. Tuesday, 7 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. FORCE SEARCH (Agar message "hi" se bada hai, toh search hoga hi hoga)
    let searchContext = "";
    const cleanMsg = message?.trim().toLowerCase();
    
    if (cleanMsg && !imageBase64 && cleanMsg.length > 3) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${message} India live price news ${aajKiDate}`, 
            gl: "in", tbs: "qdr:h", num: 4 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search failed"); }
    }

    // 🧠 3. AI PROMPT (Strict Answer Policy)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}.
            
            STRICT RULES:
            1. If the user asks a specific question like "Bank Nifty" or "IPL", you MUST use this Live Data to answer: ${searchContext}
            2. DO NOT just give a general greeting. Answer the question FIRST, then you can be polite.
            3. If the user only says "hi", then only give a greeting.
            4. If data is available, give exact numbers/prices.
            5. Answer in humble Hinglish. Always start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Server error!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection fail ho gaya!" });
  }
}