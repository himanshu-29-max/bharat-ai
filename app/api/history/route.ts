import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/options";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) throw new Error("Redis env vars missing");
  if (!url.startsWith("https://")) throw new Error(`Invalid URL: ${url.slice(0, 20)}`);
  return { url, token };
}

async function redisGet(key: string) {
  const { url, token } = getRedis();
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function redisSet(key: string, value: any) {
  const { url, token } = getRedis();
  const serialized = JSON.stringify(value);
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}/ex/2592000`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.json();
}

async function redisDel(key: string) {
  const { url, token } = getRedis();
  await fetch(`${url}/del/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log("History GET: No session");
      return NextResponse.json({ chats: [], messages: [] });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const userKey = `user:${session.user.email}`;

    if (chatId) {
      const messages = await redisGet(`${userKey}:chat:${chatId}`);
      console.log(`Load chat ${chatId}: ${Array.isArray(messages) ? messages.length : 0} messages`);
      return NextResponse.json({ messages: Array.isArray(messages) ? messages : [] });
    }

    const chats = await redisGet(`${userKey}:chats`);
    console.log(`Load chats list: ${Array.isArray(chats) ? chats.length : 0} chats`);
    return NextResponse.json({ chats: Array.isArray(chats) ? chats : [] });
  } catch (e) {
    console.error("History GET error:", e);
    return NextResponse.json({ chats: [], messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log("History POST: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, title, messages } = await req.json();
    if (!chatId) return NextResponse.json({ error: "Missing chatId" }, { status: 400 });

    const userKey = `user:${session.user.email}`;

    const cleanMsgs = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content || "",
      fileName: m.fileName || undefined,
      generatedImage: m.generatedImage?.startsWith("http") ? m.generatedImage : undefined,
    }));

    const setResult = await redisSet(`${userKey}:chat:${chatId}`, cleanMsgs);
    console.log(`Saved chat ${chatId} for ${session.user.email}:`, setResult);

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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
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
