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
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein jaankari chahiye?" });
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
            query: `${cleanMsg} 2026 India update`,
            search_depth: "basic",
            max_results: 4,
            include_answer: true
          }),
        });
        const tvData = await tvRes.json();
        if (tvData.answer) searchContext += `${tvData.answer}\n`;
        if (tvData.results?.length > 0) {
          searchContext += tvData.results.map((r: any) => r.content?.slice(0, 200)).join("\n");
        }
      } catch (err) {
        console.error("Tavily error:", err);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
User ke sawaal ka bilkul fresh, accurate aur human-like Hinglish mein direct jawab do (2-3 sentences max).
Live search context ko prioritize karo. Static purane data ko avoid karo.
Namaste! se shuru karo.`;

    // 3. Groq API Execution
    if (groqKey) {
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
            { role: "user", content: searchContext ? `Live Search Data:\n${searchContext}\n\nUser Question: ${cleanMsg}` : cleanMsg }
          ],
          max_tokens: 600,
          temperature: 0.2
        })
      });

      const gData = await groqRes.json();
      const reply = gData.choices?.[0]?.message?.content?.trim();
      
      if (reply) {
        return NextResponse.json({ reply });
      } else {
        console.error("Groq API response error:", JSON.stringify(gData));
      }
    }

    // 4. Dynamic Fallback (Search context summarize karega, static text nahi)
    if (searchContext) {
      const cleanSnippet = searchContext.replace(/https?:\/\/\S+/g, '').replace(/\n+/g, ' ').slice(0, 220);
      return NextResponse.json({ reply: `Namaste! Taza jaankari ke anusaar: ${cleanSnippet}` });
    }

    return NextResponse.json({ reply: "Namaste! Sawaal ka live data fetch nahi ho saka, kripya Vercel mein GROQ_API_KEY check karein." });

  } catch (err) {
    console.error("Chat fatal error:", err);
    return NextResponse.json({ reply: "Namaste! Server me dikkat aayi hai, kripya page refresh karein." });
  }
}
