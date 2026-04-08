import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Today's Date: Wednesday, 8 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 1. DYNAMIC SEARCH (Specifically looking for current news/scores)
    let searchContext = "";
    const cleanMsg = message?.trim() || "";
    
    // Sirf meaningful questions par search trigger hoga
    if (cleanMsg && !imageBase64 && cleanMsg.length > 2) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: `${cleanMsg} latest update ${aajKiDate} live news India`, 
            gl: "in", tbs: "qdr:h", num: 5 
          }),
        });
        const sData = await sRes.json();
        // Extracting only relevant snippets
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "No fresh data found.";
      } catch (e) { console.error("Serper API error"); }
    }

    // 🧠 2. AI PAYLOAD (Strict Answer-Only Mode)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${orKey}`, 
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bharat-ai.com", // Branding
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: `You are Bharat AI, a helpful and humble assistant created by Himanshu Ranjan. 
              Today is ${aajKiDate}. 

              STRICT OPERATING PROCEDURES:
              - If the user asks a question, answer it IMMEDIATELY using this data: ${searchContext}
              - NEVER mention "rules", "instructions", "okay Himanshu", or "I am ready".
              - NEVER speak about your backend configuration or the date unless the user asks for it.
              - If it's a greeting like 'Hi', respond with a warm 'Namaste! Main aapki kaise madad kar sakta hoon?'.
              - For sports or finance questions, provide exact numbers/scores in a clean format.
              - Always speak in natural, friendly Hinglish.
              
              User Query: ${message}` 
            },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }],
        temperature: 0.7, // Making it feel more human
        max_tokens: 500
      })
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Maaf karna bhai, server thoda slow hai. Ek baar fir se try karo!";

    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    console.error("Critical API Error:", err);
    return NextResponse.json({ reply: "Connection mein lafda hai, net check karo!" });
  }
}