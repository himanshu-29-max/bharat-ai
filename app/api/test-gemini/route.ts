import { NextResponse } from 'next/server';

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!geminiKey) return NextResponse.json({ error: "GEMINI_API_KEY not found" });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
  );
  const data = await res.json();
  
  return NextResponse.json({ 
    keyFound: true,
    keyLength: geminiKey.length,
    models: data.models?.map((m: any) => m.name).filter((n: string) => n.includes("flash") || n.includes("pro")),
    error: data.error || null
  });
}
