# Bharat AI — Fix v6: English default, har user ki apni bhasha,
# admin ke paas poora control, + button par file-type menu
# (by Myraa, build-verified)

Badli hui files (6):
- lib/permissions.ts            (NAYI — language pehchan + user controls)
- app/api/chat/route.ts         (saare guards + English default)
- app/api/auth/options.ts       (user record me controls fields)
- app/api/admin/users/route.ts  (controls padhna/likhna)
- app/admin/AdminClient.tsx     (har user par "Controls" button)
- app/chat/page.tsx             (+ button ka type menu)

Kya-kya aaya:
1. DEFAULT LANGUAGE = ENGLISH.
   AI ab default roop se saaf English me jawab dega. Lekin har user ke
   liye uski apni bhasha pehchani jayegi — koi Hindi me likhe to Hindi me,
   Hinglish likhe to Hinglish me jawab. Bhasha har message se pehchani
   jati hai (user ke data = uski apni likhai), koi setting nahi chahiye.
2. ADMIN CONTROLS (Admin Panel > Users > kisi user par "Controls"):
   - Chat band karo (per user)
   - Image generation band karo (per user)
   - File Analyze (image/PDF) band karo (per user)
   - Real Photo search band karo (per user)
   - Roz ki IMAGE LIMIT set karo (default 20/day, 0 = unlimited)
   Blocked user ko uski bhasha me saaf message milega. Khud ko (admin ko)
   ye controls nahi rok sakte.
3. + BUTTON AB TYPE PUCHEGA:
   + dabane par chhota menu: "Image (Photo)" / "PDF Document" /
   "Text File" — jo type chunoge, file picker sirf wahi dikhayega.
4. ANALYZE MAZBOOT: Gemini band/fail ho to TEXT wali files ka jawab ab
   Groq/OpenRouter se bhi aa jayega (pehle Gemini hi ekmatra raasta tha;
   Gemini abhi bhi nayi API key maang raha hai).

STEPS: ZIP ko F:\bharat-ai par Extract (Overwrite without prompt) ->
git add -A / commit / push. npm install ki zaroorat NAHI hai.
NOTE: v5 wala fix (prompt enhancement) is ZIP me shaamil hai — kyunki
ye files uske upar bani hain. Agar v5 pehle push nahi kiya tha to
fikr nahi, ek saath chala jayega.
