import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET: Load all chats list for sidebar
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  const userKey = `user:${session.user.email}`;

  try {
    if (chatId) {
      // Load specific chat messages
      const messages = await redis.get(`${userKey}:chat:${chatId}`);
      return NextResponse.json({ messages: messages || [] });
    } else {
      // Load chat list for sidebar
      const chats = await redis.get(`${userKey}:chats`);
      return NextResponse.json({ chats: chats || [] });
    }
  } catch (e) {
    console.error("Redis GET error:", e);
    return NextResponse.json({ chats: [], messages: [] });
  }
}

// POST: Save chat
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId, title, messages } = await req.json();
  const userKey = `user:${session.user.email}`;

  try {
    // Save messages for this chat
    await redis.set(`${userKey}:chat:${chatId}`, JSON.stringify(messages), { ex: 60 * 60 * 24 * 30 }); // 30 days

    // Update chat list
    const existingChats: any[] = (await redis.get(`${userKey}:chats`) as any) || [];
    const updatedChats = existingChats.filter((c: any) => c.id !== chatId);
    updatedChats.unshift({ id: chatId, title, updatedAt: Date.now() });
    
    // Keep max 50 chats
    const trimmed = updatedChats.slice(0, 50);
    await redis.set(`${userKey}:chats`, JSON.stringify(trimmed), { ex: 60 * 60 * 24 * 30 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Redis POST error:", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

// DELETE: Delete a chat
export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await req.json();
  const userKey = `user:${session.user.email}`;

  try {
    await redis.del(`${userKey}:chat:${chatId}`);
    const existingChats: any[] = (await redis.get(`${userKey}:chats`) as any) || [];
    const updated = existingChats.filter((c: any) => c.id !== chatId);
    await redis.set(`${userKey}:chats`, JSON.stringify(updated), { ex: 60 * 60 * 24 * 30 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
