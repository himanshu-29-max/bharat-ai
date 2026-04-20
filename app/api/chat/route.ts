import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, fileMime, fileType, history = [], mode } = await req.json();
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();
    const newsKey = process.env.NEWS_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim();

    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 IMAGE GENERATION — Pollinations AI (free, no key needed)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mode === "imagine") {
      try {
        const encodedPrompt = encodeURIComponent(cleanMsg);
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;
        // Fetch the image and convert to base64
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error("Pollinations failed");
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
        return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:${mimeType};base64,${base64}` });
      } catch (e) {
        console.error("Image gen failed:", e);
        return NextResponse.json({ reply: "Image generation fail ho gayi. Thodi der baad try karo! 🙏" });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📄 FILE ANALYSIS — Gemini (handles PDF, images, docs)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (fileBase64 || imageBase64) {
      const b64 = fileBase64 || imageBase64.split(",")[1] || imageBase64;
      const mime = fileMime || (imageBase64?.startsWith("data:image/png") ? "image/png" : "image/jpeg");
      const userQuestion = cleanMsg || "Is file ko detail mein analyze karo aur summary batao.";

      if (geminiKey) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inline_data: { mime_type: mime, data: b64 } },
                    { text: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj: ${aajKiDate}.\nHinglish mein jawab de. Namaste! se shuru karo.\n\nUser ka sawaal: ${userQuestion}` }
                  ]
                }],
                generationConfig: { maxOutputTokens: 2048, temperature: 0.3 }
              }),
            }
          );
          const geminiData = await geminiRes.json();
          const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply });
          console.error("Gemini error:", JSON.stringify(geminiData));
        } catch (e) { console.error("Gemini failed:", e); }
      }

      // Fallback for images only — Groq Vision
      if (imageBase64) {
        try {
          const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [{ role: "user", content: [
                { type: "image_url", image_url: { url: imageBase64.includes(",") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
                { type: "text", text: `Tu Bharat AI hai. Aaj: ${aajKiDate}. Hinglish mein jawab de. Namaste! se shuru karo.\n${userQuestion}` }
              ]}],
              max_tokens: 1500, temperature: 0.3,
            }),
          });
          const vd = await visionRes.json();
          const reply = vd.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply });
        } catch (e) { console.error("Groq vision failed:", e); }
      }
      return NextResponse.json({ reply: "Namaste! File analyze nahi ho paya. Gemini API key check karo ya dobara try karo!" });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 SMART SEARCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let searchContext = "";
    const isNewsQuery = /(news|breaking|khabar|headline|taza|samachar)/i.test(cleanMsg);

    if (isNewsQuery && newsKey) {
      try {
        const q = cleanMsg.replace(/(news|khabar|taza|samachar|breaking|headline)/gi, "").trim() || "India";
        const newsRes = await fetch(`https://newsapi.org/v2/top-headlines?country=in&pageSize=5&apiKey=${newsKey}&q=${encodeURIComponent(q)}`);
        const nd = await newsRes.json();
        if (nd.articles?.length > 0) searchContext = nd.articles.slice(0, 5).map((a: any, i: number) => `[${i+1}] ${a.title}\n${a.description||""}`).join("\n\n");
      } catch (e) { console.error("News failed:", e); }
    }

    if (!searchContext && cleanMsg.length > 2 && serperKey) {
      try {
        const isCurrent = /(today|aaj|abhi|latest|current|price|rate|score|match|result|election|weather|kaun|kab|kahan|kya h|kya hai|2025|2026)/i.test(cleanMsg);
        const q = isCurrent ? `${cleanMsg} ${new Date().getFullYear()}` : cleanMsg;
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q, gl: "in", hl: "hi", num: 6 }),
        });
        const sd = await sRes.json();
        if (sd.answerBox?.answer) searchContext = `Direct Answer: ${sd.answerBox.answer}\n\n`;
        if (sd.answerBox?.snippet) searchContext += `${sd.answerBox.snippet}\n\n`;
        const results = sd.organic?.slice(0, 5) || [];
        if (results.length > 0) searchContext += results.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
      } catch (e) { console.error("Serper failed:", e); }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🤖 MAIN CHAT — Groq Llama 3.3 70B
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu India ka sabse helpful AI assistant hai — bilkul ChatGPT/Gemini jaisa lekin Hinglish mein.

RULES:
- Search data mila hai toh USI se jawab de, fabricate mat kar.
- Pata nahi toh clearly bol.
- Context yaad rakho — "ye/woh/iska" ka matlab pichli baaton se samjho.
- Code likhna ho toh proper markdown code blocks use karo.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE SEARCH RESULTS ---\n${searchContext}\n--- END ---\n\nUser ka sawaal: ${cleanMsg}`
      : `User ka sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...history.slice(-10), { role: "user", content: userText }],
        max_tokens: 2000, temperature: 0.3,
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
