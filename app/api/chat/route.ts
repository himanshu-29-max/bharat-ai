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
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanMsg + ", high quality, detailed, 4k")}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
      return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: imageUrl });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📄 FILE / IMAGE ANALYSIS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (fileBase64 || imageBase64) {
      const rawB64 = fileBase64 || (imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64);
      const mime = fileMime || (imageBase64?.startsWith("data:image/png") ? "image/png" : "image/jpeg");
      const userQ = cleanMsg || "Is file ko detail mein analyze karo aur poori summary do. Koi bhi important point mat chhodna.";

      // Use Gemini for all files (images + PDFs)
      if (geminiKey && rawB64) {
        try {
          const gemRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      inline_data: {
                        mime_type: mime,
                        data: rawB64
                      }
                    },
                    {
                      text: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj: ${aajKiDate}.
Hinglish mein POORI detail mein jawab de. Koi bhi point mat chhodna.
Namaste! se shuru karo.

User ka sawaal: ${userQ}`
                    }
                  ]
                }],
                generationConfig: {
                  maxOutputTokens: 2048,
                  temperature: 0.3
                }
              }),
            }
          );

          const responseText = await gemRes.text();
          console.log("Gemini raw response:", responseText.slice(0, 500));

          let gd;
          try { gd = JSON.parse(responseText); } catch { 
            console.error("JSON parse failed:", responseText.slice(0, 200));
            return NextResponse.json({ reply: "Namaste! File analyze nahi ho paya (JSON error). Dobara try karo!" });
          }

          if (gd.error) {
            console.error("Gemini API error:", gd.error);
            return NextResponse.json({ reply: `Namaste! Gemini error: ${gd.error.message || "Unknown error"}. Dobara try karo!` });
          }

          const reply = gd.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply });

          console.error("No reply in Gemini response:", JSON.stringify(gd).slice(0, 300));
        } catch (e) {
          console.error("Gemini fetch failed:", e);
        }
      } else if (!geminiKey) {
        console.error("GEMINI_API_KEY not found in environment");
      }

      // Image fallback — Groq Vision
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

      return NextResponse.json({ reply: "Namaste! File analyze nahi ho paya. Gemini API key Vercel mein check karo (`GEMINI_API_KEY`)!" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 SMART SEARCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let searchContext = "";

    const isSports = /(ipl|cricket|match|score|wicket|run|team|player|tournament|league|football|kabaddi|tennis|psl|csk|rcb|mi |kkr|dc |rr |srh|gt |lsg|pbks|t20|odi|test match)/i.test(cleanMsg);
    const isCurrent = /(today|aaj|abhi|kal|latest|current|price|rate|result|election|weather|kab|kahan|kaun|2025|2026|live|abhi)/i.test(cleanMsg);

    // Sports + current events → Serper with year
    if ((isSports || isCurrent) && serperKey) {
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
        const results = sd.organic?.slice(0, 6) || [];
        if (results.length > 0) searchContext += results.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
      } catch (e) { console.error("Serper sports failed:", e); }
    }

    // General → Tavily
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

    // Serper fallback
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
Tu India ka sabse helpful AI assistant hai.
Hinglish mein jawab de — clear, detailed aur accurate.

RULES:
- Agar search data diya gaya hai toh usi se SEEDHA jawab de. Team names, time, venue, score — sab kuch batao.
- "Mujhe pata nahi" ya "aur data chahiye" KABHI mat bolna jab search data clearly available ho.
- Agar search data mein koi information nahi hai sirf tab bol "Is baare mein latest info nahi mili."
- Context yaad rakho.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE SEARCH DATA ---\n${searchContext}\n---\n\nSawaal: ${cleanMsg}`
      : `Sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...history.slice(-10), { role: "user", content: userText }],
        max_tokens: 2000, temperature: 0.15,
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
