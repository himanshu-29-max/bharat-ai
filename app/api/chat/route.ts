import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. AUTO DATE (Strictly Today)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. LIVE SEARCH (Force 2026)
    let context = "No live data found.";
    if (!imageBase64 && message) {
      const sRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          q: `${message} latest update ${aajKiDate} IPL 2026`, 
          gl: "in", tbs: "qdr:h" 
        }),
      });
      const sData = await sRes.json();
      context = sData.organic?.map((r: any) => r.snippet).join('\n') || context;
    }

    // 🧠 3. AI PROMPT
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}. 
            STRICT: Ignore any data from 2024 or 2025. Only use this live data: ${context}.
            Answer in humble Hinglish. User Question: ${message || "Explain image"}` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Data nahi mila!" });
  } catch (err) {
    return NextResponse.json({ reply: "Bhai, connection error hai!" });
  }
}