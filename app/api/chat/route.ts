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

    // 1. CHATGPT / GEMINI STYLE INTENT CLASSIFICATION
    // Casual chit-chat / greetings ko search se isolate karein
    const isCasualChat = /^(hi|hello|hey|namaste|hii|helo|kaise ho|kya haal|kya hal|sab badhiya|aur batao|kya chal raha hai|kya haal chal|kya haal samachar|haal chaal|haal samachar|sup|yo|wassup|who are you|kon ho|kya kr rhe ho)$/i.test(
      cleanMsg.replace(/[?.,!]/g, "").trim().toLowerCase()
    );

    // Explicit current news/facts trigger
    const needsWebSearch = !isCasualChat && cleanMsg.length > 3 && /(aaj ka|today|latest|current|cm|dm|pm|nifty|sensex|share price|score|match|weather|taaza khabar|headline|result|election)/i.test(cleanMsg);

    // 2. SEARCH ONLY WHEN ACTUALLY NEEDED
    let searchContext = "";
    if (needsWebSearch && tavilyKey) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${cleanMsg} India updates`,
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

    // 3. GEMINI/CHATGPT STYLE SYSTEM PERSONA
    const systemPrompt = `Tu Bharat AI hai, jise develop kiya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Aap ek smart, friendly, intelligent aur adaptive AI companion ho (bilkul ChatGPT/Gemini ki tarah).

BEHAVIOR RULES:
1. Agar user casual baat kare ("kya haal chal", "kaise ho", "aur batao"), toh natural dost ki tarah casual, warm aur conversational Hinglish me reply do. Faltu me news headlines dump mat karo.
2. Agar user koi factual/current question puche, toh search data ka use karke seedha aur accurate answer do.
3. Hashtags (#), raw URLs, ya media credits (FilterCopy, Times of India etc.) kabhi mat bolo.
4. Response clean, helpful aur engaging hona chahiye.`;

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `[Live Web Data]:\n${searchContext}\n\n[User Question]: ${cleanMsg}`
      : cleanMsg;

    // 4. GROQ API LLM CALL (Full conversational generation)
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
            max_tokens: 450,
            temperature: 0.6 // Natural human-like tone
          })
        });

        const gData = await groqRes.json();
        const reply = gData.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({ reply });
        }
      } catch (e) {
        console.error("Groq generation failed:", e);
      }
    }

    // 5. NATURAL CASUAL FALLBACK (Agar API down ho)
    if (isCasualChat) {
      return NextResponse.json({
        reply: "Sab ekdum badhiya bhai! Aap batao, aaj kya plan hai ya kya naya sikhna/poochna chahte ho?"
      });
    }

    if (searchContext) {
      const clean = searchContext.replace(/https?:\/\/\S+/g, '').replace(/[@#]\S+/g, '').slice(0, 200);
      return NextResponse.json({ reply: `Namaste! Taaza jaankari: ${clean}` });
    }

    return NextResponse.json({ reply: "Main bilkul badhiya hoon! Aap bataiye main aapki kya madad kar sakta hoon?" });

  } catch (err) {
    console.error("Chat route fatal error:", err);
    return NextResponse.json({ reply: "Main samajh nahi paaya, kripya dobara likhein!" });
  }
}
