import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN?.trim()}`,
  "Content-Type": "application/json",
});
const BASE = () => process.env.UPSTASH_REDIS_REST_URL?.trim();

async function redisGet(key: string) {
  const res = await fetch(`${BASE()}/get/${encodeURIComponent(key)}`, { headers: getHeaders() });
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function redisSet(key: string, value: any) {
  await fetch(`${BASE()}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(JSON.stringify(value)), // Upstash REST expects string body for SET
  });
  // Set expiry 30 days
  await fetch(`${BASE()}/expire/${encodeURIComponent(key)}/2592000`, {
    method: "POST",
    headers: getHeaders(),
  });
}

async function redisDel(key: string) {
  await fetch(`${BASE()}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: getHeaders(),
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
    }
    const chats = await redisGet(`${userKey}:chats`);
    return NextResponse.json({ chats: Array.isArray(chats) ? chats : [] });
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
    if (!chatId) return NextResponse.json({ error: "Missing chatId" }, { status: 400 });

    const userKey = `user:${session.user.email}`;

    // Save messages — strip large base64
    const cleanMsgs = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content || "",
      fileName: m.fileName || undefined,
      generatedImage: m.generatedImage?.startsWith("http") ? m.generatedImage : undefined,
    }));
    await redisSet(`${userKey}:chat:${chatId}`, cleanMsgs);

    // Update chat list
    const existing: any[] = (await redisGet(`${userKey}:chats`)) || [];
    const filtered = existing.filter((c: any) => c.id !== chatId);
    const updated = [
      { id: chatId, title: (title || "Chat").slice(0, 50), updatedAt: Date.now() },
      ...filtered,
    ].slice(0, 50);
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
