import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { getRedisClient } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ chats: [], messages: [] });
    }

    const email = session.user.email.toLowerCase();
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ chats: [], messages: [] });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const userKey = `user:${email}`;

    if (chatId) {
      const messages = await redis.get<any[]>(`${userKey}:chat:${chatId}`);
      return NextResponse.json({ messages: Array.isArray(messages) ? messages : [] });
    }

    const chats = await redis.get<any[]>(`${userKey}:chats`);
    return NextResponse.json({ chats: Array.isArray(chats) ? chats : [] });
  } catch (e: any) {
    console.error("History GET error:", e);
    return NextResponse.json({ chats: [], messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ error: "Redis connection failed" }, { status: 500 });
    }

    const { chatId, title, messages } = await req.json();
    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const userKey = `user:${email}`;

    // Clean messages and preserve generatedImage and file metadata
    const cleanMsgs = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content || "",
      fileName: m.fileName || undefined,
      image: m.image || undefined,
      generatedImage: m.generatedImage || undefined,
    }));

    // Store chat messages with 30-day expiration (2592000 seconds)
    await redis.set(`${userKey}:chat:${chatId}`, cleanMsgs, { ex: 2592000 });

    const existing: any[] = (await redis.get<any[]>(`${userKey}:chats`)) || [];
    const filtered = existing.filter((c: any) => c.id !== chatId);
    const updated = [
      { id: chatId, title: (title || "Chat").slice(0, 50), updatedAt: Date.now() },
      ...filtered,
    ].slice(0, 50);

    await redis.set(`${userKey}:chats`, updated);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("History POST error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ error: "Redis unavailable" }, { status: 500 });
    }

    const { chatId } = await req.json();
    const userKey = `user:${email}`;

    await redis.del(`${userKey}:chat:${chatId}`);
    const existing: any[] = (await redis.get<any[]>(`${userKey}:chats`)) || [];
    await redis.set(
      `${userKey}:chats`,
      existing.filter((c: any) => c.id !== chatId)
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("History DELETE error:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
