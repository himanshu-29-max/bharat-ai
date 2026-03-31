import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY;

    if (!apiKey || !serperKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein Keys missing hain!" });
    }

    // 🔍 STEP 1: DEEP GOOGLE SEARCH (HAR EK QUERY PE)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        q: `${message} latest news March 2026 India Bihar`, 
        gl: "in",
        num: 10 
      }),
    });

    const serperData = await serperRes.json();
    const searchContext = serperData.organic
      ?.map((r: any, i: number) => `${i+1}. ${r.title}: ${r.snippet}`)
      .join('\n\n') || "No live web data found.";

    // 🧠 STEP 2: AI BRAIN (FORCED TO USE GOOGLE DATA)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `You are Bharat AI V28 OMNI. Developed by Himanshu Ranjan.
            CURRENT DATE: Tuesday, March 31, 2026.

            STRICT INSTRUCTIONS:
            1. Every time you answer, you MUST acknowledge you are chatting with "Himanshu Ranjan".
            2. For ALL factual questions (DM, Ministers, News, Scores), use the SEARCH CONTEXT provided below. 
            3. Do NOT use your internal training data. It is outdated.
            4. Bihar Specific (Strict): 
               - Darbhanga DM: Rajeev Roshan.
               - Bihar BJP President: Dilip Jaiswal.
            5. Answer in professional Hinglish. Use points and bold text.

            SEARCH CONTEXT (LIVE FROM GOOGLE):
            ${searchContext}` 
          },
          { role: "user", content: message },
        ],
        temperature: 0.1, // Full Accuracy
      }),
    });

    const data = await groqRes.json();
    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error) {
    return NextResponse.json({ reply: "Bhai, server side lafda ho gaya!" }, { status: 500 });
  }
}