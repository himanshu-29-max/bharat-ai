import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, history = [] } = await req.json();

    // Aapke Vercel ke exact variable names support karne ke liye:
    const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim();
    const tavilyKey = process.env.NEXT_PUBLIC_TAVILY_API_KEY?.trim() || process.env.TAVILY_API_KEY?.trim();
    const newsKey = process.env.NEWS_API_KEY?.trim();

    const now = new Date();
    const aajKiDate = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    if (!cleanMsg && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Kuch poochiye." });
    }

    // 1. Direct Greeting
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(cleanMsg.toLowerCase());
    if (isGreeting && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein jaankari chahiye?" });
    }

    // 2. Live Web Search (Tavily Search API)
    let searchContext = "";
    if (tavilyKey && cleanMsg.length > 2) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${cleanMsg} India latest`,
            search_depth: "basic",
            max_results: 3,
            include_answer: true
          }),
        });
        const tvData = await tvRes.json();
        if (tvData.answer) searchContext += `${tvData.answer}\n`;
        if (tvData.results?.length > 0) {
          searchContext += tvData.results.map((r: any) => r.content?.slice(0, 200)).join("\n");
        }
      } catch (err) {
        console.error("Tavily search failed:", err);
      }
    }

    // 3. News Fallback
    if (!searchContext && newsKey && /(news|khabar|taza|samachar)/i.test(cleanMsg)) {
      try {
        const nr = await fetch(`https://newsapi.org/v2/top-headlines?country=in&pageSize=3&apiKey=${newsKey}&q=${encodeURIComponent(cleanMsg)}`);
        const nd = await nr.json();
        if (nd.articles?.length > 0) {
          searchContext += nd.articles.map((a: any) => a.title).join("\n");
        }
      } catch (e) {
        console.error("News API failed:", e);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
User ke sawaal ka accurate, informative aur seedha Hinglish mein jawab do (2-3 lines).
Har jawab Namaste! se shuru karo.`;

    const userPrompt = searchContext
      ? `${systemPrompt}\n\nLive Search Data:\n${searchContext}\n\nQuestion: ${cleanMsg}`
      : `${systemPrompt}\n\nQuestion: ${cleanMsg}`;

    let reply = "";

    // 4. Groq Llama 3.1 Call
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
              { role: "user", content: searchContext ? `Search Info:\n${searchContext}\n\nQuestion: ${cleanMsg}` : cleanMsg }
            ],
            max_tokens: 500,
            temperature: 0.2
          })
        });
        const gData = await groqRes.json();
        reply = gData.choices?.[0]?.message?.content?.trim() || "";
      } catch (e) {
        console.error("Groq execution failed:", e);
      }
    }

    // 5. Final Safe Fallback (In case Groq key fails)
    if (!reply) {
      if (/bihar.*(cm|chief|mukhya)/i.test(cleanMsg) && !/deputy|up/i.test(cleanMsg)) {
        reply = "Namaste! Bihar ke Chief Minister Nitish Kumar hain.";
      } else if (/bihar.*(deputy|up.*mukhya)/i.test(cleanMsg)) {
        reply = "Namaste! Bihar ke Deputy Chief Ministers Samrat Choudhary aur Vijay Kumar Sinha hain.";
      } else if (searchContext) {
        reply = `Namaste! Latest updates ke anusaar:\n${searchContext.slice(0, 200)}...`;
      } else {
        reply = "Namaste! Main aapka sawaal samajh gaya hoon, kripya thodi der baad dobara poochiye.";
      }
    }

    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Namaste! Server me takneeki samasya aayi hai." });
  }
}