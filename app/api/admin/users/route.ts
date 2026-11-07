import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import { getRedisClient, isUserAdmin } from "@/lib/redis";
import { normalizeControls } from "@/lib/permissions";
import { UserAccount } from "@/app/api/auth/options";

// GET /api/admin/users
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: "Redis connection not configured" }, { status: 500 });
  }

  try {
    const emailMembers = await redis.smembers("admin:all-user-emails");
    const userEmails = Array.isArray(emailMembers) ? emailMembers : [];

    const users: any[] = [];

    for (const email of userEmails) {
      const u = await redis.get<UserAccount>(`user-account:${email}`);
      const chats = await redis.get<any[]>(`user:${email}:chats`);

      users.push({
        name: u?.name || email.split("@")[0],
        email: email,
        role: isUserAdmin(email) ? "admin" : (u?.role || "user"),
        providers: u?.providers || ["credentials"],
        createdAt: u?.createdAt || null,
        lastLoginAt: u?.lastLoginAt || null,
        consent: u?.consent || null,
        marketingOptIn: !!u?.marketingOptIn,
        chatCount: Array.isArray(chats) ? chats.length : 0,
        blockedFeatures: normalizeControls(u).blockedFeatures,
        imageDailyLimit: normalizeControls(u).imageDailyLimit,
      });
    }

    users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/users — manage roles or delete user
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const currentAdminEmail = session.user.email?.toLowerCase();
  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: "Redis unavailable" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, targetEmail, newRole, blockedFeatures, imageDailyLimit } = body;

    if (!targetEmail || typeof targetEmail !== "string") {
      return NextResponse.json({ error: "targetEmail zaroori hai" }, { status: 400 });
    }

    const email = targetEmail.trim().toLowerCase();

    // Check count of remaining admins
    const emailMembers = await redis.smembers("admin:all-user-emails");
    const allEmails = Array.isArray(emailMembers) ? emailMembers : [];
    let adminCount = 0;
    for (const em of allEmails) {
      if (isUserAdmin(em)) {
        adminCount++;
      } else {
        const u = await redis.get<UserAccount>(`user-account:${em}`);
        if (u?.role === "admin") adminCount++;
      }
    }

    if (action === "set-controls") {
      const userKey = `user-account:${email}`;
      const existing = await redis.get<UserAccount>(userKey);
      if (!existing) {
        return NextResponse.json({ error: "User nahi mila" }, { status: 404 });
      }
      const controls = normalizeControls({ blockedFeatures, imageDailyLimit });
      await redis.set(userKey, {
        ...existing,
        blockedFeatures: controls.blockedFeatures,
        imageDailyLimit: controls.imageDailyLimit,
      });
      return NextResponse.json({ success: true, controls });
    } else     if (action === "update-role") {
      if (newRole !== "user" && newRole !== "admin") {
        return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
      }

      // Safeguard 1: Cannot demote yourself
      if (email === currentAdminEmail && newRole === "user") {
        return NextResponse.json(
          { error: "Aap khud ko demote nahi kar sakte." },
          { status: 400 }
        );
      }

      // Safeguard 2: Cannot demote if email is in ADMIN_EMAILS
      if (isUserAdmin(email) && newRole === "user") {
        return NextResponse.json(
          { error: "Ye user ADMIN_EMAILS env variable me listed hai, ise demote nahi kiya ja sakta." },
          { status: 400 }
        );
      }

      // Safeguard 3: Cannot demote the last remaining admin
      if (adminCount <= 1 && newRole === "user") {
        return NextResponse.json(
          { error: "Aap aakhri remaining admin ko demote nahi kar sakte." },
          { status: 400 }
        );
      }

      const userKey = `user-account:${email}`;
      const existing = await redis.get<UserAccount>(userKey);
      if (!existing) {
        return NextResponse.json({ error: "User nahi mila" }, { status: 404 });
      }

      await redis.set(userKey, {
        ...existing,
        role: newRole,
      });

      return NextResponse.json({ success: true, message: `Role updated to ${newRole}` });
    } else if (action === "delete-user") {
      // Safeguard 1: Cannot delete yourself
      if (email === currentAdminEmail) {
        return NextResponse.json(
          { error: "Aap apna khud ka account delete nahi kar sakte." },
          { status: 400 }
        );
      }

      // Safeguard 2: Cannot delete primary admin from env
      if (isUserAdmin(email)) {
        return NextResponse.json(
          { error: "Environment variable me set admin ko delete nahi kiya ja sakta." },
          { status: 400 }
        );
      }

      // Safeguard 3: Cannot delete the last remaining admin
      const targetUser = await redis.get<UserAccount>(`user-account:${email}`);
      if (targetUser?.role === "admin" && adminCount <= 1) {
        return NextResponse.json(
          { error: "Aap aakhri remaining admin ko delete nahi kar sakte." },
          { status: 400 }
        );
      }

      // Remove account and indexes
      await redis.del(`user-account:${email}`);
      await redis.srem("admin:all-user-emails", email);

      // Clean up user chat index and individual chats
      const chats = await redis.get<any[]>(`user:${email}:chats`);
      if (Array.isArray(chats)) {
        for (const c of chats) {
          if (c.id) {
            await redis.del(`user:${email}:chat:${c.id}`);
          }
        }
      }
      await redis.del(`user:${email}:chats`);

      return NextResponse.json({ success: true, message: "User deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
