import { getRedisClient } from "@/lib/redis";

// Per-user controls the admin can manage from the dashboard.
// Stored on the user record at user-account:<email>.
export type FeatureKey = "chat" | "image" | "analyze" | "photo";

export interface UserControls {
  blockedFeatures: FeatureKey[];
  imageDailyLimit: number; // 0 = unlimited
}

export const DEFAULT_CONTROLS: UserControls = {
  blockedFeatures: [],
  imageDailyLimit: 20, // sensible free default per day
};

export function normalizeControls(raw: any): UserControls {
  const blocked = Array.isArray(raw?.blockedFeatures)
    ? raw.blockedFeatures.filter((f: any) =>
        ["chat", "image", "analyze", "photo"].includes(f)
      )
    : [];
  const limit =
    typeof raw?.imageDailyLimit === "number" && raw.imageDailyLimit >= 0
      ? Math.floor(raw.imageDailyLimit)
      : DEFAULT_CONTROLS.imageDailyLimit;
  return { blockedFeatures: blocked as FeatureKey[], imageDailyLimit: limit };
}

export async function getUserControls(email: string): Promise<UserControls> {
  try {
    const redis = getRedisClient();
    if (!redis || !email) return DEFAULT_CONTROLS;
    const u: any = await redis.get(`user-account:${email.toLowerCase()}`);
    return normalizeControls(u);
  } catch {
    return DEFAULT_CONTROLS;
  }
}

function istDateStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// Returns true when the image generation is allowed; increments today's count.
export async function consumeImageQuota(
  email: string,
  limit: number
): Promise<{ allowed: boolean; used: number }> {
  if (!email || limit <= 0) return { allowed: true, used: 0 };
  try {
    const redis = getRedisClient();
    if (!redis) return { allowed: true, used: 0 };
    const key = `usage:${email.toLowerCase()}:images:${istDateStr()}`;
    const used = ((await redis.get<number>(key)) || 0) + 1;
    await redis.set(key, used, { ex: 60 * 60 * 26 });
    return { allowed: used <= limit, used };
  } catch {
    return { allowed: true, used: 0 };
  }
}

// Reply language for this specific user, from THIS message (+ recent history).
// Default is English. Returns { lang, instruction } for the system prompt and
// a Hinglish line for hard-coded feature messages (used only for non-English).
export function detectLanguage(
  message: string,
  history: any[] = []
): { lang: string; instruction: string; local: boolean } {
  const samples: string[] = [message || ""];
  if (Array.isArray(history)) {
    for (const h of history.slice(-4)) {
      if (h?.role === "user" && typeof h?.content === "string") samples.push(h.content);
    }
  }
  const text = samples.join(" \n ");
  const devanagari = (text.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;

  // Clear Hindi (Devanagari script)
  if (devanagari >= 4 && devanagari >= latin / 3) {
    return {
      lang: "hindi",
      instruction:
        "The user is writing in Hindi (Devanagari). Reply in Hindi (Devanagari script) in a natural, friendly tone.",
      local: true,
    };
  }

  // Hinglish: roman script with common Hindi words
  const hinglishWords = [
    "kya", "hai", "hain", "ka", "ki", "ke", "ko", "me", "mein", "mera", "meri",
    "batao", "bata", "karo", "kar", "chahiye", "kaise", "kyun", "kyu", "aaj",
    "kal", "aur", "bhi", "nahi", "nhi", "acha", "accha", "theek", "thik", "bhai",
    "yaar", "matlab", "samjhao", "samjha", "bolo", "likho", "dikhao", "dekho",
    "wala", "wali", "mera", "tum", "aap", "hum", "kab", "kidhar", "udhar",
    "idhar", "bahut", "bohot", "thoda", "zyada", "abhi", "phir", "lekin",
    "kyunki", "shayad", "bilkul", "arre", "arey",
  ];
  const words = (message || "").toLowerCase().match(/[a-z]+/g) || [];
  const hits = words.filter((w) => hinglishWords.includes(w)).length;
  if (words.length >= 2 && hits >= 2 && hits / words.length >= 0.3) {
    return {
      lang: "hinglish",
      instruction:
        "The user is writing in Hinglish (Hindi in Roman script). Reply in the same natural Hinglish (Roman script).",
      local: true,
    };
  }

  // Another clear language signal in roman script (Spanish etc.) — let the model mirror it
  const spanish = ["hola", "gracias", "que", "como", "estas", "buenos"];
  if (words.some((w) => spanish.includes(w))) {
    return {
      lang: "spanish",
      instruction: "The user is writing in Spanish. Reply in Spanish.",
      local: true,
    };
  }

  return {
    lang: "english",
    instruction:
      "Reply in clear, natural English. (If the user clearly switches language mid-conversation, follow their latest language.)",
    local: false,
  };
}
