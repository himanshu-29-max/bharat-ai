import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { getRedisClient, getRedisConfigError } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: getRedisConfigError() || "Redis database connection not configured on server." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const userKey = `user:${email}`;

    // Ensure this user appears in the admin index even if the sign-in upsert
    // never ran (e.g. a session created while Redis was unreachable). Without
    // this, the admin dashboard shows 0 users / no activity for active users.
    try {
      await redis.sadd("admin:all-user-emails", email);
      const acctKey = `user-account:${email}`;
      const existingAcct: any = await redis.get(acctKey);
      if (!existingAcct) {
        await redis.set(acctKey, {
          name: (session.user as any).name || email.split("@")[0],
          email,
          role: (session.user as any).role === "admin" ? "admin" : "user",
          providers: [],
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          marketingOptIn: false,
        });
      }
    } catch (e) {
      console.error("Admin index ensure failed:", e);
    }

    if (chatId) {
      const messages = await redis.get<any[]>(`${userKey}:chat:${chatId}`);
      return NextResponse.json({ messages: Array.isArray(messages) ? messages : [] });
    }

    const chats = await redis.get<any[]>(`${userKey}:chats`);
    return NextResponse.json({ chats: Array.isArray(chats) ? chats : [] });
  } catch (e: any) {
    console.error("History GET error:", e);
    return NextResponse.json(
      { error: `Database error: ${e.message || String(e)}` },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: getRedisConfigError() || "Redis database connection not configured on server." },
        { status: 500 }
      );
    }

    const { chatId, title, messages } = await req.json();
    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const userKey = `user:${email}`;

    // Clean messages: DO NOT store huge raw base64 data for uploaded images (prevent Redis payload limit blowouts)
    // Only store generatedImage URLs (Pollinations) and lightweight metadata
    const cleanMsgs = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content || "",
      fileName: m.fileName || undefined,
      image: m.image && !m.image.startsWith("data:") ? m.image : undefined, // omit bulky data: URLs from long-term history
      generatedImage: m.generatedImage || undefined,
      extraImages: Array.isArray(m.extraImages) ? m.extraImages.slice(0, 4) : undefined,
    }));

    // Store chat messages with 30-day expiration (2592000 seconds)
    await redis.set(`${userKey}:chat:${chatId}`, cleanMsgs, { ex: 2592000 });

    const existing: any[] = (await redis.get<any[]>(`${userKey}:chats`)) || [];
    const filtered = existing.filter((c: any) => c.id !== chatId);
    const updated = [
      { id: chatId, title: (title || "Chat").slice(0, 80), updatedAt: Date.now() },
      ...filtered,
    ].slice(0, 50);

    await redis.set(`${userKey}:chats`, updated);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("History POST error:", e);
    return NextResponse.json(
      { error: `History save failed: ${e.message || String(e)}` },
      { status: 500 }
    );
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
      return NextResponse.json({ error: getRedisConfigError() || "Redis database connection missing" }, { status: 500 });
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
    return NextResponse.json({ error: `Delete failed: ${e.message || String(e)}` }, { status: 500 });
  }
}
