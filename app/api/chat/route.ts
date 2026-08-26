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

    const isImageMode = mode === "imagine" || /(image|photo|pic|tasveer)/i.test(cleanMsg);
    const cleanEntity = cleanMsg
      .replace(/(image banao|photo banao|generate image|draw|create image|ka image|ki image|ka photo|ki photo|photo|image|pic|tasveer|dikhao|bhejo)/gi, "")
      .trim() || cleanMsg;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📸 REAL PHOTO SCRAPER (Guaranteed Real Web Photos)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isImageMode) {
      let finalBase64 = "";

      // 1. Google Images via Serper (Best for coaching, schools, local places)
      if (serperKey) {
        try {
          const sRes = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              q: `${cleanEntity} building campus exterior`,
              gl: "in",
              hl: "en",
              num: 6
            }),
          });
          const sData = await sRes.json();
          if (sData.images && sData.images.length > 0) {
            for (const imgItem of sData.images) {
              const url = imgItem.imageUrl;
              if (url && typeof url === "string" && !url.includes(".svg")) {
                try {
                  const imgFetch = await fetch(url, { signal: AbortSignal.timeout(5000) });
                  if (imgFetch.ok) {
                    const buf = await imgFetch.arrayBuffer();
                    finalBase64 = `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
                    break;
                  }
                } catch {
                  continue;
                }
              }
            }
          }
        } catch (e) {
          console.error("Serper images error:", e);
        }
      }

      // 2. Wikipedia Search Fallback
      if (!finalBase64) {
        try {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=${encodeURIComponent(cleanEntity)}&prop=pageimages&pithumbsize=1000`
          );
          const wikiData = await wikiRes.json();
          const pages = wikiData?.query?.pages;
          if (pages) {
            const firstKey = Object.keys(pages)[0];
            const imgUrl = pages[firstKey]?.thumbnail?.source;
            if (imgUrl) {
              const imgRes = await fetch(imgUrl);
              if (imgRes.ok) {
                const buffer = await imgRes.arrayBuffer();
                finalBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
              }
            }
          }
        } catch (e) {
          console.error("Wiki photo error:", e);
        }
      }

      // 3. Tavily Images Backup
      if (!finalBase64 && tavilyKey) {
        try {
          const tvRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: `${cleanEntity} building board exterior photo`,
              search_depth: "basic",
              include_images: true,
              max_results: 5
            }),
          });
          const tvData = await tvRes.json();
          if (tvData.images?.length > 0) {
            for (const imgUrl of tvData.images) {
              try {
                const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
                if (imgRes.ok) {
                  const buffer = await imgRes.arrayBuffer();
                  finalBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
                  break;
                }
              } catch {
                continue;
              }
            }
          }
        } catch (e) {
          console.error("Tavily image error:", e);
        }
      }

      // Return Real Image if found
      if (finalBase64) {
        return NextResponse.json({
          reply: `✅ Yeh rahi **${cleanEntity}** ki real photograph!`,
          generatedImage: finalBase64
        });
      }

      // 4. Creative Art Generation (Only if purely fictional prompt)
      const isPureFiction = /(flying|cyberpunk|anime|superhero|dragon|alien|painting|cartoon|illustration)/i.test(cleanMsg);
      if (isPureFiction) {
        try {
          const seed = Math.floor(Math.random() * 999999);
          const promptUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanEntity + ", 4k, digital art")}?width=800&height=600&seed=${seed}&nologo=true`;
          const imgRes = await fetch(promptUrl, { signal: AbortSignal.timeout(15000) });
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            finalBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
            return NextResponse.json({
              reply: `✅ Yeh rahi **${cleanEntity}** ki image!`,
              generatedImage: finalBase64
            });
          }
        } catch (e) {
          console.error("Pollinations error:", e);
        }
      }

      return NextResponse.json({ reply: `Namaste! **${cleanEntity}** ki authentic web photo fetch nahi ho saki. Kripya exact landmark naam likhein.` });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💬 CHAT HANDLER
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
