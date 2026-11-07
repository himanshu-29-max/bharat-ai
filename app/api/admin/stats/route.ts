import { NextResponse } from "next/server";
import { groqModelChain, geminiModelChain } from "@/lib/models";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import { getRedisClient } from "@/lib/redis";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Older Bharat AI deployments stored some keys under legacy names in Vercel
// (NEXT_PUBLIC_* / GOOGLE_*). Accept those too so a rename in the dashboard
// is not required for the app to find its keys.
const envKey = (...names: string[]) => {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
};


export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Access denied: Admins only" }, { status: 403 });
  }

  const redis = getRedisClient();
  let redisStatus = "Missing";
  let redisError: string | null = null;
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
            const chatMeta = {
              id: c.id,
              userEmail: email,
              title: c.title || "Untitled Chat",
              updatedAt: c.updatedAt || 0,
              messageCount: 0,
            };
            recentChats.push(chatMeta);

            // Inspect chat message counts and generated images
            const fullChat = await redis.get<any[]>(`user:${email}:chat:${c.id}`);
            if (Array.isArray(fullChat)) {
              totalMessages += fullChat.length;
              const imgCount = fullChat.filter((m) => !!m.generatedImage).length;
              totalImages += imgCount;
              chatMeta.messageCount = fullChat.length;
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Redis admin stats error:", err);
      redisStatus = "Failing";
      redisError = err.message || "Redis ping / query failed";
    }
  } else {
    redisError = "Redis credentials UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured";
  }

  // Sort recent chats descending by updatedAt
  recentChats.sort((a, b) => b.updatedAt - a.updatedAt);
  recentChats = recentChats.slice(0, 20);

  // Health checks with real server-side ping test
  let groqStatus = "Missing";
  let groqError: string | null = null;
  const groqKey = envKey("GROQ_API_KEY", "GROQ_KEY", "NEXT_PUBLIC_GROQ_API_KEY");
  const groqModel = groqModelChain(process.env.GROQ_MODEL)[0];
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
      groqStatus = "Failing";
      groqError = e.message || "Groq call failed";
    }
  }

  let geminiStatus = "Missing";
  let geminiError: string | null = null;
  const geminiKey = envKey("GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "NEXT_PUBLIC_GEMINI_API_KEY");
  const geminiModels = geminiModelChain(process.env.GEMINI_MODEL);
  const geminiModel = geminiModels[0];
  if (geminiKey) {
    geminiStatus = "Failing";
    for (const m of geminiModels) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent("ping");
        geminiStatus = "OK";
        geminiError = null;
        break;
      } catch (e: any) {
        geminiError = (geminiError ? geminiError + " | " : "") + m + ": " + (e.message || "Gemini call failed");
      }
    }
  }

  const tavilyStatus = envKey("TAVILY_API_KEY", "NEXT_PUBLIC_TAVILY_API_KEY") ? "OK" : "Missing";
  const serperStatus = envKey("SERPER_API_KEY", "SERPER_KEY", "NEXT_PUBLIC_SERPER_API_KEY") ? "OK" : "Missing";
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
      redisError,
      groq: groqStatus,
      groqError,
      groqModel,
      gemini: geminiStatus,
      geminiError,
      geminiModel,
      tavily: tavilyStatus,
      serper: serperStatus,
      nextauthSecret: nextauthSecretStatus,
    },
  });
}
