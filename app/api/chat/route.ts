import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Wednesday, 8 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 1. PRECISE SEARCH
    let searchContext = "";
    if (message && !imageBase64 && message.length > 2) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${message} latest match schedule today ${aajKiDate} live result`, 
            gl: "in", tbs: "qdr:d", num: 5 
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search failed"); }
    }

    // 🧠 2. AI INSTRUCTIONS (Strict Answer Delivery)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today's Date: ${aajKiDate}.

            COMMANDS:
            1. User asked: "${message}". You MUST answer this directly.
            2. Use this LIVE DATA: ${searchContext}
            3. NEVER say "Tell me what you'd like to know". You are here to ANSWER, not ask.
            4. If the data says a match is there, give names. If the match is not there (like PSL is over in April), clearly say: "Bhai, PSL abhi nahi chal raha hai, April mein IPL hota hai."
            5. Don't be a robot. Be a helpful partner to Himanshu. Answer in natural Hinglish.` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Connection slow hai, ruko!" });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, error aa gaya server mein!" });
  }
}