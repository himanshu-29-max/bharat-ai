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
    // 📸 1. REAL PHOTO ENGINE (Direct Web Search & Wikipedia Thumbnail)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isImageMode) {
      let realImageUrl = "";

      // Step A: Wikipedia Live Page Image Search (Sabse Accurate Real Photos)
      try {
        const wikiSearchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=${encodeURIComponent(cleanEntity)}&prop=pageimages&pithumbsize=1200`
        );
        const wikiData = await wikiSearchRes.json();
        const pages = wikiData?.query?.pages;
        if (pages) {
          const firstPageKey = Object.keys(pages)[0];
          if (pages[firstPageKey]?.thumbnail?.source) {
            realImageUrl = pages[firstPageKey].thumbnail.source;
          }
        }
      } catch (e) {
        console.error("Wikipedia image scrape failed:", e);
      }

      // Step B: Tavily Live Images Search
      if (!realImageUrl && tavilyKey) {
        try {
          const tvRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: `${cleanEntity} campus building official photo`,
              search_depth: "basic",
              include_images: true,
              max_results: 5
            }),
          });
          const tvData = await tvRes.json();
          if (tvData.images && tvData.images.length > 0) {
            // Filter valid image URLs
            const validImg = tvData.images.find((img: string) => img.startsWith("http") && !img.includes("favicon"));
            if (validImg) realImageUrl = validImg;
          }
        } catch (e) {
          console.error("Tavily image error:", e);
        }
      }

      // Agar Real Photo mil gayi toh direct actual picture return karein
      if (realImageUrl) {
        return NextResponse.json({
          reply: `✅ Yeh rahi **${cleanEntity}** ki real photograph!`,
          generatedImage: realImageUrl
        });
      }

      // Step C: Creative Fallback with Photorealistic Prompting (Only if real photo is not found on web)
      try {
        const seed = Math.floor(Math.random() * 999999);
        const promptParam = encodeURIComponent(`Authentic real-life documentary photograph of ${cleanEntity}, 8k resolution, shot on DSLR, natural lighting, actual campus architecture, highly realistic`);
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
        console.error("Image generation failed:", e);
      }

      return NextResponse.json({ reply: "Image fetch karne me samasya aayi, kripya dobara try karein!" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💬 2. CHAT & CONVERSATION ENGINE
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
        console.error("Tavily text error:", err);
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
        console.error("Groq execution failed:", e);
      }
    }

    if (searchContext) {
      const cleanText = searchContext.replace(/https?:\/\/\S+/g, '').replace(/[@#]\S+/g, '').slice(0, 250);
      return NextResponse.json({ reply: `Namaste! Jaankari ke anusaar: ${cleanText}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Chat fatal error:", err);
    return NextResponse.json({ reply: "Namaste! Server issue aaya hai, kripya refresh karein." });
  }
}
