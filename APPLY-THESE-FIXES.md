# Bharat AI — Model + History Fix (Myraa ne khud banaya, build PASS verified)
Date: 2026-11-07

## Is ZIP me kya hai (6 files, apne sahi path par)
1. `lib/models.ts` (NAYI file) — Groq/Gemini ke kaam karne wale models ki chain ek hi jagah:
   Groq: openai/gpt-oss-120b -> openai/gpt-oss-20b (llama-3.3-70b-versatile aur llama-3.1-8b-instant
   Groq ke free/developer plans se 16 Aug 2026 ko hat gaye the — isiliye 404 aa raha tha)
   Gemini: gemini-3.8-flash -> gemini-3.6-flash -> gemini-3.5-flash-lite (gemini-1.5-flash band ho chuka hai)
   Vercel me purani dead model value padi bhi ho to code use khud ignore kar dega.
2. `app/api/chat/route.ts` — teeno providers chain me chalte hain (Groq -> Gemini -> OpenRouter agar key ho),
   Analyze bhi Gemini chain se, aur user ko ab raw JSON error nahi dikhega — sirf chhota sa saaf message.
3. `lib/redis.ts` — Redis env ki aam galtiyon ki pehchan: KV_REST_API_* naam bhi chalenge, galat
   redis:// URL dala ho to saaf error milega ki https:// wala REST URL chahiye.
4. `app/api/history/route.ts` — wahi saaf Redis error ab history API me bhi aayega.
5. `app/api/admin/stats/route.ts` — health check bhi naye models ko ping karega.
6. `.env.example` — sahi notes ke saath.

Build: `npm run build` mere paas PASS hai (18 routes, type check OK).

## Lagana kaise hai
Option A (khud): is ZIP ko F:\bharat-ai par extract karke saari files overwrite karo, phir terminal me:
  git add -A
  git commit -m "fix: working model chains + redis hardening (by Myraa)"
  git push
Option B (Antigravity): Antigravity ko bolo — "is ZIP ki files project me overwrite karke, BINA koi
change kiye, build verify karke commit + push kar do."

## Vercel me tumhe ye karna HI padega (ye main tumhare account me nahi kar sakta)
1. Upstash Console (upstash.com) -> apna Redis database kholo -> "REST API" section se
   URL (https:// se shuru) aur token FRESH copy karo. Database "paused/deleted" dikhe to naya bana lo.
2. Vercel -> bharat-ai -> Settings -> Environment Variables me ye values check/replace karo:
   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (upar wale fresh wale)
   GROQ_MODEL aur GEMINI_MODEL ki purani values DELETE kar do (khali rakho — code khud sahi model lega)
   ADMIN_EMAILS = himanshu98015.rk@gmail.com (tumhare login wale email ke saath — tabhi ADMIN badge aayega)
3. Deployments -> Redeploy.
4. Site par Logout -> Login. Phir chat karke refresh karke dekho — banner gayab + history sidebar me honi chahiye.

## Optional: OpenRouter free backup (chat kabhi na ruke)
openrouter.ai par free account -> API key banao -> Vercel me OPENROUTER_API_KEY dal do.
Code ready hai — Groq+Gemini dono fail hon tab bhi ye jawab dega.
