import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys check karo!" });
    }

    // 📅 1. AUTO DATE (Ab ye hamesha current date uthayega)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. LIVE SEARCH (7 April 2026 ki taaza khabar)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: `${message} latest news today ${aajKiDate} India`, 
        gl: "in", 
        tbs: "qdr:h", // Sirf pichle 1 ghante ka data
        num: 3 
      }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "No live data found.";

    // 🧠 3. OPENROUTER CALL
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "X-Title": "Bharat AI"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [
          {
            role: "system",
            content: `You are Bharat AI by Himanshu Ranjan. 
            TODAY'S DATE: ${aajKiDate}.
            
            STRICT INSTRUCTIONS:
            - Use ONLY the provided LIVE DATA for news/scores.
            - Answer in humble Hinglish. Always start with "Namaste!".
            - If it's Tuesday, 7 April 2026, answer accordingly.
            - Keep responses professional yet friendly.`
          },
          { role: "user", content: `LIVE DATA: ${context}\n\nUSER QUESTION: ${message}` }
        ]
      })
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Maaf karna bhai, data nahi mil raha.";
    
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, network ya server ka lafda hai!" });
  }
}