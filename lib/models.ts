// Shared AI model configuration — SINGLE source of truth for model names.
// Verified against provider deprecations on 2026-11-07:
// - Groq removed llama-3.3-70b-versatile and llama-3.1-8b-instant from Free/Developer
//   plans on 2026-08-16. Their official replacements are openai/gpt-oss-120b (for the
//   70B) and openai/gpt-oss-20b (for the 8B).
// - Gemini 1.5 family is shut down; gemini-2.5-flash/pro are deprecated and blocked
//   for new users. The current stable Flash model named in Google's own 404 messages
//   is gemini-3.8-flash, followed by gemini-3.6-flash and gemini-3.5-flash-lite.
// Env values are honoured ONLY if they are not known-dead, so a stale GROQ_MODEL /
// GEMINI_MODEL left in Vercel can no longer break chat on its own.

const DEAD_GROQ_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "llama-3.2-90b-vision-preview",
  "llama-3.2-11b-vision-preview",
]);

const DEAD_GEMINI_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro",
  "gemini-1.5-pro-001",
  "gemini-1.5-pro-002",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
]);

export function groqModelChain(envModel?: string): string[] {
  const chain: string[] = [];
  const env = envModel?.trim();
  if (env && !DEAD_GROQ_MODELS.has(env)) chain.push(env);
  for (const m of ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
    if (!chain.includes(m)) chain.push(m);
  }
  return chain;
}

export function geminiModelChain(envModel?: string): string[] {
  const chain: string[] = [];
  const env = envModel?.trim();
  if (env && !DEAD_GEMINI_MODELS.has(env)) chain.push(env);
  for (const m of ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]) {
    if (!chain.includes(m)) chain.push(m);
  }
  return chain;
}
