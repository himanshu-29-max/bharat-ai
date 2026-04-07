import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, imageBase64 } = await req.json();
    const orKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!orKey) {
      return NextResponse.json({ reply: "Bhai, Vercel mein OPENROUTER_API_KEY Missing hai!" });
    }

    // 🧠 Automatic Analysis Logic
    // Agar photo hai aur text nahi, toh AI ko bolo automatic analyze kare
    let finalInstruction = message || "Explain this image deeply.";
    
    let contentPayload: any = [{ type: "text", text: finalInstruction }];

    // Image ko content mein add karo agar select hui hai
    if (imageBase64) {
      contentPayload.push({
        type: "image_url",
        image_url: { url: imageBase64 }
      });
    }

    // Gemini 2.0 Vision support model (OpenRouter se bypass)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", 
        messages: [{ role: "user", content: contentPayload }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Bhai, AI ne khali jawab diya!" });

  } catch (err) {
    return NextResponse.json({ reply: "Bhai, photo process nahi ho payi!" });
  }
}