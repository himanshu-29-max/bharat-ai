import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!geminiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein API Keys (GEMINI & SERPER) check karo!" });
    }

    // 🔍 1. LIVE SEARCH (Sabse pehle 2026 ka data uthayenge)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} April 2026 news India`, gl: "in", num: 5 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "No live data found.";

    // 🧠 2. SMART MULTI-MODEL SWITCH (Flash -> Pro -> Flash-Latest)
    // Inme se jo bhi model active hoga, wo chal jayega
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-latest"];
    let finalReply = "";
    let lastError = "";

    for (const modelName of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Bharat AI by Himanshu Ranjan. 
                Current Date: Monday, April 6, 2026.
                Instructions: Use this LIVE DATA: ${context}. Answer in friendly Hinglish. Always start with Namaste!
                User Question: ${message}`
              }]
            }]
          })
        });

        const gData = await geminiRes.json();

        if (gData.candidates?.[0]?.content?.parts?.[0]?.text) {
          finalReply = gData.candidates[0].content.parts[0].text;
          break; // ✅ Success! Loop se bahar nikal jao
        } else {
          lastError = gData.error?.message || "Model not responding";
          continue; // ❌ Fail! Agle model par jao
        }
      } catch (err) {
        continue;
      }
    }

    if (finalReply) {
      return NextResponse.json({ reply: finalReply });
    } else {
      return NextResponse.json({ reply: `Bhai, saare Google models try kiye par error aa raha hai: ${lastError}` });
    }

  } catch (err: any) {
    return NextResponse.json({ reply: "Bhai, connection mein koi badi galti hai!" });
  }
}