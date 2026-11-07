import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Clear intent check for image generation command
function isExplicitImagePrompt(text: string): boolean {
  const t = text.toLowerCase();
  // Check for combination of command + target
  const actionWords = ["banao", "banado", "banaye", "generate", "draw", "create", "make"];
  const targetWords = ["image", "photo", "picture", "chitra", "tasveer", "wallpaper"];

  const hasAction = actionWords.some((w) => t.includes(w));
  const hasTarget = targetWords.some((w) => t.includes(w));

  return hasAction && hasTarget;
}

// Check if message requires real-time search
function needsLiveSearch(text: string): boolean {
  const t = text.toLowerCase();
  const searchKeywords = [
    "latest",
    "news",
    "today",
    "current",
    "price",
    "weather",
    "score",
    "abhi",
    "aaj ka",
    "aaj ki",
    "taaza",
    "khabar",
    "match",
    "live",
    "rate",
    "updates",
  ];
  return searchKeywords.some((k) => t.includes(k));
}

export async function POST(req: Request) {
  try {
    const {
      message = "",
      imageBase64,
      fileBase64,
      fileMime,
      history = [],
      mode = "chat",
    } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const groqModel = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";

    const tavilyKey = process.env.TAVILY_API_KEY?.trim();
    const serperKey = process.env.SERPER_API_KEY?.trim();

    const cleanMsg = (message || "").trim();

    if (!cleanMsg && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Kuch poochiye ya attach kijiye." });
    }

    // -------------------------------------------------------------
    // FEATURE: IMAGE GENERATION (Pollinations Flux)
    // -------------------------------------------------------------
    const shouldGenerateImage =
      mode === "imagine" ||
      (mode !== "search_photo" && mode !== "analyze" && isExplicitImagePrompt(cleanMsg));

    if (shouldGenerateImage && cleanMsg) {
      // Clean query for image generation
      const promptQuery = cleanMsg
        .replace(/^(image\s+banao|photo\s+banao|generate\s+image|draw|create\s+image|banao\s+image|banado)\s*:?/i, "")
        .trim();

      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(promptQuery || cleanMsg);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

      // Quick head / fetch check with retry once
      try {
        let testRes = await fetch(imageUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
        if (!testRes.ok) {
          // retry once
          testRes = await fetch(imageUrl, { method: "HEAD", signal: AbortSignal.timeout(15000) });
        }
      } catch (pollErr: any) {
        console.warn("Pollinations preview verify warning (proceeding with direct URL):", pollErr.message);
      }

      return NextResponse.json({
        reply: `Aapki image generate ho gayi hai:\n**Prompt:** "${promptQuery || cleanMsg}"`,
        generatedImage: imageUrl,
      });
    }

    // -------------------------------------------------------------
    // FEATURE: REAL PHOTO SEARCH (Serper Google Images / Wikipedia)
    // -------------------------------------------------------------
    if (mode === "search_photo") {
      let photoUrl = "";
      if (serperKey && cleanMsg) {
        try {
          const sRes = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: cleanMsg, num: 3 }),
          });
          const sData = await sRes.json();
          if (sData.images?.[0]?.imageUrl) {
            photoUrl = sData.images[0].imageUrl;
          }
        } catch (e: any) {
          console.error("Serper photo lookup error:", e);
        }
      }

      if (photoUrl) {
        return NextResponse.json({
          reply: `Real photo for: "${cleanMsg}"`,
          generatedImage: photoUrl,
        });
      } else {
        return NextResponse.json({
          reply: `Maaf kijiye, "${cleanMsg}" ke liye verified web photo nahi mil saki.`,
        });
      }
    }

    // -------------------------------------------------------------
    // FEATURE 5B: IMAGE / PDF / TEXT ANALYSIS VIA GEMINI
    // -------------------------------------------------------------
    const hasMediaAttachment = !!imageBase64 || !!fileBase64;

    if (hasMediaAttachment) {
      if (!geminiKey) {
        return NextResponse.json(
          {
            reply:
              "Analyze abhi configure nahi hai: GEMINI_API_KEY environment variable missing hai.",
            error: "GEMINI_API_KEY missing",
          },
          { status: 503 }
        );
      }

      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: geminiModel });

        const parts: any[] = [];
        const questionPrompt = cleanMsg || "Kripya is document ya image ko dhyan se padh kar analyze karein aur iska mukhy vivaran dein.";

        if (imageBase64) {
          // Format data url: data:image/jpeg;base64,... or raw base64
          let base64Data = imageBase64;
          let mime = "image/jpeg";
          if (imageBase64.includes(";base64,")) {
            const split = imageBase64.split(";base64,");
            mime = split[0].replace("data:", "");
            base64Data = split[1];
          }
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mime,
            },
          });
        } else if (fileBase64) {
          const mime = fileMime || "application/pdf";
          if (mime === "application/pdf") {
            let base64Data = fileBase64;
            if (fileBase64.includes(";base64,")) {
              base64Data = fileBase64.split(";base64,")[1];
            }
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf",
              },
            });
          } else {
            // Text file
            let rawText = "";
            try {
              rawText = Buffer.from(fileBase64, "base64").toString("utf-8");
            } catch {
              rawText = fileBase64;
            }

            let wasTruncated = false;
            if (rawText.length > 15000) {
              rawText = rawText.slice(0, 15000);
              wasTruncated = true;
            }

            parts.push(
              `Attached File Content${wasTruncated ? " (First 15,000 characters)" : ""}:\n${rawText}\n\n`
            );
          }
        }

        parts.push(questionPrompt);

        const result = await model.generateContent(parts);
        const answer = result.response.text();

        return NextResponse.json({ reply: answer });
      } catch (err: any) {
        console.error("Gemini Analysis error:", err);
        return NextResponse.json(
          {
            reply: `Analyze karte waqt samasya aayi / model error: ${err.message || String(err)}`,
            error: err.message,
          },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------
    // FEATURE 5A: STANDARD CHAT (GROQ -> GEMINI FALLBACK CHAIN)
    // -------------------------------------------------------------

    // 1. Direct Greeting optimization
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(cleanMsg.toLowerCase());
    if (isGreeting) {
      return NextResponse.json({
        reply: "Namaste! 🙏 Main Bharat AI hoon. Aaj kis baare mein baat karni hai ya jaankari chahiye?",
      });
    }

    // 2. Selective Live Web Search (Tavily)
    let searchContext = "";
    if (tavilyKey && needsLiveSearch(cleanMsg)) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${cleanMsg} latest`,
            search_depth: "basic",
            max_results: 3,
            include_answer: true,
          }),
        });
        const tvData = await tvRes.json();
        if (tvData.answer) searchContext += `${tvData.answer}\n`;
        if (tvData.results?.length > 0) {
          searchContext += tvData.results
            .map((r: any) => r.content?.slice(0, 250))
            .filter(Boolean)
            .join("\n");
        }
      } catch (err) {
        console.error("Tavily search call failed:", err);
      }
    }

    const now = new Date();
    const aajKiDate = now.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const systemPrompt = `You are Bharat AI (भारत AI), an intelligent Indian AI assistant built by Himanshu Ranjan.
Current Date & Time: ${aajKiDate}.
Answer the user accurately, comprehensively, and helpfully.
Feel free to respond in natural Hinglish, Hindi, or English based on the user's inquiry.
Provide complete sentences without cutting off mid-way.`;

    let reply = "";
    let lastError = "";

    // A. Primary: Groq SDK
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const messagesPayload: any[] = [
          { role: "system", content: systemPrompt },
          ...history.slice(-6).map((h: any) => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: h.content,
          })),
          {
            role: "user",
            content: searchContext
              ? `Live Web Context:\n${searchContext}\n\nQuestion: ${cleanMsg}`
              : cleanMsg,
          },
        ];

        const completion = await groq.chat.completions.create({
          model: groqModel,
          messages: messagesPayload,
          max_tokens: 1500,
          temperature: 0.3,
        });

        reply = completion.choices?.[0]?.message?.content?.trim() || "";
      } catch (e: any) {
        console.error("Primary Groq failure:", e.message);
        lastError = `Groq Error: ${e.message}`;
      }
    }

    // B. Secondary Fallback: Google Gemini
    if (!reply && geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: geminiModel });

        const geminiPrompt = `${systemPrompt}\n\n${
          searchContext ? `Web Context:\n${searchContext}\n\n` : ""
        }User Query: ${cleanMsg}`;

        const gRes = await model.generateContent(geminiPrompt);
        reply = gRes.response.text().trim();
      } catch (e: any) {
        console.error("Fallback Gemini failure:", e.message);
        lastError = `${lastError ? lastError + " | " : ""}Gemini Error: ${e.message}`;
      }
    }

    // C. If both fail, return real HTTP 502 with genuine provider error
    if (!reply) {
      const errorReason = lastError || "No active AI provider keys configured on server.";
      return NextResponse.json(
        {
          error: errorReason,
          reply: `Server se jawab nahi aaya — ${errorReason}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat route unhandled error:", err);
    return NextResponse.json(
      {
        error: err.message || "Unknown error",
        reply: `Server se jawab nahi aaya — ${err.message || "Internal server error"}`,
      },
      { status: 500 }
    );
  }
}
