import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getRedisClient, isUserAdmin } from "@/lib/redis";
import { UserAccount } from "@/app/api/auth/options";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Naam likhna zaroori hai." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Sahi email address likhein." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password kam se kam 8 characters ka hona chahiye." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const redis = getRedisClient();

    if (!redis) {
      return NextResponse.json(
        { error: "Database setup adhoora hai. Kripya environment check karein." },
        { status: 500 }
      );
    }

    const userKey = `user-account:${cleanEmail}`;
    const existing = await redis.get<UserAccount>(userKey);

    if (existing && existing.passwordHash) {
      return NextResponse.json(
        { error: "This email is already registered, please login" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = isUserAdmin(cleanEmail);

    const newUser: UserAccount = {
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: isAdmin ? "admin" : "user",
      createdAt: existing?.createdAt || Date.now(),
      lastLoginAt: Date.now(),
    };

    await redis.set(userKey, newUser);
    await redis.sadd("admin:all-user-emails", cleanEmail);

    return NextResponse.json(
      {
        success: true,
        message: "Account safaltapoorvak ban gaya!",
        user: { name: newUser.name, email: newUser.email, role: newUser.role },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Account banane mein samasya aayi. Dobara koshish karein." },
      { status: 500 }
    );
  }
}

