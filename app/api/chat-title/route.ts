import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import Groq from "groq-sdk";
import { groqModelChain } from "@/lib/models";

export const runtime = "nodejs";

// Older deployments stored the Groq key under a legacy name in Vercel.
const envKey = (...names: string[]) => {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
};

// POST /api/chat-title — ChatGPT-style smart title for a chat, generated once
// from its first exchange. Returns { title: null } on any failure so the
// client quietly keeps its fallback title.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ title: null }, { status: 401 });

  let user = "";
  let assistant = "";
  try {
    const b = await req.json();
    user = String(b?.user || "").slice(0, 500);
    assistant = String(b?.assistant || "").slice(0, 500);
  } catch {
    /* ignore */
  }
  if (!user) return NextResponse.json({ title: null });

  const groqKey = envKey("GROQ_API_KEY", "GROQ_KEY", "NEXT_PUBLIC_GROQ_API_KEY");
  if (!groqKey) return NextResponse.json({ title: null });

  // Fastest model first for a snappy title.
  const models = [...groqModelChain(process.env.GROQ_MODEL)].reverse();
  const groq = new Groq({ apiKey: groqKey });

  for (const model of models) {
    try {
      const c = await groq.chat.completions.create({
        model,
        max_tokens: 32,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Create a very short title (3-6 words) for this chat, like ChatGPT does. Use the same language and script as the user's first message (English / Hinglish / Hindi). Title Case for English/Hinglish. Describe the topic, not the wording. No quotes, no full stop, no emoji, no prefix like 'Title:'.",
          },
          { role: "user", content: `User: ${user}\nAssistant: ${assistant}` },
        ],
      });
      let t = (c.choices?.[0]?.message?.content || "").trim();
      t = t
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/\s+/g, " ")
        .replace(/\.+$/, "")
        .slice(0, 60);
      if (t.length >= 3) return NextResponse.json({ title: t });
    } catch {
      /* try the next model */
    }
  }
  return NextResponse.json({ title: null });
}
