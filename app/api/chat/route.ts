import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;
    const serperKey = process.env.NEXT_PUBLIC_SERPER_API_KEY;

    // 🔍 Google Search Logic (Live Connectivity)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${message} latest 2026`, gl: "in", num: 6 }),
    });
    const sData = await serperRes.json();
    const context = sData.organic?.map((r: any) => r.snippet).join('\n') || "";

    // 🧠 AI Brain Logic
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey?.trim()}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `You are Bharat AI. Developed by Himanshu Ranjan.
            CURRENT DATE: Tuesday, March 31, 2026.
            
            RULES:
            - Answer in Hinglish.
            - Use this live data to answer: ${context}
            - If data says Darbhanga DM is Rajeev Roshan, say it directly.
            - DO NOT mention "I used search context" or "according to sources".
            - Be humble, smart, and direct.` 
          },
          { role: "user", content: message },
        ],
        temperature: 0.1,
      }),
    });

    const data = await groqRes.json();
    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (err) {
    return NextResponse.json({ reply: "Bhai, net ya API check karo!" });
  }
}