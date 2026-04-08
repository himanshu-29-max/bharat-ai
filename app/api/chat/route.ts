import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. Date (Wednesday, 8 April 2026)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. STRICT CONDITIONAL SEARCH
    let searchContext = "";
    const cleanMsg = message?.trim().toLowerCase();
    
    // Sirf tab search karo jab sawal "hi/hello" na ho aur length 3 se zyada ho
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|hola|hii|hiii)$/i.test(cleanMsg);

    if (cleanMsg && !imageBase64 && !isGreeting && cleanMsg.length > 3) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `IPL match today April 8 2026 schedule live teams`, 
            gl: "in", tbs: "qdr:d", num: 3 
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
            1. If the user just says "Hi" or any greeting, ONLY say: "Namaste! Main Bharat AI hoon. Main aapki kaise madad kar sakta hoon?"
            2. NEVER give match or stock data on a greeting.
            3. If a question is asked, use this FRESH data: ${searchContext}
            4. Verify team names carefully. If today is April 8, 2026, and the match is DC vs GT, only say that.
            5. Answer in natural Hinglish. Always start with Namaste!` },
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