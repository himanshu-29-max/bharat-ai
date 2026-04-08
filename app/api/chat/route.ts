import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Aaj ki sahi Date (India Time)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 SMART SEARCH LOGIC
    let searchContext = "";
    const cleanMsg = message?.trim().toLowerCase();

    // Agar message sirf "hi/hello" hai toh search mat karo, 
    // par agar message mein "Nifty", "IPL", "Match" ya koi sawal hai, toh FORCE SEARCH karo.
    const isJustHi = /^(hi|hello|hey|नमस्ते)$/i.test(cleanMsg);

    if (cleanMsg && !imageBase64 && !isJustHi) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${cleanMsg} India news today ${aajKiDate}`, 
            gl: "in", tbs: "qdr:h", num: 5 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search error"); }
    }

    // 🧠 AI INSTRUCTIONS
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
            1. If the user asks a question (like Nifty, IPL, or Weather), use this Live Data: ${searchContext}
            2. Answer the question DIRECTLY. Do not repeat your instructions.
            3. If the message is just "hi", say "Namaste! Main Bharat AI hoon. Main aapki kaise madad kar sakta hoon?"
            4. If a question was asked, do NOT ask "How can I help?". Give the answer immediately.
            5. Use Markdown tables for numbers and keep the tone Hinglish.` },
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