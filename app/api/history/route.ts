import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) throw new Error("Redis env vars missing");
  return { url, token };
}

async function redisGet(key: string) {
  const { url, token } = getRedis();
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  // Upstash returns string — parse if needed
  try {
    return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
  } catch {
    return data.result;
  }
}

async function redisSet(key: string, value: any, exSeconds = 60 * 60 * 24 * 30) {
  const { url, token } = getRedis();
  const serialized = JSON.stringify(value);
  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([serialized, "EX", exSeconds]),
  });
}

async function redisDel(key: string) {
  const { url, token } = getRedis();
  await fetch(`${url}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ chats: [], messages: [] });

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const userKey = `user:${session.user.email}`;

    if (chatId) {
      const messages = await redisGet(`${userKey}:chat:${chatId}`);
      return NextResponse.json({ messages: Array.isArray(messages) ? messages : [] });
    } else {
      const chats = await redisGet(`${userKey}:chats`);
      return NextResponse.json({ chats: Array.isArray(chats) ? chats : [] });
    }
  } catch (e) {
    console.error("History GET error:", e);
    return NextResponse.json({ chats: [], messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatId, title, messages } = await req.json();
    if (!chatId || !messages) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const userKey = `user:${session.user.email}`;

    // Save messages (without large base64 images)
    const cleanMsgs = messages.map((m: any) => ({
      role: m.role,
      content: m.content || "",
      fileName: m.fileName || undefined,
      generatedImage: m.generatedImage?.startsWith("http") ? m.generatedImage : undefined,
    }));
    await redisSet(`${userKey}:chat:${chatId}`, cleanMsgs);

    // Update chat list
    const existing: any[] = (await redisGet(`${userKey}:chats`)) || [];
    const filtered = existing.filter((c: any) => c.id !== chatId);
    const updated = [{ id: chatId, title: title?.slice(0, 50) || "Chat", updatedAt: Date.now() }, ...filtered].slice(0, 50);
    await redisSet(`${userKey}:chats`, updated);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("History POST error:", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatId } = await req.json();
    const userKey = `user:${session.user.email}`;

    await redisDel(`${userKey}:chat:${chatId}`);
    const existing: any[] = (await redisGet(`${userKey}:chats`)) || [];
    await redisSet(`${userKey}:chats`, existing.filter((c: any) => c.id !== chatId));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("History DELETE error:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
