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
- Interactive dashboards: `lib/dataset.ts` loads one compact payload (runs, prompts, banks, cited domains, one row per answer); `lib/analytics.ts` holds pure metric functions that run in the browser, so filters and drill-downs need no reload. Client dashboards live in `components/dash/` (Overview, Competitors, Queries, Sources, PlanBoard); shared chart pieces in `components/viz/` (`core.tsx` bars/donut/heatmap/drawer/tooltips/Panel/BankBadge, `TrendLines.tsx`, `BumpChart.tsx` weekly rank race, `filters.tsx` URL-synced filters hook, `Details.tsx` the click-through detail drawer). `/api/answers?ids=` returns answer text for the drawer.
- Sign-in: `middleware.ts` sends everyone without a valid session cookie to `/login` (only `/login`, `/api/auth/login` and `/api/cron` are open). `lib/session.ts` signs the cookie (Web Crypto, edge-safe; key = `SESSION_SECRET`). `lib/users.ts` holds the `users` table helpers (scrypt hashes) and seeds two accounts on first start: system admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, default admin@ahlibank.om) and digital marketing (`MARKETING_EMAIL`/`MARKETING_PASSWORD`, default marketing@ahlibank.om). `lib/auth.ts`: `currentUser()` for pages, `requireAdmin` / `requireMember` for write APIs (the `x-admin-token` header still works for scripts).
- Roles: **admin** = everything (Run now, question library, approved facts, Settings, team accounts at `/api/users`). **marketing** = every dashboard, plan status, mark alerts fixed, site re-check, Try it yourself. Hide admin-only controls for marketing in the UI too.
- Tone: friendly and plain ("How does AI see us?", "We're mentioned in…"); the marketing term sits underneath as a small label (`ui.term`). Dashboard text lives in `lib/ui-text.ts` (en + ar, `{placeholders}` filled with `fill()`); older pages still read `lib/i18n.ts`. Charts open with one takeaway sentence (`Insight`).
- The home page follows the "Sada" design: navy hero (score ring, rank, language gap, wrong-info count), four KPI cards that switch the trend chart, then trend + share of talk, bank race + waffle, assistants / language / sentiment, products × assistants heatmap, `AnswerPreview` chat (`components/viz/story.tsx`) and plan progress.
- Header (`components/TopBar.tsx`): page title, data status, language, Run now (admin), and on dashboard pages the period + assistant filters (plus a "More filters" dropdown for language, product, customer type). Filters live in the URL (`useFilters`). Page headings use `PageHeader` with a gold `kicker` (the marketing term, `ui.kick`) and a data-driven lead sentence.
- Motion: `components/viz/motion.tsx` — `Reveal` fades content in on first scroll into view and tells charts inside (`useShown`) to animate from zero; `CountUp` numbers; `spotlight` + `.spot` pointer glow. `Panel` does all of this already. Keep it subtle and respect reduced motion.
- Pages: `/` overview, `/competitors` (`/compare` redirects), `/queries` (query × channel heatmap; `/prompts` manages the library), `/sources` media mix, `/accuracy` brand accuracy, `/plan` growth plan (impact/effort matrix + action board), `/site`, `/ask` live AI test, `/answers` response feed (accepts `engine`, `lang`, `product`, `persona`, `run`, `prompt`), `/how`, `/settings`.

## Conventions
- Layout: the sidebar is `position: fixed` (never scrolls with the page); `.pattern-star` must not set `position` or it breaks that.
- Look ("Sada", from Claude Design): warm paper page (`canvas` #F7F6F2), white cards with a 1px border and square 4px corners (`Panel` / `Card`), serif headings and headline numbers (`font-display` = Source Serif 4 + Noto Naskh Arabic) over IBM Plex Sans Arabic body text. Card title = serif, with the marketing term underneath in small grey (`Panel term=`), then one takeaway sentence (`Insight`, plain text). Navy for primary actions and hero blocks, gold for Ahli, magenta (`bad`) for problems. Clickable cards use `.lift`. Palette tokens live in `tailwind.config.ts` (Tailwind `rounded-lg/xl/2xl` are remapped to 4px).
- Every bank has its own colour and short code (`color`, `short` on `BRAND` and `COMPETITORS` in `lib/config.ts`). Ahli Bank is always gold. Show a bank with `BankBadge` / `BankName` (colour tag + code) so it is never identified by colour alone. AI channel colours are set in `lib/config.ts` too; don't reuse them for other meanings.
- Add new UI text to BOTH `en` and `ar` in `lib/i18n.ts`. Use logical Tailwind classes (`ms-`, `pe-`, `start-`) so RTL works.
- Charts are client components in `components/viz/`; plotted SVG/Recharts areas are wrapped in `dir="ltr"`. Every chart element that shows a number should open the detail drawer or carry a tooltip.
- Never send customer data to any engine. Never commit `.env.local` or keys.
- Write actions check the signed-in role via `requireAdmin` / `requireMember` in `lib/auth.ts` (`ADMIN_TOKEN` header still accepted for scripts).
- Keep Next.js on a patched version: Vercel refuses to deploy versions with known critical CVEs.

## Deployment
Vercel project linked to GitHub `A7hraf/ahli-ai-visibility`; production URL https://ahli-ai-visibility.vercel.app.
Set `ADMIN_PASSWORD`, `MARKETING_PASSWORD` and `SESSION_SECRET` in Vercel before sharing the link. For live mode on Vercel a Turso database (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) is required, otherwise each serverless instance has its own `/tmp` database.
