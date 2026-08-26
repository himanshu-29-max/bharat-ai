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

    // 2. Extract Context from Conversation History (Memory Context)
    const recentContext = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `${h.role === "user" ? "User" : "AI"}: ${h.content}`)
          .join("\n")
      : "";

    // Search query with context (agar pichla topic Bihar tha, toh search me Bihar context include hoga)
    const contextKeywords = Array.isArray(history)
      ? history.slice(-4).filter((h: any) => h.role === "user").map((h: any) => h.content).join(" ")
      : "";

    const fullSearchQuery = contextKeywords 
      ? `${contextKeywords} ${cleanMsg} India`
      : `${cleanMsg} India update`;

    // 3. Real-time Search via Tavily
    let searchContext = "";
    if (tavilyKey && cleanMsg.length > 2 && !isGreeting) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: fullSearchQuery,
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
User ke sawaal ka concise, accurate aur natural Hinglish mein direct jawab do.
Pichli conversation ka context yaad rakho (jaise agar pehle Bihar ki baat ho rahi thi aur user ne 'deputy cm' pucha, toh Bihar ke deputy CM ke baare mein batao).
Har jawab Namaste! se shuru karo.`;

    // Formulate clean history for Groq API
    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `Search Context:\n${searchContext}\n\nQuestion: ${cleanMsg}`
      : cleanMsg;

    // 4. Groq API Call with Full Memory History
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

    // 5. Fallback with Sentence Completion
    if (searchContext) {
      const cleanText = searchContext.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
      const sentences = cleanText.split(/(?<=[.?!])\s+/);
      const safeSummary = sentences.slice(0, 2).join(' ');
      return NextResponse.json({ reply: `Namaste! Taaza jaankari ke anusaar: ${safeSummary}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Namaste! Server issue aaya hai, kripya refresh karein." });
  }
}
