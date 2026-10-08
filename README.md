# Ahli Bank · AI Visibility Monitor

**مرصد ظهور البنك الأهلي في الذكاء الاصطناعي**

When customers ask ChatGPT, Gemini, Claude, Perplexity or DeepSeek *"Which bank should I open an account with in Oman?"*, is Ahli Bank in the answer? Is it near the top? Are the rates and terms it quotes correct?

This system measures that every week, in **Arabic and English**, and shows the Digital Marketing team what to fix. The field is called **Generative Engine Optimisation (GEO)**.

> Prototype built during the Digital Marketing rotation. It uses **public questions only**; no customer data is ever sent anywhere.

---

## What it does

| Page | What you get |
|---|---|
| **Overview** | Visibility score, mention rate, top-3 rate, share of voice, open accuracy alerts, weekly trend, Arabic vs English gap, competitors |
| **Questions** | The library of real customer questions (AR/EN, by product and customer type). Add, pause or delete. Result per engine |
| **Answers** | Read exactly what each engine said, filter by engine, language, named / not named |
| **Sources** | Which websites the engines rely on (comparison sites, news, forums, competitors, look-alike names) and which Ahli pages get cited |
| **Accuracy** | The Bank's approved figures (source of truth). Any AI answer quoting a different rate, amount or term raises an alert |
| **Website readiness** | Audit findings plus a live check of ahlibank.om: AI crawler access (robots.txt), structured data, canonical URLs, Arabic versions, PDF dependence |
| **Settings** | Engine connection status, schedule, privacy notes |

Interface in **Arabic (RTL) and English**, switch with one click. Ahli Bank colours.

## How it works

```
Questions ──► 5 AI engines (web search on, location Oman) ──► answers + cited sources
                                                                     │
                     analyzer (AI model reads each answer) ◄─────────┘
                       │  named? rank? sentiment? competitors? facts stated?
                       ▼
          compare facts with approved figures ──► accuracy alerts
                       ▼
                 database ──► dashboard
```

* **Each question is asked 3 times per engine** (configurable) because AI answers vary between runs; the system reports rates, not one-off results.
* **DeepSeek's API has no web search**, so it measures what the model "remembers" from training. The other four search the web live.
* **Look-alike names** (Ahlibank Qatar, Al Ahli Bank of Kuwait, Saudi National Bank) are not counted as Ahli Bank Oman.

---

## Run it on your computer

Requirements: [Node.js 20+](https://nodejs.org)

```bash
git clone https://github.com/A7hraf/ahli-ai-visibility.git
cd ahli-ai-visibility
npm install
npm run dev
```

Open http://localhost:3000. With no API keys it starts in **demo mode** with simulated data (clearly labelled), so you can explore every screen.

### Connect the real AI engines

```bash
cp .env.example .env.local
```

Open `.env.local` and paste the keys you have (any subset works):

| Engine | Variable | Get a key |
|---|---|---|
| ChatGPT | `OPENAI_API_KEY` | platform.openai.com |
| Gemini | `GEMINI_API_KEY` | aistudio.google.com |
| Claude | `ANTHROPIC_API_KEY` | console.anthropic.com |
| Perplexity | `PERPLEXITY_API_KEY` | perplexity.ai/settings/api |
| DeepSeek | `DEEPSEEK_API_KEY` | platform.deepseek.com |

Restart, then press **Run now** (or run `npm run run:collect` in the terminal). Delete the demo database first so live results start clean: `npm run db:reset`.

> **Never commit `.env.local`** — it is already in `.gitignore`.

Then on the **Accuracy** page, replace the sample figures with the values approved by the Product and Compliance teams.

---

## Put it online (Vercel, free tier)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New → Project**, pick this repository, **Deploy**.
2. For data that persists, create a free [Turso](https://turso.tech) database and add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in **Project → Settings → Environment Variables**. (Without it the online demo still works, but edits reset.)
3. Add the engine keys there too, plus `CRON_SECRET` (any long random text) and optionally `ADMIN_TOKEN` to protect editing.
4. Redeploy. The weekly run happens automatically every Monday 06:00 Muscat time (`vercel.json`).

For production at the Bank, hosting should be agreed with IT (on-premise or approved cloud) to meet Central Bank of Oman outsourcing and cloud requirements.

---

## Project structure

```
app/                 pages (Next.js App Router) and API routes
  api/run            "Run now"
  api/cron           weekly scheduled run
components/          UI: sidebar, charts, forms
lib/
  engines/           connectors for the 5 AI engines
  analyze.ts         reads each answer (AI + rule-based fallback)
  accuracy.ts        compares stated facts with approved figures
  collector.ts       runs a full measurement
  metrics.ts         scores, trends, share of voice, sources
  sitecheck.ts       website readiness checks
  seed.ts            starter questions and sample facts
  demo.ts            simulated demo history
  i18n.ts            Arabic and English text
  config.ts          competitors, brand names, engines
```

Tech: Next.js 15, TypeScript, Tailwind CSS, Recharts, libSQL (SQLite / Turso).

## Customise

* **Competitors and brand spellings:** `lib/config.ts`
* **Starter questions:** `lib/seed.ts` or the Questions page
* **Models used:** `OPENAI_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`, `PERPLEXITY_MODEL`, `DEEPSEEK_MODEL` in `.env.local`

## Security and privacy

* Only public, generic questions are sent to AI engines. No customer or account data.
* API keys live in environment variables or a key vault, never in code.
* Write actions can be protected with `ADMIN_TOKEN`.
* Answers from the API can differ slightly from what customers see in the consumer apps; spot-check by hand periodically.
