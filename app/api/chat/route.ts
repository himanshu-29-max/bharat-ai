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
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis vishay mein jaankari chahiye?" });
    }

    // 2. Strict Topic Isolation (Do not mix states/entities)
    // Agar query mein direct entity (Delhi, Bihar, UP, DM, CM, PM) hai toh fresh search hogi
    const hasExplicitEntity = /(delhi|bihar|up|mumbai|kolkata|punjab|haryana|gujarat|rajasthan|cm|dm|pm|governor|mayor)/i.test(cleanMsg);
    
    let fullSearchQuery = cleanMsg;
    if (!hasExplicitEntity && Array.isArray(history) && history.length > 0) {
      const lastUserMsg = [...history].reverse().find((h: any) => h.role === "user")?.content || "";
      fullSearchQuery = `${lastUserMsg} ${cleanMsg}`;
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
User ke sawaal ka bilkul clear, accurate aur direct Hinglish mein jawab do.
STRICT RULES:
- Jo specific location ya post pucha gaya hai (e.g., Delhi CM, Bihar DM) sirf usi par focus karo. Doosre states ka data mix mat karo.
- Raw news website names (jaise hindustantimes, ndtv, india today) ya messy links bilkul mat bolo.
- Har jawab Namaste! se shuru karo.`;

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `Live Search Information:\n${searchContext}\n\nCurrent Question: ${cleanMsg}`
      : cleanMsg;

    // 4. Primary: Groq API Execution
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
        console.error("Groq execution error:", e);
      }
    }

    // 5. Cleaned Fallback (Stripping source domains/publishers)
    if (searchContext) {
      const cleanText = searchContext
        .replace(/https?:\/\/\S+/g, '')
        .replace(/(hindustantimes|ndtv|indiatoday|times of india|the hindu|indian express)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      const sentences = cleanText.split(/(?<=[.?!])\s+/);
      const safeSummary = sentences.slice(0, 2).join(' ');
      return NextResponse.json({ reply: `Namaste! Taaza jaankari ke anusaar: ${safeSummary}` });
    }

    return NextResponse.json({ reply: "Namaste! Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Chat route crash:", err);
    return NextResponse.json({ reply: "Namaste! Server me takneeki samasya aayi hai." });
  }
}
