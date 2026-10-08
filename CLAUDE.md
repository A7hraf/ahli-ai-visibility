# Ahli Bank AI Visibility Monitor — guide for Claude Code

Internal tool for Ahli Bank Oman's Digital Marketing team. It measures how AI assistants (ChatGPT, Gemini, Claude, Perplexity, DeepSeek) mention the Bank when customers ask banking questions in Arabic and English, compares it with other Omani banks, and checks quoted facts against approved figures. The field is Generative Engine Optimisation (GEO).

## Commands
- `npm run dev` — local dev server on :3000
- `npm run build` — production build (run before every push; Vercel deploys `main` automatically)
- `npx tsc --noEmit` — type-check
- `npm run db:reset` — delete local SQLite DB (rebuilt on next start; demo data is re-seeded in demo mode)
- `npm run run:collect` — one live measurement from the CLI (needs keys in `.env.local`)

## Architecture
- Next.js 15 App Router, TypeScript, Tailwind 3, Recharts 2, libSQL (`@libsql/client`; local file or Turso).
- `lib/config.ts` — brand aliases, look-alike names, competitors, engines, demo-mode switch.
- `lib/engines/index.ts` — one connector per engine (web search on, location Oman) + `completeJSON` for the analyzer.
- `lib/analyze.ts` — LLM extraction (named? rank, sentiment, competitors, facts) with a rule-based fallback.
- `lib/collector.ts` — full run: active prompts × configured engines × REPEATS; writes answers + alerts; generates AI insights.
- `lib/metrics.ts`, `lib/compare.ts`, `lib/insights.ts` — aggregations for the pages.
- `lib/i18n.ts` — every UI string in `en` and `ar` (same keys). Language comes from the `lang` cookie; default Arabic (RTL).
- `lib/demo.ts` — deterministic simulated history used when no engine keys are set.
- Pages: `/` overview, `/compare`, `/ask` (live question to the engines, rate-limited), `/prompts`, `/answers`, `/sources`, `/accuracy`, `/site`, `/settings`.

## Conventions
- Brand palette lives in `tailwind.config.ts` (navy `#0B3A5B`, blue `#0B6298`, gold `#ADA042`). Ahli Bank is always gold in charts; competitors are blue/grey.
- Add new UI text to BOTH `en` and `ar` in `lib/i18n.ts`. Use logical Tailwind classes (`ms-`, `pe-`, `start-`) so RTL works.
- Charts are client components in `components/Charts.tsx`; wrap them in `dir="ltr"`.
- Never send customer data to any engine. Never commit `.env.local` or keys.
- Write actions honour `ADMIN_TOKEN` (header `x-admin-token`) via `lib/auth.ts`.
- Keep Next.js on a patched version: Vercel refuses to deploy versions with known critical CVEs.

## Deployment
Vercel project linked to GitHub `A7hraf/ahli-ai-visibility`; production URL https://ahli-ai-visibility.vercel.app.
For live mode on Vercel a Turso database (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) is required, otherwise each serverless instance has its own `/tmp` database.
