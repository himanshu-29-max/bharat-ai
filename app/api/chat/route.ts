import { NextResponse } from 'next/server';

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

    // 1. GREETING HANDLER
    const isGreeting = /^(hi|hello|hey|namaste|hii|helo)$/i.test(cleanMsg.toLowerCase());
    if (isGreeting && !imageBase64 && !fileBase64) {
      return NextResponse.json({ reply: "Namaste! Main Bharat AI hoon. Aaj kis vishay mein jaankari chahiye?" });
    }

    // 2. REAL-TIME GOOGLE SEARCH (Serper)
    let searchData = "";
    if (serperKey && cleanMsg.length > 2) {
      try {
        const sRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            q: `${cleanMsg} 2026 latest news update India`,
            gl: "in",
            hl: "en",
            num: 5,
          }),
        });
        const sd = await sRes.json();
        if (sd.answerBox?.answer) searchData += `Direct Answer: ${sd.answerBox.answer}\n`;
        if (sd.answerBox?.snippet) searchData += `${sd.answerBox.snippet}\n`;
        const results = sd.organic?.slice(0, 4) || [];
        if (results.length > 0) {
          searchData += results.map((r: any) => `${r.title}: ${r.snippet}`).join("\n");
        }
      } catch (err) {
        console.error("Serper API error:", err);
      }
    }

    const systemPrompt = `Tu Bharat AI hai, banaya hai Himanshu Ranjan ne. Aaj ki taareekh: ${aajKiDate}.
User ke sawaal ka bilkul taaza aur accurate jawab seedhe Hinglish mein do (2-3 sentences max).
Live Google Search data ko sabse pehle prioritize karo. Kisi bhi purane static data par depend mat raho.
Har jawab Namaste! se shuru karo.`;

    const userPrompt = searchData
      ? `${systemPrompt}\n\n[LIVE SEARCH RESULTS]:\n${searchData}\n\n[USER QUESTION]: ${cleanMsg}`
      : `${systemPrompt}\n\n[USER QUESTION]: ${cleanMsg}`;

    let reply = "";

    // 3. PRIMARY: Gemini Direct Flash Call
    if (geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
          })
        });
        const data = await res.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      } catch (e) {
        console.error("Gemini 2.0 error:", e);
      }
    }

    // 4. SECONDARY: Groq API
    if (!reply && groqKey) {
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
              { role: "user", content: searchData ? `Live Data:\n${searchData}\n\nQuestion: ${cleanMsg}` : cleanMsg }
            ],
            max_tokens: 500,
            temperature: 0.2
          })
        });
        const groqData = await groqRes.json();
        reply = groqData.choices?.[0]?.message?.content?.trim() || "";
      } catch (e) {
        console.error("Groq API error:", e);
      }
    }

    // 5. LIVE SEARCH DIRECT SUMMARY (Agar LLM key fail ho jaye toh bhi live search output clean dikhega)
    if (!reply) {
      if (searchData) {
        const cleanSnippet = searchData
          .replace(/https?:\/\/\S+/g, '')
          .replace(/[@#]\S+/g, '')
          .replace(/\n+/g, ' ')
          .slice(0, 250);
        reply = `Namaste! Taza jaankari ke anusaar: ${cleanSnippet}`;
      } else {
        reply = "Namaste! Live data load karne me samasya aayi. Kripya kuch samay baad dobara prayas karein.";
      }
    }

    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Chat route fatal:", err);
    return NextResponse.json({ reply: "Namaste! Server issue aaya hai, kripya page refresh karein." });
  }
}