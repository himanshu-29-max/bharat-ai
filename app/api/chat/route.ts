import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, history = [], mode } = await req.json();
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();
    const newsKey = process.env.NEWS_API_KEY?.trim();
    const segmindKey = process.env.SEGMIND_API_KEY?.trim();
    const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();
    const groqVisionModel = process.env.GROQ_VISION_MODEL?.trim() || "llava-v1.5-7b-4096-preview";

    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 IMAGE GENERATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mode === "imagine") {
      // Try Segmind first
      if (segmindKey) {
        try {
          const segRes = await fetch("https://api.segmind.com/v1/sdxl1.0-txt2img", {
            method: "POST",
            headers: { "x-api-key": segmindKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: cleanMsg + ", high quality, detailed, 4k",
              negative_prompt: "blurry, bad quality, distorted, ugly, watermark, nsfw, text",
              samples: 1,
              scheduler: "UniPC",
              num_inference_steps: 20,
              guidance_scale: 7.5,
              img_width: 1024,
              img_height: 1024,
              base64: true,
            }),
          });
          if (segRes.ok) {
            const segData = await segRes.json();
            if (segData.image) {
              return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:image/jpeg;base64,${segData.image}` });
            }
          }
          const errText = await segRes.text().catch(() => "");
          console.error("Segmind error:", errText);
        } catch (e) { console.error("Segmind failed:", e); }
      }
      // Fallback: HuggingFace
      return await generateWithHuggingFace(cleanMsg, hfKey || "");
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👁️ VISION / DOCUMENT ANALYSIS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (imageBase64) {
      try {
        const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: groqVisionModel,
            messages: [
              { role: "system", content: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj: ${aajKiDate}. Images aur documents ko detail mein analyze kar. Hinglish mein jawab de. Namaste! se shuru karo.` },
              { role: "user", content: [
                { type: "image_url", image_url: { url: imageBase64 } },
                { type: "text", text: cleanMsg || "Is image/document ko detail mein analyze karo aur summary batao." }
              ]}
            ],
            max_tokens: 1500, temperature: 0.3,
          }),
        });
        const visionData = await visionRes.json();
        const reply = visionData.choices?.[0]?.message?.content;
        if (!reply) throw new Error(JSON.stringify(visionData));
        return NextResponse.json({ reply });
      } catch (e) {
        console.error("Vision failed:", e);
        return NextResponse.json({ reply: "Namaste! Image analyze nahi ho paya. Koi aur image try karo ya model change karo!" });
      }
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
        const newsData = await newsRes.json();
        if (newsData.articles?.length > 0) {
          searchContext = newsData.articles.slice(0, 5).map((a: any, i: number) => `[${i+1}] ${a.title}\n${a.description||""}`).join("\n\n");
        }
      } catch (e) { console.error("News API failed:", e); }
    }

    if (!searchContext && cleanMsg.length > 2 && serperKey) {
      try {
        const isCurrent = /(today|aaj|abhi|latest|current|price|rate|score|match|result|election|weather|kaun|kab|kahan|kya h|kya hai|2024|2025|2026)/i.test(cleanMsg);
        const q = isCurrent ? `${cleanMsg} ${new Date().getFullYear()}` : cleanMsg;
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q, gl: "in", hl: "hi", num: 6 }),
        });
        const sData = await sRes.json();
        const results = sData.organic?.slice(0, 5) || [];
        if (results.length > 0) {
          searchContext = results.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
        }
        // Also use answer box if present
        if (sData.answerBox?.answer) {
          searchContext = `Direct Answer: ${sData.answerBox.answer}\n\n` + searchContext;
        }
      } catch (e) { console.error("Serper failed:", e); }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🤖 MAIN CHAT — Groq Llama
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu India ka sabse helpful AI assistant hai — smart, fast aur honest.
Hinglish mein jawab de — simple, clear aur factual.

RULES:
- Agar Search data diya gaya hai toh USI se jawab de, apni taraf se fabricate mat kar.
- Search data nahi mila ya irrelevant hai toh apni knowledge se jawab de, clearly bol "Meri knowledge ke basis pe:".
- Kabhi bhi galat ya made-up info mat dena.
- Context yaad rakho — "ye/woh/iska/uska" ka matlab pichli baaton se samjho.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE SEARCH RESULTS ---\n${searchContext}\n--- END ---\n\nUser ka sawaal: ${cleanMsg}`
      : `User ka sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...history.slice(-8), { role: "user", content: userText }],
        max_tokens: 1500, temperature: 0.3,
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

async function generateWithHuggingFace(prompt: string, hfKey: string) {
  try {
    const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4 } }),
    });
    if (!hfRes.ok) {
      const err = await hfRes.text();
      if (err.includes("loading")) return NextResponse.json({ reply: "⏳ Image model warm up ho raha hai (~30 sec). Thoda wait karke dobara try karo!" });
      console.error("HF error:", err);
      return NextResponse.json({ reply: "Image generation fail ho gayi. Thodi der baad try karo! 🙏" });
    }
    const buffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return NextResponse.json({ reply: "✅ Yeh rahi teri image!", generatedImage: `data:image/jpeg;base64,${base64}` });
  } catch (e) {
    return NextResponse.json({ reply: "Image generation fail ho gayi! 🙏" });
  }
}
