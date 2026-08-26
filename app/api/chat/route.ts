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

    const lowerMsg = cleanMsg.toLowerCase().replace(/[?.,!]/g, "").trim();

    // 1. GREETINGS & CASUAL INTENTS
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(lowerMsg);
    if (isGreeting && !imageBase64 && !fileBase64 && (!history || history.length === 0)) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein baat karna chahte hain?" });
    }

    const isChitChat = /^(kaise ho|kya haal|kya haal hai|kya hal|sab badhiya|aur batao|kya chal raha hai|kya haal chal|sup|yo|wassup|kaise ho bhai)$/i.test(lowerMsg);
    if (isChitChat && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Main ekdum badhiya hoon bhai! Aap batao, aaj kya janna ya poochna chahte ho?" });
    }

    // 2. LIVE WEB SEARCH VIA TAVILY
    const needsSearch = cleanMsg.length > 2 && /(today|aaj|latest|current|cm|dm|pm|nifty|sensex|score|match|weather|khabar|election|who is|kon h|kaha h|price|minister|governor)/i.test(cleanMsg);

    let searchContext = "";
    if (needsSearch && tavilyKey) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${cleanMsg} India official update`,
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

    // 3. SYSTEM PROMPT (ChatGPT / Gemini Style Natural Tone)
    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Aap ek intelligent, natural aur helpful AI assistant ho.
- User ke sawaal ka concise, accurate aur natural Hinglish me pura sentence complete karke jawab do.
- Kisi bhi word ya sentence ko adha mat chhoro.
- Jo sawaal pucha gaya hai sirf uska direct jawab do.
- Namaste! se shuru karo.`;

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `Live Search Information:\n${searchContext}\n\nUser Question: ${cleanMsg}`
      : cleanMsg;

    // 4. GROQ API CALL
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
            max_tokens: 500,
            temperature: 0.3
          })
        });

        const gData = await groqRes.json();
        const reply = gData.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({ reply });
        }
      } catch (e) {
        console.error("Groq execution failed:", e);
      }
    }

    // 5. NO TRUNCATION CLEAN FALLBACK
    if (searchContext) {
      const cleanText = searchContext
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[@#]\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const sentences = cleanText.split(/(?<=[.?!])\s+/);
      const completeSentences = sentences.slice(0, 2).join(' ');
      return NextResponse.json({ reply: `Namaste! Taza jaankari: ${completeSentences}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Chat route fatal:", err);
    return NextResponse.json({ reply: "Namaste! Server me takneeki samasya aayi hai." });
  }
}
