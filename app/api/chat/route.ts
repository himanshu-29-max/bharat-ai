import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { groqModelChain, geminiModelChain } from "@/lib/models";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import {
  getUserControls,
  consumeImageQuota,
  detectLanguage,
} from "@/lib/permissions";

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

// Feature/admin messages: English by default; Hinglish only when the user
// is conversing in a non-English language (langInfo.local).
const blockedMsg = (en: string, hi: string, local: boolean) => (local ? hi : en);


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

    // Per-user state: admin controls (blocks/limits) + the user's own language.
    const session = await getServerSession(authOptions).catch(() => null);
    const userEmail = (session?.user?.email || "").toLowerCase();
    const controls = userEmail
      ? await getUserControls(userEmail)
      : { blockedFeatures: [] as string[], imageDailyLimit: 0 };
    const langInfo = detectLanguage(message, history);
    const L = langInfo.local;
    const bMsg = (en: string, hi: string) => blockedMsg(en, hi, L);

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
      return NextResponse.json({ reply: bMsg("Hello! Please ask a question or attach a file.", "Namaste! Kuch poochiye ya attach kijiye.") });
    }

    // -------------------------------------------------------------
    // FEATURE 1: IMAGE GENERATION
    // Only in 'imagine' mode OR explicit generation command (banao/generate + image)
    // -------------------------------------------------------------
    const shouldGenerateImage =
      mode === "imagine" ||
      (mode === "chat" && isExplicitImagePrompt(cleanMsg));

    if (shouldGenerateImage && cleanMsg) {
      if (controls.blockedFeatures.includes("image")) {
        return NextResponse.json({
          reply: bMsg(
            "Image generation is disabled for your account by the admin. Please contact the admin if you need it enabled.",
            "Admin ne aapke account ke liye image generation band kiya hua hai. Chalu karwana ho to admin se sampark karein."
          ),
        });
      }
      if (userEmail) {
        const quota = await consumeImageQuota(userEmail, controls.imageDailyLimit);
        if (!quota.allowed) {
          return NextResponse.json({
            reply: bMsg(
              `You have reached today's image generation limit (${controls.imageDailyLimit} images per day). Please try again tomorrow.`,
              `Aaj ki image limit khatm ho gayi hai (${controls.imageDailyLimit} images per day). Kal phir try karein.`
            ),
          });
        }
      }
      const promptQuery = cleanMsg
        .replace(/^(image\s+banao|photo\s+banao|generate\s+image|draw|create\s+image|banao\s+image|banado)\s*:?/i, "")
        .trim();

      // Prompt enhancement: chhote / Hinglish input ko detailed English prompt
      // me badlo taaki image ki quality behtar ho. Fail ho to raw prompt chalega.
      // NOTE: gpt-oss models "reasoning" models hain — chhota max_tokens rakhne
      // par saare tokens sochne me kharch ho jate hain aur jawab khaali aata
      // hai. Isiliye pehle OpenRouter ka seedha model, phir bada budget.
      let finalPrompt = promptQuery || cleanMsg;
      const enhancerSystem =
        "You are an expert image-prompt writer for a text-to-image AI. Rewrite the user's request (any language) into ONE detailed English prompt: subject, appearance, clothing/setting, background, lighting, photorealistic style, ultra detailed. Max 60 words. If the request is only a person's name, describe a generic fictional portrait of an Indian person - never claim it depicts a real person. Output ONLY the prompt text.";
      const tryEnhance = (txt: string | undefined | null) => {
        const t = (txt || "").trim();
        return t.length > 25 && t.toLowerCase() !== finalPrompt.toLowerCase() ? t : "";
      };

      // 1) OpenRouter — non-reasoning model, tez aur seedha jawab
      if (openrouterKey) {
        try {
          const oRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: openrouterModel,
              max_tokens: 220,
              temperature: 0.7,
              messages: [
                { role: "system", content: enhancerSystem },
                { role: "user", content: finalPrompt },
              ],
            }),
          });
          const oData = await oRes.json();
          const ep = tryEnhance(oData?.choices?.[0]?.message?.content);
          if (ep) finalPrompt = ep;
        } catch (e) {
          console.error("Prompt enhance (OpenRouter) failed:", e);
        }
      }

      // 2) Groq gpt-oss — bada token budget + low reasoning effort
      if (finalPrompt === (promptQuery || cleanMsg) && groqKey) {
        try {
          const enhancer = new Groq({ apiKey: groqKey });
          for (const m of [...groqModels].reverse()) {
            try {
              const ec = await enhancer.chat.completions.create({
                model: m,
                max_tokens: 700,
                temperature: 0.7,
                reasoning_effort: "low",
                messages: [
                  { role: "system", content: enhancerSystem },
                  { role: "user", content: finalPrompt },
                ],
              } as any);
              const ep = tryEnhance(ec.choices?.[0]?.message?.content);
              if (ep) {
                finalPrompt = ep;
                break;
              }
            } catch (e) {
              console.error("Prompt enhance (Groq) failed:", e);
            }
          }
        } catch (e) {
          console.error("Prompt enhance setup failed:", e);
        }
      }

      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(finalPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&nologo=1&nofeed=true&private=true&model=flux&width=1024&height=1024&seed=${seed}`;

      const isShortInput = (promptQuery || cleanMsg).split(/\s+/).length <= 3;
      const note = isShortInput
        ? bMsg(
            "\n\n_Note: This is an AI-generated fictional image. For a real photograph of an actual person, please use the 'Real Photo Dhundo' mode._",
            "\n\n_Note: Ye AI-generated kalpanik image hai. Kisi asal vyakti ki asli photo ke liye 'Real Photo Dhundo' mode use karein._"
          )
        : "";
      const doneLine = bMsg(
        "Your image has been generated:",
        "Aapki image generate ho gayi hai:"
      );
      return NextResponse.json({
        reply: `${doneLine}\n**Prompt:** "${finalPrompt}"${note}`,
        generatedImage: imageUrl,
        imageSource: "generated",
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
      if (controls.blockedFeatures.includes("photo")) {
        return NextResponse.json({
          reply: bMsg(
            "Real photo search is disabled for your account by the admin.",
            "Admin ne aapke account ke liye real photo search band kiya hua hai."
          ),
        });
      }
      const searchTarget =
        cleanMsg
          .replace(/(ki photo dikhao|ka photo dikhao|ki photo bhejo|ka photo bhejo|photo dikhao|photo bhejo|show me a real photo of|show photo of|real photo)/gi, "")
          .trim() || cleanMsg;

      const photoUrls: string[] = [];

      // Source 1: Serper Google Images (Google Search ki asli photos)
      if (serperKey && searchTarget) {
        try {
          const sRes = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: searchTarget, num: 5 }),
          });
          const sData = await sRes.json();
          for (const im of sData.images || []) {
            if (im?.imageUrl && !photoUrls.includes(im.imageUrl)) photoUrls.push(im.imageUrl);
            if (photoUrls.length >= 3) break;
          }
        } catch (e: any) {
          console.error("Serper photo lookup error:", e);
        }
      }

      // Source 2: Tavily images (backup)
      if (photoUrls.length === 0 && tavilyKey && searchTarget) {
        try {
          const tRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: searchTarget,
              include_images: true,
              max_results: 5,
            }),
          });
          const tData = await tRes.json();
          for (const im of tData.images || []) {
            const u = typeof im === "string" ? im : im?.url;
            if (u && !photoUrls.includes(u)) photoUrls.push(u);
            if (photoUrls.length >= 3) break;
          }
        } catch (e: any) {
          console.error("Tavily photo lookup error:", e);
        }
      }

      if (photoUrls.length > 0) {
        return NextResponse.json({
          reply: bMsg(
            `Here is a real photograph of **${searchTarget}**! (An actual photo from Google Search)`,
            `Yeh rahi **${searchTarget}** ki real photograph! (Google search se li gayi asli photo)`
          ),
          generatedImage: photoUrls[0],
          extraImages: photoUrls.slice(1),
          imageSource: "real",
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
      if (controls.blockedFeatures.includes("analyze")) {
        return NextResponse.json({
          reply: bMsg(
            "File analysis is disabled for your account by the admin.",
            "Admin ne aapke account ke liye file analysis band kiya hua hai."
          ),
        });
      }
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
        const questionPrompt = cleanMsg || "Please carefully read and analyze the attached document or image, and give its key summary.";

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

        // Fallback: text files / text-extractable PDFs can still be answered by
        // Groq or OpenRouter in the SAME language as the user.
        const fbText =
          !imageBase64 && fileBase64
            ? (() => {
                try {
                  return Buffer.from(fileBase64, "base64").toString("utf-8").slice(0, 15000);
                } catch {
                  return "";
                }
              })()
            : "";
        const printable = fbText.replace(/[^\x20-\x7E\n\r\t]/g, "").trim();
        if (printable.length > 200) {
          const fbSystem = `You are Bharat AI, an intelligent Indian AI assistant built by Himanshu Ranjan.\n${langInfo.instruction}\nAnswer in clean Markdown with short paragraphs and bullets.`;
          const fbPrompt = `Attached file content:\n${printable}\n\nUser question: ${cleanMsg || "Analyze this document and give its key summary."}`;
          if (groqKey) {
            try {
              const g = new Groq({ apiKey: groqKey });
              for (const m of groqModels) {
                try {
                  const cc = await g.chat.completions.create({
                    model: m,
                    max_tokens: 1200,
                    temperature: 0.3,
                    messages: [
                      { role: "system", content: fbSystem },
                      { role: "user", content: fbPrompt },
                    ],
                  });
                  const txt = cc.choices?.[0]?.message?.content?.trim();
                  if (txt) return NextResponse.json({ reply: txt });
                } catch { /* next model */ }
              }
            } catch { /* fall through */ }
          }
          if (openrouterKey) {
            try {
              const oRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${openrouterKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: openrouterModel,
                  max_tokens: 1200,
                  temperature: 0.3,
                  messages: [
                    { role: "system", content: fbSystem },
                    { role: "user", content: fbPrompt },
                  ],
                }),
              });
              const oData = await oRes.json();
              const txt = oData?.choices?.[0]?.message?.content?.trim();
              if (txt) return NextResponse.json({ reply: txt });
            } catch { /* fall through */ }
          }
        }

        return NextResponse.json(
          {
            reply: bMsg(
              "Analysis could not be completed — the vision service (Gemini) is not responding right now. A fresh Gemini API key may be needed; please try again later.",
              "Analyze nahi ho paya — vision service (Gemini) abhi jawab nahi de raha hai. Shayad nayi Gemini API key ki zaroorat hai; thodi der baad phir try karein."
            ),
            error: err.message,
          },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------
    if (controls.blockedFeatures.includes("chat")) {
      return NextResponse.json({
        reply: bMsg(
          "Chat is disabled for your account by the admin. Please contact the admin if you need it enabled.",
          "Admin ne aapke account ke liye chat band kiya hua hai. Chalu karwana ho to admin se sampark karein."
        ),
      });
    }

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
LANGUAGE: ${langInfo.instruction}
DEFAULT LANGUAGE: English. Only switch when the user's own language clearly differs, as described above.
Provide complete sentences without cutting off mid-way.

REPLY FORMATTING (bahut zaroori — hamesha follow karo):
- Jawab saaf Markdown me do: pehle 1-2 line ka short intro/summary, phir zaroorat ho to ## headings aur bullet points. Key baatein **bold** karo.
- Kabhi bhi lambi text ki deewaar (wall of text) mat banao. Ek paragraph zyada se zyada 2-3 line ka ho, points alag-alag lines me hon.
- Agar user sirf ek naam ya topic likhe (jaise "narendra modi"), to pehle chhota sa overview do (8-10 line ke andar), phir ant me ek line me poochho ki kya woh kisi khaas hisse par aur detail chahta hai. Poora jeevan-parichay ek saath mat likho.
- Table sirf tab banao jab tulnaa ya data ho, aur table chhoti rakho (zyada se zyada 5-6 rows). Aam jawab headings + bullets me do.
- Default jawab medium length ka ho. Lamba detail tabhi do jab user "detail me batao" jaisa kuch kahe.`;

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
          reply: bMsg(
            "No response from the server — the AI service is busy or down right now. Please press Retry and try again in a little while.",
            "Server se jawab nahi aaya — AI service abhi busy/down hai. Thodi der baad Retry dabakar phir try karo."
          ),
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
        reply: blockedMsg(
          "Something went wrong on the server. Please try again in a little while.",
          "Server me kuch gadbad ho gayi hai. Thodi der baad phir try karo.",
          false
        ),
      },
      { status: 500 }
    );
  }
}
