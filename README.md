# Bharat AI (भारत AI) 🇮🇳

India ka apna All-in-One AI assistant — built by **Himanshu Ranjan**, a B.Tech Computer Science student and developer from India.

Bharat AI combines multiple frontier AI models, live web knowledge search, document/image analysis, high-speed image generation, and cloud-synced conversation history behind a modern Indian Tricolour-inspired Liquid Glass user interface.

Live Deployment: [https://bharat-ai-zeta.vercel.app/](https://bharat-ai-zeta.vercel.app/)

---

## ✨ Features

- **Multi-Model Intelligence**: Intelligent provider fallback chain with Groq (ultra-fast inference) and Google Gemini.
- **Hinglish & Multilingual Ready**: Converses naturally in Hindi, English, and Hinglish.
- **Real-Time Web Knowledge**: Smart contextual web searching via Tavily when current information (news, live scores, current dates) is needed.
- **Image / Document Analysis**: Vision and PDF analysis using Google Gemini with direct multimodal comprehension.
- **AI Image Generation**: Instant high-resolution image creation powered by Pollinations (Flux model) with direct in-browser download.
- **Real Photo Search**: Dedicated option for authentic verified images from the web (Wikipedia / Serper).
- **Persistent Cloud History**: Encrypted chat history stored on Upstash Redis with intuitive timeline grouping (*Aaj*, *Is Hafte*, *Is Mahine*, *Purane*).
- **Multi-Provider Authentication**: Google OAuth, GitHub, Microsoft Azure AD, Apple ID, and secure Email + Password registration with salted bcrypt hashing and mandatory consent verification.
- **Admin Dashboard**: System health diagnostics (Groq, Gemini, Redis, Search), aggregated metrics, and user management.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, React Markdown
- **Auth**: NextAuth v4 (Google OAuth, GitHub, Azure AD, Apple, Credentials with bcryptjs)
- **Database / Cache**: Upstash Redis (REST SDK)
- **AI & Vision**: Groq SDK, `@google/generative-ai` (Gemini), Pollinations AI
- **Search**: Tavily Search API, Serper Google Search API
- **Deployment**: Vercel

---

## 🚦 Routes

- `/` — Public Landing page (Hero, About, Features, Architecture, FAQ)
- `/chat` — Main AI chat interface (Requires authentication)
- `/login` — Secure Login (Google, Microsoft, Apple, GitHub OAuth + Email/Password)
- `/signup` — New User Registration with Terms & Privacy consent gate
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/admin` — Admin Dashboard & System Health (Guarded: Admin role only)

---

## ⚙️ Environment Variables Setup

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Configure the following variable names:

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API Key (Server-only) |
| `GROQ_MODEL` | Primary Groq model ID (e.g. `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`) |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `GEMINI_MODEL` | Gemini model ID (e.g. `gemini-1.5-flash` or `gemini-2.5-flash`) |
| `TAVILY_API_KEY` | Tavily Web Search API Key |
| `SERPER_API_KEY` | Serper Google Search API Key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GITHUB_ID` | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `AZURE_AD_CLIENT_ID` | Microsoft Azure AD App Client ID |
| `AZURE_AD_CLIENT_SECRET` | Microsoft Azure AD Client Secret |
| `AZURE_AD_TENANT_ID` | Microsoft Azure Tenant ID (`common` for multi-tenant + personal) |
| `APPLE_ID` | Apple Services ID |
| `APPLE_SECRET` | Apple generated JWT Client Secret |
| `NEXTAUTH_URL` | Application root URL (`http://localhost:3000` or production URL) |
| `NEXTAUTH_SECRET` | 32+ character random string for JWT encryption |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST bearer token |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional public contact email for Terms/Privacy inquiries |

---

## 🔗 OAuth Callback URLs for Vercel Deployment

Configure these exact Redirect / Callback URLs in your provider developer consoles:

- **Google OAuth**: `https://bharat-ai-zeta.vercel.app/api/auth/callback/google`
- **GitHub OAuth App**: `https://bharat-ai-zeta.vercel.app/api/auth/callback/github`
- **Microsoft Azure AD (Web Redirect URI)**: `https://bharat-ai-zeta.vercel.app/api/auth/callback/azure-ad`
- **Apple Services ID (Return URL)**: `https://bharat-ai-zeta.vercel.app/api/auth/callback/apple`

---

## 🛡️ Admin Setup

To grant admin privileges to an account:
1. Set the `ADMIN_EMAILS` environment variable in `.env.local` or Vercel dashboard:
   ```env
   ADMIN_EMAILS=your-email@example.com
   ```
2. Any user logging in with this email (via Google, GitHub, Microsoft, Apple, or Email/Password) will automatically be assigned the `admin` role and gain access to `/admin` and admin API endpoints.
