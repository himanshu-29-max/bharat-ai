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
    if (isGreeting && !imageBase64 && !fileBase64 && (!history || history.length === 0)) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein jaankari chahiye?" });
    }

    // 2. Smart Query Builder (Clean context detection)
    const isContextual = /^(unka|inka|uska|iska|wahan|ye|woh|aur|then|who is he|who is she|unke|inke)$/i.test(cleanMsg) || cleanMsg.split(" ").length <= 3;
    
    let fullSearchQuery = cleanMsg;
    if (isContextual && Array.isArray(history) && history.length > 0) {
      const lastUserMsg = [...history].reverse().find((h: any) => h.role === "user")?.content || "";
      // Only combine if the message doesn't introduce an independent topic like "darbhanga dm"
      const hasIndependentEntity = /(dm|collector|sp|mla|mp|minister|university|college|weather|population)/i.test(cleanMsg);
      if (!hasIndependentEntity) {
        fullSearchQuery = `${lastUserMsg} ${cleanMsg}`;
      }
    }

    // 3. Real-time Search via Tavily
    let searchContext = "";
    if (tavilyKey && cleanMsg.length > 2 && !isGreeting) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${fullSearchQuery} latest official`,
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
        console.error("Tavily search error:", err);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
User ke current sawaal ka exact, direct aur clean Hinglish mein jawab do.
Jo sawaal pucha gaya hai sirf usi ka jawab do. Pichle un-related topics (jaise Deputy CM agar DM pucha gaya hai) ko faltu mein mention mat karo.
Har jawab Namaste! se shuru karo.`;

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `Live Search Information:\n${searchContext}\n\nCurrent Question: ${cleanMsg}`
      : cleanMsg;

    // 4. Groq API Call
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
              ...formattedHistory,
              { role: "user", content: userMessageContent }
            ],
            max_tokens: 350,
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

    // 5. Clean Fallback
    if (searchContext) {
      const cleanText = searchContext.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
      const sentences = cleanText.split(/(?<=[.?!])\s+/);
      const safeSummary = sentences.slice(0, 2).join(' ');
      return NextResponse.json({ reply: `Namaste! Taaza jaankari ke anusaar: ${safeSummary}` });
    }

    return NextResponse.json({ reply: "Namaste! Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Namaste! Server error aaya hai." });
  }
}
