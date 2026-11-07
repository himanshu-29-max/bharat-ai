import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { groqModelChain, geminiModelChain } from "@/lib/models";

// Older Bharat AI deployments stored some keys under legacy names in Vercel
// (NEXT_PUBLIC_* / GOOGLE_*). Accept those too so a rename in the dashboard
// is not required for the app to find its keys.
const envKey = (...names: string[]) => {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
};


// Explicit image generation intent (command + target)
function isExplicitImagePrompt(text: string): boolean {
  const t = text.toLowerCase();
  const actionWords = ["banao", "banado", "banaye", "generate", "draw", "create", "make"];
  const targetWords = ["image", "photo", "picture", "chitra", "tasveer", "wallpaper"];

  const hasAction = actionWords.some((w) => t.includes(w));
  const hasTarget = targetWords.some((w) => t.includes(w));

  return hasAction && hasTarget;
}

// Explicit real photo search intent (verb + photo word)
function isExplicitPhotoSearch(text: string): boolean {
  const t = text.toLowerCase();
  const hasPhoto = /(photo|photograph|tasveer|real photo|actual photo)/i.test(t);
  const hasVerb = /(dikhao|dekhao|bhejo|search|find|show me|look up)/i.test(t);
  return hasPhoto && hasVerb;
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

    const groqKey = envKey("GROQ_API_KEY", "GROQ_KEY", "NEXT_PUBLIC_GROQ_API_KEY");
    const groqModels = groqModelChain(process.env.GROQ_MODEL);

    const geminiKey = envKey("GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "NEXT_PUBLIC_GEMINI_API_KEY");
    const geminiModels = geminiModelChain(process.env.GEMINI_MODEL);

    // Optional FREE alternative provider (OpenRouter) — third fallback, only if key set
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const openrouterModel =
      process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct:free";

    const tavilyKey = envKey("TAVILY_API_KEY", "NEXT_PUBLIC_TAVILY_API_KEY");
    const serperKey = envKey("SERPER_API_KEY", "SERPER_KEY", "NEXT_PUBLIC_SERPER_API_KEY");

    const cleanMsg = (message || "").trim();

    if (!cleanMsg && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Kuch poochiye ya attach kijiye." });
    }

    // -------------------------------------------------------------
    // FEATURE 1: IMAGE GENERATION
    // Only in 'imagine' mode OR explicit generation command (banao/generate + image)
    // -------------------------------------------------------------
    const shouldGenerateImage =
      mode === "imagine" ||
      (mode === "chat" && isExplicitImagePrompt(cleanMsg));

    if (shouldGenerateImage && cleanMsg) {
      const promptQuery = cleanMsg
        .replace(/^(image\s+banao|photo\s+banao|generate\s+image|draw|create\s+image|banao\s+image|banado)\s*:?/i, "")
        .trim();

      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(promptQuery || cleanMsg);
      // Place nologo=true first in query string with nologo=1 & nofeed=true to ensure zero watermarks
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&nologo=1&nofeed=true&model=flux&width=1024&height=1024&seed=${seed}`;

      return NextResponse.json({
        reply: `Aapki image generate ho gayi hai:\n**Prompt:** "${promptQuery || cleanMsg}"`,
        generatedImage: imageUrl,
      });
    }

    // -------------------------------------------------------------
    // FEATURE 2: REAL PHOTO SEARCH
    // ONLY in 'search_photo' mode OR (in chat mode) with explicit photo command (e.g. "taj mahal ki photo dikhao")
    // Never hijack bare topic queries like "taj mahal"
    // -------------------------------------------------------------
    const shouldSearchRealPhoto =
      mode === "search_photo" ||
      (mode === "chat" && isExplicitPhotoSearch(cleanMsg));

    if (shouldSearchRealPhoto) {
      let photoUrl = "";
      const searchTarget = cleanMsg
        .replace(/(ki photo dikhao|ka photo dikhao|ki photo bhejo|ka photo bhejo|photo dikhao|photo bhejo|show me a real photo of|show photo of|real photo)/gi, "")
        .trim() || cleanMsg;

      if (serperKey && searchTarget) {
        try {
          const sRes = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: `${searchTarget} high resolution real photograph`, num: 3 }),
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
          reply: `Yeh rahi **${searchTarget}** ki real photograph!`,
          generatedImage: photoUrl,
        });
      }

      // If photo not found, NEVER return a dead end — fall through to text reply about the subject!
      console.log(`Real photo not found for "${searchTarget}", falling through to informative text answer.`);
    }

    // -------------------------------------------------------------
    // FEATURE 3: IMAGE / PDF / TEXT ANALYSIS VIA GEMINI
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

        const parts: any[] = [];
        const questionPrompt = cleanMsg || "Kripya is document ya image ko dhyan se padh kar analyze karein aur iska mukhy vivaran dein.";

        if (imageBase64) {
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

        let answer = "";
        let analyzeError: any = null;
        for (const m of geminiModels) {
          try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent(parts);
            answer = result.response.text();
            if (answer) break;
          } catch (modelErr: any) {
            console.error(`Gemini analyze model ${m} failed:`, modelErr.message);
            analyzeError = modelErr;
          }
        }
        if (!answer) throw analyzeError || new Error("Gemini returned an empty analysis");

        return NextResponse.json({ reply: answer });
      } catch (err: any) {
        console.error("Gemini Analysis error:", err);
        return NextResponse.json(
          {
            reply:
              "Analyze nahi ho paya — AI model service abhi available nahi hai. Thodi der baad phir try karo.",
            error: err.message,
          },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------
    // FEATURE 4: STANDARD CHAT (GROQ -> GEMINI FALLBACK CHAIN)
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

        for (const m of groqModels) {
          try {
            const completion = await groq.chat.completions.create({
              model: m,
              messages: messagesPayload,
              max_tokens: 1500,
              temperature: 0.3,
            });
            reply = completion.choices?.[0]?.message?.content?.trim() || "";
            if (reply) {
              console.log(`Groq chat OK with model: ${m}`);
              break;
            }
          } catch (modelErr: any) {
            console.error(`Groq model ${m} failed:`, modelErr.message);
            lastError = `Groq (${m}): ${modelErr.message}`;
          }
        }
      } catch (e: any) {
        console.error("Primary Groq failure:", e.message);
        lastError = `Groq Error: ${e.message}`;
      }
    }

    // B. Secondary Fallback: Google Gemini (model chain)
    if (!reply && geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const geminiPrompt = `${systemPrompt}\n\n${
        searchContext ? `Web Context:\n${searchContext}\n\n` : ""
      }User Query: ${cleanMsg}`;

      for (const m of geminiModels) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const gRes = await model.generateContent(geminiPrompt);
          reply = gRes.response.text().trim();
          if (reply) {
            console.log(`Gemini chat OK with model: ${m}`);
            break;
          }
        } catch (e: any) {
          console.error(`Gemini model ${m} failed:`, e.message);
          lastError = `${lastError ? lastError + " | " : ""}Gemini (${m}): ${e.message}`;
        }
      }
    }

    // C. Third Fallback: OpenRouter (free models) — only when OPENROUTER_API_KEY is set
    if (!reply && openrouterKey) {
      try {
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://bharat-ai-zeta.vercel.app",
            "X-Title": "Bharat AI",
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: searchContext
                  ? `Live Web Context:\n${searchContext}\n\nQuestion: ${cleanMsg}`
                  : cleanMsg,
              },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        });
        const orData = await orRes.json();
        reply = orData.choices?.[0]?.message?.content?.trim() || "";
        if (!reply) {
          lastError = `${lastError ? lastError + " | " : ""}OpenRouter (${openrouterModel}): ${
            orData.error?.message || `HTTP ${orRes.status}`
          }`;
        } else {
          console.log(`OpenRouter chat OK with model: ${openrouterModel}`);
        }
      } catch (e: any) {
        console.error("OpenRouter failure:", e.message);
        lastError = `${lastError ? lastError + " | " : ""}OpenRouter: ${e.message}`;
      }
    }

    // C. If both fail, return real HTTP 502 with genuine provider error
    if (!reply) {
      const errorReason = lastError || "No active AI provider keys configured on server.";
      return NextResponse.json(
        {
          error: errorReason,
          reply:
            "Server se jawab nahi aaya — AI service abhi busy/down hai. Thodi der baad Retry dabakar phir try karo.",
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
        reply: "Server me kuch gadbad ho gayi hai. Thodi der baad phir try karo.",
      },
      { status: 500 }
    );
  }
}
