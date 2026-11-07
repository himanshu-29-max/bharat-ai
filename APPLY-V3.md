# Bharat AI — Fix v3 (by Myraa, build-verified)

4 files:
- app/api/chat-title/route.ts  (NAYI file — smart chat titles)
- app/chat/page.tsx            (title flow + extra photos render)
- app/api/chat/route.ts        (image prompt enhancement + asli photo search)
- app/api/history/route.ts     (admin index ensure + extra photos save)

Kya-kya theek hua:
1. CHAT TITLES: ab pehli baat-cheet ke baad AI khud chhota sa proper title
   banayega (ChatGPT style, 3-6 shabd, usi language me). Purani chats ke
   title nahi badlenge; nayi chats par lagega.
2. IMAGE BANADO: tumhara chhota prompt pehle Groq se detailed English prompt
   me badlega, phir image banegi — quality behtar. Naam-only input par note
   bhi ayega ki asli photo ke liye Real Photo mode hai.
3. ASLI PHOTO (Google search): 'Real Photo Dhundo' ab Serper Google Images
   se top 3 asli photos layega (pehle 1 aati thi), Serper na mile to Tavily
   backup. Kisi bhi vyakti/cheez ki asli photo is mode se milegi.
4. ADMIN USERS 0 WALA BUG: ab koi bhi user jab chat save karega to uska naam
   admin index me apne aap jud jayega — dashboard me users aur activity
   dikhne lagegi. (Ek baar Logout -> Login kar lena to tumhara record turant
   ban jayega.)

Extract: ZIP ko F:\bharat-ai par Extract (Overwrite without prompt),
phir git add -A / commit / push. Vercel khud deploy karega.
