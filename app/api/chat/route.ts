import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      model: "llama-3.3-70b-versatile",
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}