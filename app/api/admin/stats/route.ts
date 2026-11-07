import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import { getRedisClient } from "@/lib/redis";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Access denied: Admins only" }, { status: 403 });
  }

  const redis = getRedisClient();
  let redisStatus = "Missing";
  let totalUsers = 0;
  let totalChats = 0;
  let totalMessages = 0;
  let totalImages = 0;
  let newSignupsToday = 0;
  let newSignupsThisWeek = 0;
  let recentChats: any[] = [];

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  if (redis) {
    try {
      await redis.ping();
      redisStatus = "OK";

      // Count registered users
      const emailMembers = await redis.smembers("admin:all-user-emails");
      const userEmails = Array.isArray(emailMembers) ? emailMembers : [];
      totalUsers = userEmails.length;

      // Scan through user chats and metadata
      for (const email of userEmails) {
        // Check user creation time for stats
        const u = await redis.get<any>(`user-account:${email}`);
        if (u?.createdAt) {
          if (now - u.createdAt < oneDay) newSignupsToday++;
          if (now - u.createdAt < sevenDays) newSignupsThisWeek++;
        }

        // Get chats list for user
        const chats = await redis.get<any[]>(`user:${email}:chats`);
        if (Array.isArray(chats)) {
          totalChats += chats.length;

          for (const c of chats) {
            recentChats.push({
              id: c.id,
              userEmail: email,
              title: c.title || "Untitled Chat",
              updatedAt: c.updatedAt || 0,
              messageCount: 0,
            });

            // Inspect chat message counts and generated images
            const fullChat = await redis.get<any[]>(`user:${email}:chat:${c.id}`);
            if (Array.isArray(fullChat)) {
              totalMessages += fullChat.length;
              const imgCount = fullChat.filter((m) => !!m.generatedImage).length;
              totalImages += imgCount;

              // attach message count to metadata
              const lastRecent = recentChats[recentChats.length - 1];
              if (lastRecent && lastRecent.id === c.id) {
                lastRecent.messageCount = fullChat.length;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Redis admin stats error:", err);
      redisStatus = "Failing";
    }
  }

  // Sort recent chats descending by updatedAt
  recentChats.sort((a, b) => b.updatedAt - a.updatedAt);
  recentChats = recentChats.slice(0, 20);

  // Health checks
  let groqStatus = "Missing";
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const groqModel = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      await groq.chat.completions.create({
        model: groqModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
      });
      groqStatus = "OK";
    } catch (e: any) {
      console.error("Groq health error:", e.message);
      groqStatus = "Failing";
    }
  }

  let geminiStatus = "Missing";
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: geminiModel });
      await model.generateContent("ping");
      geminiStatus = "OK";
    } catch (e: any) {
      console.error("Gemini health error:", e.message);
      geminiStatus = "Failing";
    }
  }

  const tavilyStatus = process.env.TAVILY_API_KEY?.trim() ? "OK" : "Missing";
  const serperStatus = process.env.SERPER_API_KEY?.trim() ? "OK" : "Missing";
  const nextauthSecretStatus = process.env.NEXTAUTH_SECRET?.trim() ? "OK" : "Missing";

  return NextResponse.json({
    stats: {
      totalUsers,
      totalChats,
      totalMessages,
      totalImages,
      newSignupsToday,
      newSignupsThisWeek,
    },
    recentChats,
    health: {
      redis: redisStatus,
      groq: groqStatus,
      groqModel,
      gemini: geminiStatus,
      geminiModel,
      tavily: tavilyStatus,
      serper: serperStatus,
      nextauthSecret: nextauthSecretStatus,
    },
  });
}

