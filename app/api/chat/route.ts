import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    // 📅 Today's Date: Tuesday, 14 April 2026
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const cleanMsg = message?.trim() || "";
    
    // 🔍 1. LIVE GOOGLE SEARCH LINKING
    let searchContext = "";
    
    // Agar user ne kuch pucha hai (sirf 'hi' nahi), toh Google Search trigger hoga
    if (cleanMsg && cleanMsg.length > 2) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 
            'X-API-KEY': serperKey || "", 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            q: `${cleanMsg} latest updates ${aajKiDate} India news`, 
            gl: "in", 
            num: 5 
          }),
        });
        const sData = await sRes.json();
        
        // Google Search se milne wale top 5 results ko context mein daalna
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || "";
      } catch (e) { 
        console.error("Google Search Linking Failed"); 
      }
    }

    // 🧠 2. AI RESPONSE GENERATION (Using Google Data)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `You are Bharat AI by Himanshu Ranjan. Today is ${aajKiDate}.
            
            GOAL: Answer the user's question by prioritizing this LIVE GOOGLE SEARCH DATA:
            ${searchContext}
            
            STRICT RULES:
            - If Google data is present, summarize it and give a factual answer.
            - If no data is found, tell the user you're checking live sources.
            - Answer in humble Hinglish. Always start with Namaste!` },
            ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
          ]
        }],
        max_tokens: 1000 // Jawab lamba aur detail mein ho sake
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Net issue hai bhai!" });

  } catch (err) {
    return NextResponse.json({ reply: "Connection failed with Google APIs!" });
  }
}
