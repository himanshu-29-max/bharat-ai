import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    if (!orKey) return NextResponse.json({ reply: "Bhai, OpenRouter Key missing hai!" });

    // 📅 1. AUTO DATE (India Timezone)
    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // 🔍 2. LIVE SEARCH (Sirf tab jab photo na ho, taaki context mile)
    let searchContext = "No live search performed.";
    if (!imageBase64 && message) {
      try {
        const serperRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey || "", 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `${message} latest news ${aajKiDate}`, gl: "in", tbs: "qdr:h", num: 3 }),
        });
        const sData = await serperRes.json();
        searchContext = sData.organic?.map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || searchContext;
      } catch (e) { console.log("Search failed"); }
    }

    // 🧠 3. BUILD MULTIMODAL PAYLOAD
    let contentPayload: any = [
      { 
        type: "text", 
        text: `You are Bharat AI by Himanshu Ranjan. 
        Today's Date: ${aajKiDate}.
        Live Context: ${searchContext}
        
        Instructions:
        - If an image is provided, analyze it deeply.
        - Use Markdown (Tables, Bold, Bullets) for clean output.
        - Answer in humble Hinglish. Always start with Namaste!
        
        User Question: ${message || "Explain this image"}` 
      }
    ];

    if (imageBase64) {
      contentPayload.push({
        type: "image_url",
        image_url: { url: imageBase64 }
      });
    }

    // 🚀 4. OPENROUTER CALL
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "X-Title": "Bharat AI"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{ role: "user", content: contentPayload }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Bhai, AI ne koi jawab nahi diya.";
    
    return NextResponse.json({ reply: aiReply });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, server side connection fail ho gaya!" });
  }
}