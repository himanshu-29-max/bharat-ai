import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getRedisClient, isUserAdmin } from "@/lib/redis";

export interface UserAccount {
  name: string;
  email: string;
  passwordHash?: string;
  role: "user" | "admin";
  createdAt: number;
  lastLoginAt: number;
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email aur password dono zaroori hain.");
        }

        const email = credentials.email.trim().toLowerCase();
        const redis = getRedisClient();
        if (!redis) {
          throw new Error("Database connection available nahi hai.");
        }

        const userKey = `user-account:${email}`;
        const user = await redis.get<UserAccount>(userKey);

        if (!user || !user.passwordHash) {
          throw new Error("Ye email registered nahi hai ya password set nahi hai.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Galat password dala hai aapne.");
        }

        // Determine if user is admin
        const isAdmin = user.role === "admin" || isUserAdmin(email);
        const resolvedRole = isAdmin ? "admin" : "user";

        // Update lastLoginAt and sync role
        await redis.set(userKey, {
          ...user,
          role: resolvedRole,
          lastLoginAt: Date.now(),
        });

        // Ensure in admin:all-user-emails set
        await redis.sadd("admin:all-user-emails", email);

        return {
          id: email,
          name: user.name || email.split("@")[0],
          email: user.email,
          role: resolvedRole,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        const redis = getRedisClient();
        if (redis) {
          try {
            const userKey = `user-account:${email}`;
            const existing = await redis.get<UserAccount>(userKey);
            const isAdmin = existing?.role === "admin" || isUserAdmin(email);
            const resolvedRole = isAdmin ? "admin" : "user";

            const updatedUser: UserAccount = {
              name: user.name || existing?.name || email.split("@")[0],
              email,
              role: resolvedRole,
              createdAt: existing?.createdAt || Date.now(),
              lastLoginAt: Date.now(),
            };

            await redis.set(userKey, updatedUser);
            await redis.sadd("admin:all-user-emails", email);
          } catch (err) {
            console.error("Failed to sync Google user to Redis:", err);
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || (isUserAdmin(user.email) ? "admin" : "user");
      } else if (token.email) {
        // Refresh role on token verify
        const redis = getRedisClient();
        let storedRole = token.role;
        if (redis && token.email) {
          try {
            const u = await redis.get<UserAccount>(`user-account:${token.email.toLowerCase()}`);
            if (u?.role) storedRole = u.role;
          } catch (e) {
            // fallback
          }
        }
        token.role = isUserAdmin(token.email) || storedRole === "admin" ? "admin" : "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role || (isUserAdmin(session.user.email) ? "admin" : "user");
      }
      return session;
    },
  },
};
