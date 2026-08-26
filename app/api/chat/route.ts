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

    // 1. SIMPLE GREETINGS (Hi / Hello / Namaste)
    const isJustGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(lowerMsg);
    if (isJustGreeting && !imageBase64 && !fileBase64 && (!history || history.length === 0)) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein baat karna chahte hain?" });
    }

    // 2. CASUAL CHIT-CHAT (Kaise ho / kya haal chal)
    const isChitChat = /^(kaise ho|kya haal|kya haal hai|kya hal|sab badhiya|aur batao|kya chal raha hai|kya haal chal|kya haal samachar|haal chaal|haal samachar|sup|yo|wassup)$/i.test(lowerMsg);

    // 3. SEARCH INTENT DETECTION (Sirf tabhi search karega jab specific live facts puche jayein)
    const needsSearch = !isJustGreeting && !isChitChat && cleanMsg.length > 3 && /(today|aaj|latest|current|cm|dm|pm|nifty|sensex|score|match|weather|taaza|khabar|election|who is|kon h|kaha h|price)/i.test(cleanMsg);

    let searchContext = "";
    if (needsSearch && tavilyKey) {
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

    // 4. PERSONA & PROMPT
    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Aap ChatGPT/Gemini jaisa dynamic aur intelligent conversational assistant ho.
- Simple greetings ka normal polite greeting do.
- "Kya haal hai / kaise ho" ka warm aur friendly reply do ("Main badhiya hoon, aap batao...").
- Factual queries ka clear aur direct Hinglish me jawab do.
- Media links, credits ya raw snippets mention mat karo.`;

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `Search Data:\n${searchContext}\n\nUser Question: ${cleanMsg}`
      : cleanMsg;

    // 5. GROQ LLM CALL
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
            max_tokens: 400,
            temperature: 0.5
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

    // 6. SAFE ACCURATE FALLBACKS
    if (isJustGreeting) {
      return NextResponse.json({ reply: "Namaste! Main aapki kya madad kar sakta hoon?" });
    }
    if (isChitChat) {
      return NextResponse.json({ reply: "Main badhiya hoon! Aap batao, aaj kya help chahiye?" });
    }
    if (searchContext) {
      const clean = searchContext.replace(/https?:\/\/\S+/g, '').replace(/[@#]\S+/g, '').slice(0, 180);
      return NextResponse.json({ reply: `Namaste! Taza jaankari: ${clean}...` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapki kya madad kar sakta hoon?" });

  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ reply: "Namaste! Server me takneeki samasya aayi hai." });
  }
}
