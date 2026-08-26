import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, history = [], mode } = await req.json();

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

    const isImageMode = mode === "imagine" || /(image|photo|pic|tasveer)/i.test(cleanMsg);
    const cleanEntity = cleanMsg
      .replace(/(image banao|photo banao|generate image|draw|create image|ka image|ki image|ka photo|ki photo|photo|image|pic|tasveer|dikhao|bhejo)/gi, "")
      .trim() || cleanMsg;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📸 1. EXACT REAL PHOTO SEARCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isImageMode) {
      let realImageUrl = "";

      // Step A: Priority 1 - Exact Tavily Web Image Search
      if (tavilyKey) {
        try {
          const tvRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: `"${cleanEntity}" campus building photo official`,
              search_depth: "advanced",
              include_images: true,
              max_results: 5
            }),
          });
          const tvData = await tvRes.json();
          if (tvData.images && tvData.images.length > 0) {
            // Find an image that doesn't belong to random irrelevant scrapers
            const valid = tvData.images.find((u: string) => 
              typeof u === "string" && 
              u.startsWith("http") && 
              !u.includes("logo") && 
              !u.includes("icon") && 
              !u.includes("avatar")
            );
            if (valid) realImageUrl = valid;
          }
        } catch (e) {
          console.error("Tavily advanced photo fetch failed:", e);
        }
      }

      // Step B: Direct Exact Title Wikipedia Search (Only if exact match)
      if (!realImageUrl) {
        try {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanEntity)}&prop=pageimages&format=json&pithumbsize=1200&origin=*`
          );
          const wikiData = await wikiRes.json();
          const pages = wikiData?.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            if (pageId !== "-1" && pages[pageId]?.thumbnail?.source) {
              realImageUrl = pages[pageId].thumbnail.source;
            }
          }
        } catch (e) {
          console.error("Wiki photo error:", e);
        }
      }

      if (realImageUrl) {
        return NextResponse.json({
          reply: `✅ Yeh rahi **${cleanEntity}** ki real photograph!`,
          generatedImage: realImageUrl
        });
      }

      // Step C: Fallback AI Realism Generation
      try {
        const seed = Math.floor(Math.random() * 999999);
        const promptParam = encodeURIComponent(`Authentic real-life photograph of ${cleanEntity}, actual architecture, daytime daylight, 8k resolution`);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${promptParam}?width=1024&height=768&seed=${seed}&nologo=true&model=flux-realism`;

        const imgRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(20000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return NextResponse.json({
            reply: `✅ Yeh rahi **${cleanEntity}** ki image!`,
            generatedImage: `data:image/jpeg;base64,${base64}`
          });
        }
      } catch (e) {
        console.error("Fallback generation failed:", e);
      }

      return NextResponse.json({ reply: "Image fetch karne me samasya aayi, kripya dobara try karein!" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💬 2. CHAT HANDLER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const lowerMsg = cleanMsg.toLowerCase().replace(/[?.,!]/g, "").trim();
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(lowerMsg);
    if (isGreeting && (!history || history.length === 0)) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein baat karna chahte hain?" });
    }

    let searchContext = "";
    if (cleanMsg.length > 2 && tavilyKey) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${cleanMsg} India official details`,
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
User ke sawaal ka concise, accurate aur natural Hinglish me pura sentence complete karke jawab do. Namaste! se shuru karo.`;

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const userMessageContent = searchContext
      ? `Live Search Information:\n${searchContext}\n\nUser Question: ${cleanMsg}`
      : cleanMsg;

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
        console.error("Groq error:", e);
      }
    }

    if (searchContext) {
      const cleanText = searchContext.replace(/https?:\/\/\S+/g, '').replace(/[@#]\S+/g, '').slice(0, 250);
      return NextResponse.json({ reply: `Namaste! Jaankari ke anusaar: ${cleanText}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Fatal chat error:", err);
    return NextResponse.json({ reply: "Namaste! Server issue aaya hai, kripya refresh karein." });
  }
}
