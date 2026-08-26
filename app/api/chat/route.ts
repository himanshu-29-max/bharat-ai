import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { message, imageBase64, fileBase64, history = [] } = await req.json();

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY?.trim() || process.env.SERPER_API_KEY?.trim();

    const now = new Date();
    const aajKiDate = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const cleanMsg = message?.trim() || "";

    if (!cleanMsg && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Kuch poochiye." });
    }

    // 1. Simple Greetings
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(cleanMsg.toLowerCase());
    if (isGreeting && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis vishay mein jaankari chahiye?" });
    }

    // 2. Google Search Context (Serper)
    let searchContext = "";
    if (serperKey && cleanMsg.length > 2) {
      try {
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q: `${cleanMsg} India latest`, gl: "in", hl: "hi", num: 4 }),
        });
        const sd = await sRes.json();
        if (sd.answerBox?.answer) searchContext += `${sd.answerBox.answer}. `;
        if (sd.answerBox?.snippet) searchContext += `${sd.answerBox.snippet}. `;
        const results = sd.organic?.slice(0, 3) || [];
        if (results.length > 0) {
          searchContext += results.map((r: any) => `${r.title}: ${r.snippet}`).join(" ");
        }
      } catch (err) {
        console.error("Search error:", err);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki date: ${aajKiDate}.
User ke sawaal ka accurate, concise aur direct Hinglish mein jawab do (2-3 lines).
Namaste! se shuru karo.`;

    let reply = "";

    // 3. Primary: Groq SDK (Llama 3.1)
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: searchContext ? `Search Context: ${searchContext}\n\nQuestion: ${cleanMsg}` : cleanMsg }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          max_tokens: 600,
        });
        reply = completion.choices[0]?.message?.content?.trim() || "";
      } catch (e) {
        console.error("Groq SDK error:", e);
      }
    }

    // 4. Secondary: Gemini REST
    if (!reply && geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nSearch Context: ${searchContext}\n\nQuestion: ${cleanMsg}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
          })
        });
        const data = await res.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      } catch (e) {
        console.error("Gemini failed:", e);
      }
    }

    // 5. Context-aware Fallback
    if (!reply) {
      if (/deputy.*cm|up.*mukhya.*mantri/i.test(cleanMsg)) {
        reply = "Namaste! Bihar ke Deputy Chief Ministers Samrat Choudhary aur Vijay Kumar Sinha hain.";
      } else if (/\bcm\b|chief.*minister|mukhya.*mantri/i.test(cleanMsg)) {
        reply = "Namaste! Bihar ke Chief Minister Nitish Kumar hain.";
      } else if (searchContext) {
        const clean = searchContext.replace(/https?:\/\/\S+/g, '').replace(/[@#]\S+/g, '').slice(0, 220);
        reply = `Namaste! Latest updates: ${clean}`;
      } else {
        reply = "Namaste! Main aapka sawaal samajh gaya hoon. Kripya thodi der baad dobara poochiye.";
      }
    }

    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ reply: "Namaste! Server se connect karne mein samasya aayi." });
  }
}