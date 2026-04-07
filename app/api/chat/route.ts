import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. Current Date (Tuesday, 7 April 2026)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. DYNAMIC LIVE SEARCH (Keyword Based)
    let searchContext = "";
    if (message && !imageBase64) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            // Query ko force kiya hai strictly user ke question par
            q: `${message} NSE India live update ${aajKiDate} current price`, 
            gl: "in", 
            tbs: "qdr:h", // Sirf pichle 1 ghante ka fresh data
            num: 2 
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
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today's Date: ${aajKiDate}.
            
            STRICT RULES:
            - User asked about: "${message}".
            - Answer ONLY based on this Live Data: ${searchContext}
            - If the user asks about Bank Nifty, do NOT talk about Cricket or IPL.
            - Give the exact closing or current price from the data.
            - Answer in humble Hinglish. Start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Server busy hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection error!" });
  }
}