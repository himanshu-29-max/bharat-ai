import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;
let redisConfigError: string | null = null;

function cleanEnvValue(v?: string): string | undefined {
  if (!v) return undefined;
  let s = v.trim();
  // Strip accidental surrounding quotes copied from dashboards
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

export function getRedisConfigError(): string | null {
  return redisConfigError;
}

export function getRedisClient(): Redis | null {
  // Support both the classic Upstash variable names and the names the
  // Vercel/Upstash integration injects automatically (KV_REST_API_*).
  const url =
    cleanEnvValue(process.env.UPSTASH_REDIS_REST_URL) ||
    cleanEnvValue(process.env.KV_REST_API_URL);
  const token =
    cleanEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN) ||
    cleanEnvValue(process.env.KV_REST_API_TOKEN);

  if (!url || !token) {
    redisConfigError =
      "Redis env missing: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN Vercel me set nahi hain.";
    return null;
  }

  if (!url.startsWith("https://")) {
    // The most common misconfiguration: the redis:// connection string from the
    // Upstash console was pasted instead of the REST (https://) URL + token.
    redisConfigError =
      "Redis URL galat format me hai: REST URL (https:// se shuru hone wala) chahiye, redis:// wali connection string nahi chalegi. Upstash Console -> REST API section se URL aur token dobara copy karo.";
    console.error("[redis] " + redisConfigError);
    return null;
  }

  redisConfigError = null;

  if (!redisInstance) {
    redisInstance = new Redis({ url, token });
  }

  return redisInstance;
}

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
