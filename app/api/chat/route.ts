import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, fileMime, history = [], mode } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();
    const tavilyKey = process.env.NEXT_PUBLIC_TAVILY_API_KEY?.trim();
    const newsKey = process.env.NEWS_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 IMAGE GENERATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mode === "imagine") {
      const seed = Math.floor(Math.random() * 999999);
      const encodedPrompt = encodeURIComponent(cleanMsg + ", high quality, detailed, 4k");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
      return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: imageUrl });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📄 FILE / IMAGE ANALYSIS — Gemini
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (fileBase64 || imageBase64) {
      const rawB64 = fileBase64 || (imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64);
      const mime = fileMime || (imageBase64?.startsWith("data:image/png") ? "image/png" : "image/jpeg");
      const userQ = cleanMsg || "Is file ko detail mein analyze karo aur poori summary do.";

      if (!geminiKey) {
        return NextResponse.json({ reply: "Namaste! GEMINI_API_KEY Vercel mein set nahi hai. Please check karo!" });
      }

      // Gemini with retry
      for (const model of ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro-vision"]) {
        try {
          const gemRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [
                  { inline_data: { mime_type: mime, data: rawB64 } },
                  { text: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj: ${aajKiDate}.\nHinglish mein detail mein jawab de. Namaste! se shuru karo.\n\nUser ka sawaal: ${userQ}` }
                ]}],
                generationConfig: { maxOutputTokens: 2048, temperature: 0.3 }
              }),
            }
          );
          const gd = await gemRes.json();
          console.log(`Gemini ${model} status:`, gemRes.status, JSON.stringify(gd).slice(0, 200));
          const reply = gd.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply });
          if (gd.error?.code === 404) continue; // try next model
          break;
        } catch (e) { console.error(`Gemini ${model} failed:`, e); }
      }

      // Fallback for images — Groq Vision
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
    // Sports/current events ke liye Serper best hai
    // General ke liye Tavily
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let searchContext = "";

    const isSportsQuery = /(ipl|cricket|match|score|wicket|run|team|player|tournament|league|football|kabaddi|tennis|psl|csk|rcb|mi |kkr|dc |rr |srh|gt |lsg|pbks)/i.test(cleanMsg);
    const isCurrentQuery = /(today|aaj|abhi|kal|latest|current|price|rate|result|election|weather|kab|kahan|kaun|2025|2026|live)/i.test(cleanMsg);

    // Sports queries → Serper first (better for sports)
    if ((isSportsQuery || isCurrentQuery) && serperKey) {
      try {
        const q = `${cleanMsg} ${new Date().getFullYear()}`;
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q, gl: "in", hl: "hi", num: 8 }),
        });
        const sd = await sRes.json();
        if (sd.answerBox?.answer) searchContext += `Direct Answer: ${sd.answerBox.answer}\n`;
        if (sd.answerBox?.snippet) searchContext += `${sd.answerBox.snippet}\n\n`;
        // Sports box
        if (sd.sports) searchContext += `Sports: ${JSON.stringify(sd.sports)}\n\n`;
        const results = sd.organic?.slice(0, 6) || [];
        if (results.length > 0) searchContext += results.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
        console.log("Serper context length:", searchContext.length);
      } catch (e) { console.error("Serper failed:", e); }
    }

    // General queries → Tavily
    if (!searchContext && tavilyKey && cleanMsg.length > 2) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: cleanMsg,
            search_depth: "basic",
            max_results: 5,
            include_answer: true,
          }),
        });
        const tvData = await tvRes.json();
        if (tvData.answer) searchContext = `Direct Answer: ${tvData.answer}\n\n`;
        if (tvData.results?.length > 0) {
          searchContext += tvData.results.slice(0, 5)
            .map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.content?.slice(0, 300) || ""}`)
            .join("\n\n");
        }
      } catch (e) { console.error("Tavily failed:", e); }
    }

    // Serper fallback for non-sports
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

    // News API
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
    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu India ka sabse helpful AI assistant hai — bilkul ChatGPT/Gemini jaisa.
Hinglish mein jawab de — clear, detailed aur accurate.

STRICT RULES:
- Search data mila hai toh POORI detail ke saath jawab de — team names, time, venue sab batao.
- Search data clearly answer kare toh "mujhe pata nahi" KABHI mat bol.
- Search data nahi mila toh apni knowledge use karo, clearly bol "Meri knowledge ke basis pe:".
- Context yaad rakho.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE SEARCH DATA (isko use karke POORA jawab de) ---\n${searchContext}\n--- END ---\n\nUser ka sawaal: ${cleanMsg}`
      : `User ka sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...history.slice(-10), { role: "user", content: userText }],
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
