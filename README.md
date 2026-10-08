# Ahli Bank · AI Visibility Monitor

**مرصد ظهور البنك الأهلي في الذكاء الاصطناعي**

When customers ask ChatGPT, Gemini, Claude, Perplexity or DeepSeek *"Which bank should I open an account with in Oman?"*, is Ahli Bank in the answer? Is it near the top? Are the rates and terms it quotes correct?

This system measures that every week, in **Arabic and English**, and shows the Digital Marketing team what to fix. The field is called **Generative Engine Optimisation (GEO)**.

> Prototype built during the Digital Marketing rotation. It uses **public questions only**; no customer data is ever sent anywhere.

---

## What it does

| Page | What you get |
|---|---|
| **Overview** | AI Visibility Index, brand reach, shortlist rate, top-of-mind and share of voice with trends; ranking among Omani banks; performance by AI channel; Arabic vs English audience; product × channel heatmap; brand sentiment; who wins when Ahli is missing; media mix; growth-plan forecast |
| **Competitors** | Positioning map (reach vs top-of-mind), brand reach over time, leaderboard, heatmaps by channel and product |
| **Customer queries** | Every tracked question × AI channel, blind spots, performance by audience segment |
| **Media & sources** | Media mix (owned, comparison, news, forums, competitors, look-alike brands), most-cited websites, owned-media citation rate |
| **Brand accuracy** | Approved figures (source of truth) and misinformation alerts by channel and fact |
| **Growth plan** | Impact vs effort matrix, action board (to do / in progress / done), measured result of each fix, 12-week forecast |
| **Website readiness** | Audit findings plus a live check of ahlibank.om (AI crawler access, structured data, canonical URLs, Arabic versions, PDFs) |
| **Live AI test** | Any employee types a question and sees, side by side, what each AI channel answers right now. Rate-limited |
| **Response feed** | Every answer word for word, with search and filters |

**Everything is interactive:** the filter bar (period, AI channel, audience, product, segment) re-draws every chart, and clicking any bar, cell, bubble or week opens a detail panel with the numbers behind it, the competitors and sources involved, and the actual AI answers.

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

### Free setup (no credit card)

You can run the system live **for free** with a Google Gemini key:

1. Go to https://aistudio.google.com/apikey, sign in with a Google account, **Create API key**.
2. In Vercel → Project → Settings → Environment Variables add:
   * `GEMINI_API_KEY` = your key
   * Nothing else is required: with only a Gemini key the app uses free-tier-friendly defaults (1 repeat, rule-based reading, 2 parallel requests).
3. Create a free database at https://turso.tech and add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` so results are kept.
4. Redeploy.

Limits of the free plan: free keys may not include Google Search grounding, so Gemini answers from its own knowledge (no cited sources); Google may use free-tier prompts to improve its products (fine here, questions are public); per-minute and per-day request limits apply. Enabling billing on the Google project unlocks search grounding, with a monthly free allowance.

> **Never commit `.env.local`** — it is already in `.gitignore`.

Then on the **Accuracy** page, replace the sample figures with the values approved by the Product and Compliance teams.

---

## Put it online (Vercel, free tier)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New → Project**, pick this repository, **Deploy**.
2. For data that persists, create a free [Turso](https://turso.tech) database and add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in **Project → Settings → Environment Variables**. (Without it the online demo still works, but edits reset.)
3. Add the engine keys there too, plus `CRON_SECRET` (any long random text) and optionally `ADMIN_TOKEN` to protect editing.
4. Redeploy. The weekly run happens automatically every Monday 06:00 Muscat time (`vercel.json`).

The **Ask the AI** page is public on the shared link but rate-limited: `ASK_PER_IP_PER_HOUR` (default 10) and `ASK_DAILY_LIMIT` (default 300). Set a spending limit on each AI provider's account as well.

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
