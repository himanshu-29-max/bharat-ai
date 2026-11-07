# Bharat AI — Fix v5: image prompt enhancement asal me chalana (by Myraa)

Sirf 2 files:
- app/api/chat/route.ts        (enhancer dobara likha)
- app/api/chat-title/route.ts  (title ke liye bada token budget)

Asli wajah jo mili: Groq ke naye models (gpt-oss) "reasoning" models hain.
Chhota max_tokens (140) rakhne par woh saare tokens sochne me kha khate the
aur asal jawab khaali aata tha — isliye enhancement chup-chaap fail hokar
raw prompt hi dikhta raha (12:57, 13:14, 13:19 — teeno baar).

Fix:
- Pehle OpenRouter ka seedha (non-reasoning) model prompt badhayega —
  tumhare project me OPENROUTER_API_KEY pehle se hai.
- Uske baad Groq, ab max_tokens 700 + reasoning_effort "low" ke saath.
- Enhancement tabhi mana jayega jab jawab 25 aksharon se bada ho.
- Errors ab server log me dikhenge (pehle chup-chaap dab jate the).
- Chat titles ke liye bhi wahi token-budget fix.

Extract F:\bharat-ai par (Overwrite without prompt) -> git add/commit/push.
npm install ki zaroorat NAHI hai is baar (koi naya package nahi).
