import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, fileMime, history = [], mode } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();
    const tavilyKey = process.env.NEXT_PUBLIC_TAVILY_API_KEY?.trim();
    const newsKey = process.env.NEWS_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

    const now = new Date();
    const aajKiDate = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const shortDate = now.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 IMAGE GENERATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mode === "imagine") {
      // HuggingFace FLUX primary
      if (hfKey) {
        try {
          const hfRes = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
              method: "POST",
              headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                inputs: cleanMsg + ", high quality, detailed, 4k, photorealistic",
                parameters: { num_inference_steps: 4, guidance_scale: 0 }
              }),
            }
          );
          if (hfRes.ok) {
            const buffer = await hfRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:image/jpeg;base64,${base64}` });
          }
          const errText = await hfRes.text();
          if (errText.includes("loading")) {
            return NextResponse.json({ reply: "⏳ Model warm up ho raha hai (~30 sec). Thoda wait karo aur dobara try karo!" });
          }
          // Safety filter blocked
          if (errText.includes("unsafe") || errText.includes("nsfw") || hfRes.status === 400) {
            return NextResponse.json({ reply: "⚠️ Is prompt ki image generate nahi ho sakti. Koi aur description try karo!" });
          }
        } catch (e) { console.error("HF failed:", e); }
      }

      // Pollinations fallback
      try {
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanMsg + ", high quality, 4k")}?width=768&height=768&seed=${seed}&nologo=true&model=flux`;
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(25000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:image/jpeg;base64,${base64}` });
        }
      } catch (e) { console.error("Pollinations failed:", e); }

      return NextResponse.json({ reply: "Image generation fail ho gayi. Thodi der baad try karo! 🙏" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📄 PDF / IMAGE ANALYSIS — Gemini Direct API
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (fileBase64 || imageBase64) {
      const rawB64 = fileBase64 || (imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64);
      const mime = fileMime || (imageBase64?.startsWith("data:image/png") ? "image/png" : "image/jpeg");
      const userQ = cleanMsg || "Is file ko detail mein analyze karo aur poori summary do.";

      if (!geminiKey) {
        return NextResponse.json({ reply: "Namaste! GEMINI_API_KEY set nahi hai Vercel mein!" });
      }

      // Use Google's @google/generative-ai compatible endpoint
      // Models confirmed available from test: gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-001
      const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001"];

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const payload = {
            contents: [{
              role: "user",
              parts: [
                { inline_data: { mime_type: mime, data: rawB64 } },
                { text: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj: ${aajKiDate}.\nHinglish mein detail mein jawab de. Namaste! se shuru karo.\n\nSawaal: ${userQ}` }
              ]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            }
          };

          const gemRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const responseText = await gemRes.text();
          let gd: any;
          try { gd = JSON.parse(responseText); } catch { console.error("JSON parse failed:", responseText.slice(0, 200)); continue; }

          if (gd.error) {
            console.error(`Gemini ${model} error:`, gd.error.message, "status:", gd.error.status);
            if (gd.error.status === "NOT_FOUND" || gd.error.code === 404) continue;
            if (gd.error.status === "INVALID_ARGUMENT") {
              return NextResponse.json({ reply: `Namaste! File format support nahi hota. PDF ke liye proper PDF bhejo! Error: ${gd.error.message}` });
            }
            break;
          }

          const reply = gd.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            console.log(`Gemini ${model} success!`);
            return NextResponse.json({ reply });
          }

          console.error(`Gemini ${model} no reply:`, JSON.stringify(gd).slice(0, 300));
          break;
        } catch (e) {
          console.error(`Gemini ${model} exception:`, e);
        }
      }

      // Image-only fallback via Groq
      if (imageBase64) {
        try {
          const imgUrl = imageBase64.includes(",") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
          const vr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [{ role: "user", content: [
                { type: "image_url", image_url: { url: imgUrl } },
                { type: "text", text: `Tu Bharat AI hai. Hinglish mein jawab de. Namaste! se shuru karo.\n${cleanMsg || "Detail mein analyze karo."}` }
              ]}],
              max_tokens: 1500, temperature: 0.3,
            }),
          });
          const vd = await vr.json();
          const reply = vd.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply });
        } catch (e) { console.error("Groq vision failed:", e); }
      }

      return NextResponse.json({ reply: "Namaste! File analyze nahi ho paya. Kuch seconds baad dobara try karo! 🙏" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 SMART SEARCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let searchContext = "";

    // Don't search for greetings or very short messages
    const isGreeting = /^(hello|hi|hey|namaste|hii|helo|sup|yo|kya haal|kaise ho|how are you|good morning|good night|thanks|thank you|ok|okay|haan|nahi|han|nhi)$/i.test(cleanMsg.trim());
    const isSportsQuery = !isGreeting && /(ipl|cricket|match|score|wicket|run|team|player|tournament|league|football|kabaddi|psl|csk|rcb|\bmi\b|kkr|\bdc\b|\brr\b|srh|\bgt\b|lsg|pbks)/i.test(cleanMsg);
    const isCurrentQuery = !isGreeting && cleanMsg.length > 5 && /(today|aaj|abhi|kal|latest|current|price|rate|result|election|weather|kab|kahan|kaun|2025|2026|live)/i.test(cleanMsg);

    if ((isSportsQuery || isCurrentQuery) && serperKey) {
      try {
        const q = `${cleanMsg} ${shortDate}`;
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q, gl: "in", hl: "en", num: 8 }),
        });
        const sd = await sRes.json();
        if (sd.answerBox?.answer) searchContext += `Direct Answer: ${sd.answerBox.answer}\n`;
        if (sd.answerBox?.snippet) searchContext += `${sd.answerBox.snippet}\n\n`;
        if (sd.sportsResults) searchContext += `Sports: ${JSON.stringify(sd.sportsResults)}\n\n`;
        const results = sd.organic?.slice(0, 6) || [];
        if (results.length > 0) searchContext += results.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
      } catch (e) { console.error("Serper sports failed:", e); }
    }

    if (!searchContext && !isGreeting && tavilyKey && cleanMsg.length > 5) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyKey, query: cleanMsg, search_depth: "basic", max_results: 5, include_answer: true }),
        });
        const tvData = await tvRes.json();
        if (tvData.answer) searchContext = `Direct Answer: ${tvData.answer}\n\n`;
        if (tvData.results?.length > 0) searchContext += tvData.results.slice(0, 5).map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.content?.slice(0, 300) || ""}`).join("\n\n");
      } catch (e) { console.error("Tavily failed:", e); }
    }

    if (!searchContext && !isGreeting && serperKey && cleanMsg.length > 5) {
      try {
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q: cleanMsg, gl: "in", hl: "hi", num: 6 }),
        });
        const sd = await sRes.json();
        if (sd.answerBox?.answer) searchContext = `Direct Answer: ${sd.answerBox.answer}\n\n`;
        if (sd.answerBox?.snippet) searchContext += `${sd.answerBox.snippet}\n\n`;
        const results = sd.organic?.slice(0, 5) || [];
        if (results.length > 0) searchContext += results.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
      } catch (e) { console.error("Serper fallback failed:", e); }
    }

    if (newsKey && /(news|khabar|headline|taza|samachar)/i.test(cleanMsg)) {
      try {
        const q = cleanMsg.replace(/(news|khabar|taza|samachar|headline)/gi, "").trim() || "India";
        const nr = await fetch(`https://newsapi.org/v2/top-headlines?country=in&pageSize=5&apiKey=${newsKey}&q=${encodeURIComponent(q)}`);
        const nd = await nr.json();
        if (nd.articles?.length > 0) {
          const newsCtx = nd.articles.slice(0, 5).map((a: any, i: number) => `[${i+1}] ${a.title}\n${a.description || ""}`).join("\n\n");
          searchContext = (searchContext ? searchContext + "\n\n" : "") + newsCtx;
        }
      } catch (e) { console.error("News failed:", e); }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🤖 MAIN CHAT — Groq Llama 3.3 70B
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const recentTopics = history.slice(-6)
      .filter((h: any) => h.role === "user")
      .map((h: any) => h.content)
      .join(" | ");

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu India ka sabse helpful AI assistant hai — bilkul ChatGPT/Gemini jaisa lekin Hinglish mein.
Accurate, detailed aur helpful responses de.

RECENT TOPICS: ${recentTopics || "None"}

RULES:
- "ish college/jagah", "wahan", "uska", "iska", "ye", "woh" = RECENT TOPICS se samjho.
- Search data mila hai toh POORI detail ke saath jawab de — kuch chhodo mat.
- Agar search data nahi toh apni knowledge use karo.
- Code ke liye markdown code blocks.
- Math step by step solve karo.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE DATA (${shortDate}) ---\n${searchContext}\n--- END ---\n\nSawaal: ${cleanMsg}`
      : `Sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-12),
          { role: "user", content: userText }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    const chatData = await chatRes.json();
    const reply = chatData.choices?.[0]?.message?.content;
    if (!reply) {
      console.error("Groq error:", JSON.stringify(chatData));
      return NextResponse.json({ reply: "Kuch technical dikkat aayi, dobara try karo! 🙏" });
    }
    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Connection fail ho gayi, thodi der baad try karo!" });
  }
}
