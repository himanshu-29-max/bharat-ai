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

    const lowerMsg = cleanMsg.toLowerCase().replace(/[?.,!]/g, "").trim();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📸 1. REAL PHOTO FETCH ENGINE (Real Places, Colleges, People, Products)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const isImageQuery = mode === "imagine" || /(image|photo|pic|tasveer|picture)/i.test(cleanMsg);
    const cleanEntityName = cleanMsg
      .replace(/(image banao|photo banao|generate image|draw|create image|ka image|ki image|ka photo|ki photo|photo|image|pic|tasveer|dikhao|bhejo)/gi, "")
      .trim();

    // Check if prompt is a real world entity vs pure imagination
    const isImaginative = /(flying|cyberpunk|anime|superhero|space robot|dragon|alien|illustration|painting|3d render|cartoon)/i.test(cleanMsg);

    if (isImageQuery && !isImaginative && cleanEntityName.length > 2) {
      let realImageUrl = "";

      // Step A: Fetch via Tavily with Image search enabled
      if (tavilyKey) {
        try {
          const tvRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: `${cleanEntityName} official photo campus building`,
              search_depth: "basic",
              include_images: true,
              max_results: 3
            }),
          });
          const tvData = await tvRes.json();
          if (tvData.images && tvData.images.length > 0) {
            realImageUrl = tvData.images[0];
          }
        } catch (e) {
          console.error("Tavily image error:", e);
        }
      }

      // Step B: Fetch via Wikipedia / Wikimedia API (Direct Real Photo Backup)
      if (!realImageUrl) {
        try {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanEntityName)}&prop=pageimages&format=json&pithumbsize=1000&origin=*`
          );
          const wikiData = await wikiRes.json();
          const pages = wikiData.query?.pages;
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
          reply: `✅ Yeh rahi **${cleanEntityName}** ki real photograph!`,
          generatedImage: realImageUrl
        });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 2. AI CREATIVE GENERATION (For pure art & fictional concepts)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isImageQuery) {
      try {
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent((cleanEntityName || cleanMsg) + ", photorealistic, 4k, hyper-detailed real life photograph")}?width=800&height=600&seed=${seed}&nologo=true&model=flux`;

        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return NextResponse.json({
            reply: `✅ Yeh rahi aapki image!`,
            generatedImage: `data:image/jpeg;base64,${base64}`
          });
        }
      } catch (e) {
        console.error("Pollinations generation error:", e);
      }
      return NextResponse.json({ reply: "Image load nahi ho payi, kripya dobara try karein!" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💬 3. CONVERSATIONAL CHAT & LIVE INFO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(lowerMsg);
    if (isGreeting && !imageBase64 && !fileBase64 && (!history || history.length === 0)) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein baat karna chahte hain?" });
    }

    const isChitChat = /^(kaise ho|kya haal|kya haal hai|kya hal|sab badhiya|aur batao|kya chal raha hai|sup|yo|wassup|kaise ho bhai)$/i.test(lowerMsg);
    if (isChitChat && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Main ekdum badhiya hoon bhai! Aap batao, aaj kya help chahiye?" });
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
Aap ek intelligent, natural aur helpful AI assistant ho (jaise ChatGPT/Gemini).
User ke sawaal ka concise, accurate aur natural Hinglish me pura sentence complete karke jawab do.
Namaste! se shuru karo.`;

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
        console.error("Groq execution failed:", e);
      }
    }

    if (searchContext) {
      const cleanText = searchContext.replace(/https?:\/\/\S+/g, '').replace(/[@#]\S+/g, '').slice(0, 250);
      return NextResponse.json({ reply: `Namaste! Jaankari ke anusaar: ${cleanText}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Chat route fatal:", err);
    return NextResponse.json({ reply: "Namaste! Server me takneeki samasya aayi hai." });
  }
}
