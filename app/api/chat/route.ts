import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, history = [] } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();

    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const cleanMsg = message?.trim() || "";

    const isNewsQuery = /(news|aaj|today|latest|abhi|current|price|rate|score|match|result|election|weather)/i.test(cleanMsg);
    const searchQuery = isNewsQuery
      ? `${cleanMsg} India ${new Date().getFullYear()}`
      : cleanMsg;

    let searchContext = "";
    if (cleanMsg.length > 3) {
      try {
        const sRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperKey || "",
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ q: searchQuery, gl: "in", num: 5 }),
        });
        const sData = await sRes.json();
        const results = sData.organic?.slice(0, 5) || [];
        if (results.length > 0) {
          searchContext = results
            .map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`)
            .join('\n\n');
        }
      } catch (e) {
        console.error("Search failed:", e);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne.
Aaj ki date: ${aajKiDate}.
Tu ek helpful, accurate aur honest AI assistant hai.
Hinglish mein jawab de — simple, clear aur factual.

RULES:
- Agar neeche Google Search data diya gaya hai, toh USI se jawab de. Apni taraf se kuch mat banao.
- Agar search data relevant nahi hai ya nahi mila, toh apni knowledge se jawab de — lekin clearly bol "Meri knowledge ke basis pe:".
- Kabhi bhi galat ya made-up information mat dena.
- Agar kuch pata nahi, bol do "Mujhe is baare mein pakka pata nahi."
- Conversation ka context yaad rakho — agar user "ye", "woh", "iska" jaise words use kare toh pichli baaton se samjho.
- Har jawab Namaste! se shuru karo.`;

    const userContent: any[] = [];

    if (searchContext) {
      userContent.push({
        type: "text",
        text: `--- LIVE GOOGLE SEARCH RESULTS ---\n${searchContext}\n--- END OF SEARCH RESULTS ---\n\nUser ka sawaal: ${cleanMsg}`
      });
    } else {
      userContent.push({
        type: "text",
        text: `User ka sawaal: ${cleanMsg}`
      });
    }

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageBase64 }
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-6),
          { role: "user", content: userContent }
        ],
        max_tokens: 1200,
        temperature: 0.3
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("OpenRouter response:", JSON.stringify(data));
      return NextResponse.json({ reply: "Kuch technical dikkat aa gayi, dobara try karo!" });
    }

    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Connection fail ho gayi, thodi der baad try karo!" });
  }
}
