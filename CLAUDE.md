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
- `lib/plan.ts` — the improvement plan (actions with category, owner, expected impact, steps; AR+EN). `lib/actions.ts` — statuses from the `actions` table and measured before/after impact. `lib/projection.ts` — 12-week forecast.
- Interactive dashboards: `lib/dataset.ts` loads one compact payload (runs, prompts, banks, cited domains, one row per answer); `lib/analytics.ts` holds pure metric functions that run in the browser, so filters and drill-downs need no reload. Client dashboards live in `components/dash/` (Overview, Competitors, Queries, Sources, PlanBoard); shared chart pieces in `components/viz/` (`core.tsx` bars/donut/heatmap/drawer/tooltips/Panel/BankBadge, `TrendLines.tsx`, `BumpChart.tsx` weekly rank race, `filters.tsx` URL-synced filter bar, `Details.tsx` the click-through detail drawer). `/api/answers?ids=` returns answer text for the drawer.
- Interface wording uses digital-marketing terms (brand reach, shortlist rate, top-of-mind, share of voice, AI channels, audiences, owned/earned media). Dashboard text lives in `lib/ui-text.ts` (en + ar); older pages still read `lib/i18n.ts`.
- Pages: `/` overview, `/competitors` (`/compare` redirects), `/queries` (query × channel heatmap; `/prompts` manages the library), `/sources` media mix, `/accuracy` brand accuracy, `/plan` growth plan (impact/effort matrix + action board), `/site`, `/ask` live AI test, `/answers` response feed (accepts `engine`, `lang`, `product`, `persona`, `run`, `prompt`), `/how`, `/settings`.

## Conventions
- Look: "Muscat night & sand" — warm sand background, midnight-blue hero/sidebar with an Omani eight-point-star pattern (`.pattern-star` in `globals.css`), Ahli gold accents. Fonts: Reem Kufi for headings and big numbers (`font-display`), Readex Pro for text; both cover Arabic and English. Palette tokens live in `tailwind.config.ts` (`slate` is remapped to warm greys).
- Every bank has its own colour and short code (`color`, `short` on `BRAND` and `COMPETITORS` in `lib/config.ts`). Ahli Bank is always gold. Show a bank with `BankBadge` / `BankName` (colour disc + code) so it is never identified by colour alone. AI channel colours are set in `lib/config.ts` too; don't reuse them for other meanings.
- Add new UI text to BOTH `en` and `ar` in `lib/i18n.ts`. Use logical Tailwind classes (`ms-`, `pe-`, `start-`) so RTL works.
- Charts are client components in `components/viz/`; plotted SVG/Recharts areas are wrapped in `dir="ltr"`. Every chart element that shows a number should open the detail drawer or carry a tooltip.
- Never send customer data to any engine. Never commit `.env.local` or keys.
- Write actions honour `ADMIN_TOKEN` (header `x-admin-token`) via `lib/auth.ts`.
- Keep Next.js on a patched version: Vercel refuses to deploy versions with known critical CVEs.

## Deployment
Vercel project linked to GitHub `A7hraf/ahli-ai-visibility`; production URL https://ahli-ai-visibility.vercel.app.
For live mode on Vercel a Turso database (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) is required, otherwise each serverless instance has its own `/tmp` database.
