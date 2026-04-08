import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 1. Wednesday, 8 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. FORCE SEARCH (Humesha data fetch karo)
    let searchContext = "";
    if (message && !imageBase64) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${message} IPL 2026 match schedule today ${aajKiDate} live`, 
            gl: "in", tbs: "qdr:d", num: 5 // Last 24 hours results
          }),
        });
        const sData = await sRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { console.error("Search error"); }
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
            
            CRITICAL RULES:
            1. DO NOT say "Check karta hu" or "Mujhe jaankari nahi mili".
            2. Use this search data to give a FINAL ANSWER: ${searchContext}
            3. If the data shows a match for April 8, 2026, tell the team names and time.
            4. If no match is scheduled, clearly state "Aaj koi match nahi hai".
            5. Answer in humble Hinglish. Always start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Connection slow hai, please wait." });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, error aa gaya!" });
  }
}