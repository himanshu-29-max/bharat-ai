# Bharat AI — Keys Fix v2 (by Myraa, build-verified)

Sirf 2 files badli hain:
- app/api/chat/route.ts
- app/api/admin/stats/route.ts

Kya fix hua:
- Code ab keys ke PURANE Vercel naam bhi padh lega: NEXT_PUBLIC_TAVILY_API_KEY,
  NEXT_PUBLIC_SERPER_API_KEY, GOOGLE_GEMINI_API_KEY, NEXT_PUBLIC_GROQ_API_KEY.
  Isliye Tavily/Serper "MISSING" apne aap "OK" ho jayenge — unke purane
  variables project me pehle se maujood hain.
- Admin health ab Gemini ke saare fallback models try karke report karega.

Extract: is ZIP ko F:\bharat-ai par Extract karo (Overwrite without prompt),
phir git add -A / commit / push. Vercel khud deploy kar dega.

NOTE: Gemini agar phir bhi FAILING aaye to wajah code nahi, KEY hai —
purani key (GOOGLE_GEMINI_API_KEY) purani/revoke ho chuki lagti hai.
aistudio.google.com se nayi free key banao aur Vercel me GEMINI_API_KEY
ki value usi se badal do, phir Redeploy.
