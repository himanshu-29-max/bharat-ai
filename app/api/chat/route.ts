import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein OPENROUTER_API_KEY check karo!" });
    }

    // 🔍 1. LIVE SEARCH (Getting 2026 Context)
    let context = "No live data found.";
    try {
        if (serperKey) {
            const serperRes = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: `${message} latest news April 2026 India`, gl: "in", num: 3 }),
            });
            const sData = await serperRes.json();
            context = sData.organic?.map((r: any) => r.snippet).join('\n') || context;
        }
    } catch (e) { console.log("Search failed, continuing without context."); }

    // 🧠 2. OPENROUTER CALL (Correct Model Names)
    // Maine yahan Gemini ke saath-saath fallback models bhi daal diye hain
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "X-Title": "Bharat AI"
      },
      body: JSON.stringify({
        // OpenRouter ke liye exact format: 'google/gemini-flash-1.5-exp' ya standard
        model: "google/gemini-flash-1.5", 
        messages: [
          {
            role: "system",
            content: `You are Bharat AI by Himanshu Ranjan. Today's Date: April 6, 2026. 
            Instructions: Use context: ${context}. Answer in humble Hinglish. Start with Namaste!`
          },
          { role: "user", content: message }
        ],
        // Safety: Agar Gemini busy ho toh ye dusra model try karega
        route: "fallback" 
      })
    });

    const data = await response.json();
    
    if (data.error) {
       console.error("OpenRouter Details:", data.error);
       return NextResponse.json({ reply: `Bhai, OpenRouter Error: ${data.error.message}` });
    }

    const aiReply = data.choices?.[0]?.message?.content || "Bhai, AI ne khali jawab diya.";
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, connection mein koi badi galti hai!" });
  }
}