import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, history = [] } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim() || process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim();
    const tavilyKey = process.env.NEXT_PUBLIC_TAVILY_API_KEY?.trim() || process.env.TAVILY_API_KEY?.trim();

    const now = new Date();
    const aajKiDate = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    if (!cleanMsg && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Kuch poochiye." });
    }

    // 1. Direct Greetings
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(cleanMsg.toLowerCase());
    if (isGreeting && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis vishay mein jaankari chahiye?" });
    }

    // 2. Real-time Search via Tavily
    let searchContext = "";
    if (tavilyKey && cleanMsg.length > 2) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${cleanMsg} India update`,
            search_depth: "basic",
            max_results: 3,
            include_answer: true
          }),
        });
        const tvData = await tvRes.json();
        if (tvData.answer) searchContext += `${tvData.answer} `;
        if (tvData.results?.length > 0) {
          searchContext += tvData.results.map((r: any) => r.content || "").join(" ");
        }
      } catch (err) {
        console.error("Tavily error:", err);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
User ke sawaal ka bilkul fresh, accurate aur human-like Hinglish mein direct jawab do.
Pura sentence complete karo, beech mein mat roko.
Har jawab Namaste! se shuru karo.`;

    // 3. Groq API Call
    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: searchContext ? `Search Context: ${searchContext}\n\nQuestion: ${cleanMsg}` : cleanMsg }
            ],
            max_tokens: 400,
            temperature: 0.2
          })
        });

        const gData = await groqRes.json();
        const reply = gData.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({ reply });
        }
      } catch (e) {
        console.error("Groq error:", e);
      }
    }

    // 4. Clean Sentence-Safe Fallback (Word cut nahi hoga)
    if (searchContext) {
      const cleanText = searchContext.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
      const sentences = cleanText.split(/(?<=[.?!])\s+/);
      const safeSummary = sentences.slice(0, 2).join(' '); // Poore sentences lega bina word kaate
      return NextResponse.json({ reply: `Namaste! Taaza jaankari ke anusaar: ${safeSummary}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Namaste! Server issue aaya hai, kripya refresh karein." });
  }
}
