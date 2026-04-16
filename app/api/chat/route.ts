import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, history = [], mode } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim();
    const newsKey = process.env.NEWS_API_KEY?.trim();
    const segmindKey = process.env.SEGMIND_API_KEY?.trim();
    const groqVisionModel = process.env.GROQ_VISION_MODEL?.trim() || "llava-v1.5-7b-4096-preview";

    const aajKiDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const cleanMsg = message?.trim() || "";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 MODE: IMAGE GENERATION (Segmind SDXL)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mode === "imagine") {
      try {
        const segRes = await fetch("https://api.segmind.com/v1/sdxl1.0-txt2img", {
          method: "POST",
          headers: {
            "x-api-key": segmindKey || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: cleanMsg,
            negative_prompt: "blurry, bad quality, distorted, ugly, watermark, nsfw",
            style: "base",
            samples: 1,
            scheduler: "UniPC",
            num_inference_steps: 25,
            guidance_scale: 8,
            strength: 1,
            img_width: 1024,
            img_height: 1024,
            refine: "expert_ensemble_refiner",
            high_noise_frac: 0.8,
            base64: true,
          }),
        });

        if (!segRes.ok) {
          const errText = await segRes.text();
          console.error("Segmind error:", errText);
          return NextResponse.json({ reply: "Image generation mein dikkat aayi, thodi der baad try karo! 🙏" });
        }

        const segData = await segRes.json();
        const imgBase64 = segData.image;

        if (!imgBase64) {
          return NextResponse.json({ reply: "Image nahi bani, dobara try karo!" });
        }

        return NextResponse.json({
          reply: "✅ Yeh rahi teri image!",
          generatedImage: `data:image/jpeg;base64,${imgBase64}`,
        });
      } catch (e) {
        console.error("Image gen failed:", e);
        return NextResponse.json({ reply: "Image generation fail ho gayi!" });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👁️ MODE: DOCUMENT / IMAGE ANALYSIS (Groq Vision)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (imageBase64) {
      try {
        const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqVisionModel,
            messages: [
              {
                role: "system",
                content: `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu images aur documents ko detail mein analyze karta hai.
Hinglish mein jawab de — clear, helpful aur detailed.
Har jawab Namaste! se shuru karo.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: imageBase64 },
                  },
                  {
                    type: "text",
                    text: cleanMsg || "Is image/document ko detail mein analyze karo aur summary do.",
                  },
                ],
              },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        });

        const visionData = await visionRes.json();
        const reply = visionData.choices?.[0]?.message?.content;

        if (!reply) {
          console.error("Vision error:", JSON.stringify(visionData));
          return NextResponse.json({ reply: "Document/image analyze nahi ho paya, dobara try karo!" });
        }

        return NextResponse.json({ reply });
      } catch (e) {
        console.error("Vision failed:", e);
        return NextResponse.json({ reply: "Vision analysis fail ho gayi!" });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 SMART SEARCH (News API + Serper)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let searchContext = "";

    const isNewsQuery = /(news|breaking|headlines|aaj ki khabar|latest news|taza khabar)/i.test(cleanMsg);

    if (isNewsQuery && newsKey) {
      try {
        const newsRes = await fetch(
          `https://newsapi.org/v2/top-headlines?country=in&pageSize=5&apiKey=${newsKey}&q=${encodeURIComponent(cleanMsg)}`
        );
        const newsData = await newsRes.json();
        if (newsData.articles?.length > 0) {
          searchContext = newsData.articles
            .slice(0, 5)
            .map((a: any, i: number) => `[${i + 1}] ${a.title}\n${a.description || ""}`)
            .join("\n\n");
        }
      } catch (e) {
        console.error("News API failed:", e);
      }
    }

    if (!searchContext && cleanMsg.length > 3 && serperKey) {
      try {
        const isCurrentQuery = /(today|aaj|abhi|latest|current|price|rate|score|match|result|election|weather|kab|kahan|kaun)/i.test(cleanMsg);
        const searchQuery = isCurrentQuery
          ? `${cleanMsg} India ${new Date().getFullYear()}`
          : cleanMsg;

        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: searchQuery, gl: "in", num: 5 }),
        });
        const sData = await sRes.json();
        const results = sData.organic?.slice(0, 5) || [];
        if (results.length > 0) {
          searchContext = results
            .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.snippet}`)
            .join("\n\n");
        }
      } catch (e) {
        console.error("Serper failed:", e);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🤖 MAIN CHAT (Groq Llama - fastest)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
Tu India ka sabse helpful AI assistant hai — smart, fast aur honest.
Hinglish mein jawab de — simple, clear aur factual.

RULES:
- Agar Google Search data diya hai toh USI se jawab de, apni taraf se kuch mat banao.
- Agar search data relevant nahi toh apni knowledge se jawab de aur bol "Meri knowledge ke basis pe:".
- Kabhi galat ya made-up information mat dena.
- Agar pata nahi toh clearly bol "Mujhe is baare mein pakka pata nahi."
- Conversation ka context yaad rakho — "ye", "woh", "iska" jaise words ka matlab pichli baaton se samjho.
- Agar user image banana chahta hai toh kaho: "/imagine [apna description]" likho.
- Har jawab Namaste! se shuru karo.`;

    const userText = searchContext
      ? `--- LIVE SEARCH RESULTS ---\n${searchContext}\n--- END ---\n\nUser ka sawaal: ${cleanMsg}`
      : `User ka sawaal: ${cleanMsg}`;

    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-8),
          { role: "user", content: userText },
        ],
        max_tokens: 1200,
        temperature: 0.3,
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
