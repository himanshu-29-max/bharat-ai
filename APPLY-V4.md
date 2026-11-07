# Bharat AI — Fix v4: sundar jawab + image loading (by Myraa, build-verified)

Badli hui files:
- app/chat/page.tsx       (markdown tables ON, image loading skeleton + auto-retry, sahi caption)
- app/api/chat/route.ts   (jawab formatting ke niyam system prompt me)
- app/api/history/route.ts
- tailwind.config.js      (typography plugin ON — asli wajah yahi thi)
- package.json / package-lock.json  (remark-gfm joda gaya)

Asli kharaabi kya thi:
1. tailwind.config me plugins khaali tha, isliye heading/list/table ki styling
   (prose) chal hi nahi rahi thi — har jawab ek bada bekaar paragraph banta tha.
2. ReactMarkdown ke saath tables wala plugin (remark-gfm) nahi tha — table ka
   kachra pipes me dikhta tha.
3. System prompt me formatting ka koi niyam nahi tha — model poora
   jeevan-parichay ek saans me likh deta tha. Ab: chhota intro, headings,
   bullets, sirf naam mile to short overview + "aur detail chahiye?" wala sawal.
4. Image card khaali dikhta tha kyunki Pollinations image bante hi turant
   load nahi hoti (15-30 sec lagte hain). Ab "Image ban rahi hai" wala
   intezaar dikhega aur photo apne aap aa jayegi (auto-retry ke saath).
5. Caption ab jhooth nahi bolega: AI image par "AI Generated Image" aur
   asli photo par "Real photo - Google Search" likha ayega.

STEPS (zaroori):
1. ZIP ko F:\bharat-ai par Extract karo (Overwrite without prompt).
2. Terminal me pehle:  npm install   (naya package aaya hai)
3. Phir: git add -A / git commit / git push  (hamesha ki tarah)
Vercel khud deploy kar dega.
