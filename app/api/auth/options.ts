import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import AzureADProvider from "next-auth/providers/azure-ad";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getRedisClient, isUserAdmin } from "@/lib/redis";

export interface UserAccount {
  name: string;
  email: string;
  passwordHash?: string;
  role: "user" | "admin";
  providers?: string[];
  createdAt: number;
  lastLoginAt: number;
  consent?: {
    acceptedTerms: boolean;
    termsVersion: string;
    acceptedAt: string;
  };
  marketingOptIn?: boolean;
  blockedFeatures?: string[];
  imageDailyLimit?: number;
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
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID || "common",
          }),
        ]
      : []),
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
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
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials" && user.email) {
        const email = user.email.toLowerCase();
        const providerName = account.provider;
        const redis = getRedisClient();
        if (redis) {
          try {
            const userKey = `user-account:${email}`;
            const existing = await redis.get<UserAccount>(userKey);
            const isAdmin = existing?.role === "admin" || isUserAdmin(email);
            const resolvedRole = isAdmin ? "admin" : "user";

            const existingProviders = Array.isArray(existing?.providers) ? existing!.providers : [];
            const providers = Array.from(new Set([...existingProviders, providerName]));

            const updatedUser: UserAccount = {
              name: user.name || existing?.name || email.split("@")[0],
              email,
              passwordHash: existing?.passwordHash, // NEVER overwrite existing passwordHash
              role: resolvedRole,
              providers,
              createdAt: existing?.createdAt || Date.now(),
              lastLoginAt: Date.now(),
              consent: existing?.consent || {
                acceptedTerms: true,
                termsVersion: "v1-oauth",
                acceptedAt: new Date().toISOString(),
              },
              marketingOptIn: existing?.marketingOptIn ?? false,
            };

            await redis.set(userKey, updatedUser);
            await redis.sadd("admin:all-user-emails", email);
          } catch (err) {
            console.error(`Failed to upsert ${providerName} user to Redis:`, err);
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // Recompute role on EVERY token load from ADMIN_EMAILS and Redis
      if (token.email) {
        const cleanEmail = token.email.toLowerCase();
        if (isUserAdmin(cleanEmail)) {
          token.role = "admin";
        } else {
          const redis = getRedisClient();
          let storedRole = "user";
          if (redis) {
            try {
              const u = await redis.get<UserAccount>(`user-account:${cleanEmail}`);
              if (u?.role) storedRole = u.role;
            } catch (e) {
              // fallback
            }
          }
          token.role = storedRole === "admin" ? "admin" : "user";
        }
      } else {
        token.role = "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        const email = session.user.email?.toLowerCase();
        // Dynamically reflect current admin state on session
        (session.user as any).role = isUserAdmin(email) || token.role === "admin" ? "admin" : "user";
      }
      return session;
    },
  },
};
