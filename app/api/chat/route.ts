import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys check karo!" });
    }

    // 📅 1. AUTO DATE (India Timezone)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. LIVE SEARCH (Context for all topics)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: `${message} latest update ${aajKiDate} India`, 
        gl: "in", tbs: "qdr:h", num: 3 
      }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "No live data found.";

    // 🧠 3. OPENROUTER CALL (Full Markdown Support)
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
            content: `You are Bharat AI by Himanshu Ranjan. Today's Date: ${aajKiDate}.
            
            OUTPUT RULES:
            1. Use **Markdown Tables** for financial data or match scores.
            2. Use **Bullet Points** for news updates.
            3. Use **Bold** for key names, prices, or numbers.
            4. If the user asks for code, use **Code Blocks** with language highlighting.
            5. Always start with "Namaste!".
            6. Language: Natural Hinglish.`
          },
          { role: "user", content: `LIVE DATA: ${context}\n\nUSER QUESTION: ${message}` }
        ]
      })
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Maaf karna bhai, data nahi mil raha.";
    
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, server error hai!" });
  }
}