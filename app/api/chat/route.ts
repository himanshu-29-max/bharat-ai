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

    // 🔍 1. PRECISE LIVE SEARCH (Triggered on almost everything except 1-word hi)
    let searchContext = "";
    const cleanMsg = message?.trim() || "";
    
    // Agar message 1 word se bada hai ya usme news/haal/samachar jaise words hain, toh SEARCH KARO
    const needsSearch = cleanMsg.split(/\s+/).length > 1 || /news|haal|samachar|update|score|price|ipl|nifty/i.test(cleanMsg);

    if (cleanMsg && !imageBase64 && needsSearch) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${cleanMsg} India latest news today ${aajKiDate}`, 
            gl: "in", tbs: "qdr:h", num: 5 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Serper error"); }
    }

    // 🧠 2. AI PAYLOAD (Strict Answer-Only Mode)
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
            - If the user asks "Kya haal samachar h", use this Live News to give a summary: ${searchContext}
            - NEVER just say "Main aapki kaise madad kar sakta hoon" if the user asks for news or status.
            - Answer the user's intent DIRECTLY.
            - Don't talk about rules or instructions.
            - Use natural, friendly Hinglish. Start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Net slow hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection failed!" });
  }
}