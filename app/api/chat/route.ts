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
    // Try Pollinations first, HuggingFace as fallback
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mode === "imagine") {
      // Try HuggingFace FLUX first (more reliable, no rate limit)
      if (hfKey) {
        try {
          const hfRes = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
              method: "POST",
              headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ inputs: cleanMsg + ", high quality, detailed, 4k", parameters: { num_inference_steps: 4 } }),
            }
          );
          if (hfRes.ok) {
            const buffer = await hfRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:image/jpeg;base64,${base64}` });
          }
          const errText = await hfRes.text();
          if (errText.includes("loading")) {
            return NextResponse.json({ reply: "⏳ Image model warm up ho raha hai (~30 sec). Thoda wait karo aur dobara try karo!" });
          }
          console.error("HF error:", errText.slice(0, 200));
        } catch (e) { console.error("HF failed:", e); }
      }

      // Fallback: Pollinations with retry
      try {
        const seed = Math.floor(Math.random() * 999999);
        const encodedPrompt = encodeURIComponent(cleanMsg + ", high quality, detailed");
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${seed}&nologo=true&model=flux&enhance=false`;
        // Fetch and convert to base64 to avoid CORS/rate-limit display issues
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(25000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const mime = imgRes.headers.get("content-type") || "image/jpeg";
          return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:${mime};base64,${base64}` });
        }
      } catch (e) { console.error("Pollinations failed:", e); }

      return NextResponse.json({ reply: "Image generation fail ho gayi. Thodi der baad try karo! 🙏" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📄 FILE / IMAGE ANALYSIS — Gemini
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (fileBase64 || imageBase64) {
      const rawB64 = fileBase64 || (imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64);
      const mime = fileMime || (imageBase64?.startsWith("data:image/png") ? "image/png" : "image/jpeg");
      const userQ = cleanMsg || "Is file ko detail mein analyze karo aur poori summary do.";

      if (!geminiKey) {
        return NextResponse.json({ reply: "Namaste! GEMINI_API_KEY Vercel mein set nahi hai!" });
      }

      // Use confirmed working models from test endpoint
      const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001"];

      for (const model of geminiModels) {
        try {
          const gemRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [
                  { inline_data: { mime_type: mime, data: rawB64 } },
                  { text: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj: ${aajKiDate}.\nHinglish mein detail mein jawab de. Namaste! se shuru karo.\n\nSawaal: ${userQ}` }
                ]}],
                generationConfig: { maxOutputTokens: 2048, temperature: 0.3 }
              }),
            }
          );
          const gd = await gemRes.json();
          const reply = gd.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply });
          if (gd.error?.status === "NOT_FOUND" || gd.error?.code === 404) { console.log(`${model} not found, trying next`); continue; }
          console.error(`Gemini ${model} error:`, JSON.stringify(gd).slice(0, 400));
          break;
        } catch (e) { console.error(`Gemini ${model} exception:`, e); }
      }

      // Image-only fallback
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

      return NextResponse.json({ reply: "Namaste! File analyze nahi ho paya. Thodi der baad dobara try karo! 🙏" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 SMART SEARCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let searchContext = "";

    const isSportsQuery = /(ipl|cricket|match|score|wicket|run|team|player|tournament|league|football|kabaddi|psl|csk|rcb|mi |kkr|dc |rr |srh|gt |lsg|pbks)/i.test(cleanMsg);
    const isCurrentQuery = /(today|aaj|abhi|kal|latest|current|price|rate|result|election|weather|kab|kahan|kaun|2025|2026|live)/i.test(cleanMsg);

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

    if (!searchContext && tavilyKey && cleanMsg.length > 2) {
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

    if (!searchContext && serperKey && cleanMsg.length > 2) {
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
    // 🤖 MAIN CHAT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const recentTopics = history.slice(-6).filter((h: any) => h.role === "user").map((h: any) => h.content).join(" | ");

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu India ka sabse helpful AI assistant hai — bilkul ChatGPT/Gemini jaisa.
Hinglish mein jawab de — clear, detailed aur accurate.

CONVERSATION CONTEXT: ${recentTopics || "No previous context"}

RULES:
- "ish college/jagah/topic", "wahan", "uska", "iska", "ye", "woh" jaise words ka matlab CONVERSATION CONTEXT se samjho.
- Search data mila hai toh POORI detail ke saath jawab de.
- Agar search data nahi toh apni knowledge use karo.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE DATA (${shortDate}) ---\n${searchContext}\n--- END ---\n\nSawaal: ${cleanMsg}`
      : `Sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...history.slice(-12), { role: "user", content: userText }],
        max_tokens: 2000, temperature: 0.2,
      }),
    });

    const chatData = await chatRes.json();
    const reply = chatData.choices?.[0]?.message?.content;
    if (!reply) { console.error("Groq error:", JSON.stringify(chatData)); return NextResponse.json({ reply: "Kuch technical dikkat aayi, dobara try karo! 🙏" }); }
    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ reply: "Connection fail ho gayi, thodi der baad try karo!" });
  }
}
