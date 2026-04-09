import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Today's Date: Thursday, 9 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const cleanMsg = message?.trim() || "";
    const isJustGreeting = /^(hi|hello|hey|namaste|नमस्ते|hola|hii|hiii)$/i.test(cleanMsg);

    // 🔍 1. CONDITIONAL SEARCH (Only search if it's NOT a greeting)
    let searchContext = "";
    if (cleanMsg && !imageBase64 && !isJustGreeting && cleanMsg.length > 2) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${cleanMsg} latest news India today ${aajKiDate}`, 
            gl: "in", tbs: "qdr:h", num: 4 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search failed"); }
    }

    // 🧠 2. AI PROMPT (Strict Compliance)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}.
            
            STRICT RESPONSE RULES:
            1. If the user message is just a greeting (like Hi, Hello), ONLY say: "Namaste! Main Bharat AI hoon. Main aapki kaise madad kar sakta hoon?"
            2. NEVER give news, stock, or match data on a greeting unless explicitly asked.
            3. If a specific question is asked, use this Live Data to answer directly: ${searchContext}
            4. Use natural Hinglish. Don't be robotic or over-enthusiastic.` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Server error!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection failed!" });
  }
}