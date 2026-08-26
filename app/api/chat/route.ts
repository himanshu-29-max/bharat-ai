import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, history = [], mode } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim() || process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim();
    const tavilyKey = process.env.NEXT_PUBLIC_TAVILY_API_KEY?.trim() || process.env.TAVILY_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim() || process.env.SERPER_API_KEY?.trim();

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
    // 📸 1. REAL PHOTO FETCH (For real places, universities, celebrities)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const isRealPhotoRequest = /(ka photo|ki photo|ka image|ki image|dikhao|real image|real photo)/i.test(cleanMsg) && mode !== "imagine";
    
    if (isRealPhotoRequest && (serperKey || tavilyKey)) {
      const searchQuery = cleanMsg
        .replace(/(ka photo|ki photo|ka image|ki image|dikhao|photo|image|real)/gi, "")
        .trim();

      // Attempt Serper Images API
      if (serperKey) {
        try {
          const imgRes = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: `${searchQuery} official campus building`, gl: "in", hl: "hi", num: 1 }),
          });
          const imgData = await imgRes.json();
          if (imgData.images?.[0]?.imageUrl) {
            return NextResponse.json({
              reply: `✅ Yeh rahi ${searchQuery} ki real photo!`,
              generatedImage: imgData.images[0].imageUrl
            });
          }
        } catch (e) {
          console.error("Serper image fetch failed:", e);
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 2. AI CREATIVE GENERATION (For imaginative prompts)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const isCreativeImage = mode === "imagine" || /^(image banao|photo banao|generate image|draw|create image)/i.test(cleanMsg);

    if (isCreativeImage) {
      try {
        const cleanPrompt = cleanMsg
          .replace(/(image banao|photo banao|generate image|draw|create image|ka image|ki photo)/gi, "")
          .trim() || cleanMsg;

        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt + ", high quality, 4k, photorealistic")}?width=768&height=768&seed=${seed}&nologo=true&model=flux`;

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
        console.error("Pollinations image generation error:", e);
      }
      return NextResponse.json({ reply: "Image generate karne me samasya aayi, kripya dobara try karein!" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💬 3. GREETINGS & CASUAL INTENTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(lowerMsg);
    if (isGreeting && !imageBase64 && !fileBase64 && (!history || history.length === 0)) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis baare mein baat karna chahte hain?" });
    }

    const isChitChat = /^(kaise ho|kya haal|kya haal hai|kya hal|sab badhiya|aur batao|kya chal raha hai|kya haal chal|sup|yo|wassup|kaise ho bhai)$/i.test(lowerMsg);
    if (isChitChat && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Main ekdum badhiya hoon bhai! Aap batao, aaj kya janna ya poochna chahte ho?" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 4. LIVE SEARCH & INTEL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
Aap ek intelligent, natural aur conversational AI assistant ho (jaise ChatGPT/Gemini).
- User ke sawaal ka concise, accurate aur natural Hinglish me pura sentence complete karke jawab do.
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🤖 5. GROQ LLM INFERENCE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

    // Fallback
    if (searchContext) {
      const cleanText = searchContext
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[@#]\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const sentences = cleanText.split(/(?<=[.?!])\s+/);
      const completeSentences = sentences.slice(0, 2).join(' ');
      return NextResponse.json({ reply: `Namaste! Jaankari ke anusaar: ${completeSentences}` });
    }

    return NextResponse.json({ reply: "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye." });

  } catch (err) {
    console.error("Chat fatal error:", err);
    return NextResponse.json({ reply: "Namaste! Server issue aaya hai, kripya refresh karein." });
  }
}
