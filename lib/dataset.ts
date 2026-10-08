import { all, parseJSON } from "./db";
import { BRAND, COMPETITORS, ENGINES } from "./config";
import { classifyDomain, domainOf } from "./metrics";
import type { Citation, Lang } from "./types";
import type { Dataset, DomainKind, DRow } from "./analytics";

// Series colours for the AI channels (validated categorical order, CVD-safe on white; defined in config)
export const CHANNEL_COLORS = ENGINES.map((e) => e.color);

const MAX_RUNS = 26; // half a year of weekly tracking

type Row = { id: number; run_id: number; prompt_id: number; engine: string; mentioned: number; rank: number | null; sentiment: string; competitors: string; citations: string; simulated: number };

/** Everything the interactive dashboards need, in one compact payload. */
export async function loadDataset(): Promise<Dataset> {
  const runs = (await all<{ id: number; started_at: string; mode: string }>("SELECT id, started_at, mode FROM runs WHERE status != 'running' ORDER BY started_at ASC")).slice(-MAX_RUNS);
  const prompts = await all<{ id: number; text: string; lang: Lang; product: string; persona: string; active: number }>("SELECT id, text, lang, product, persona, active FROM prompts ORDER BY id");
  const banks = [BRAND.name, ...COMPETITORS.map((c) => c.name)];
  const runIdx = new Map(runs.map((r, i) => [Number(r.id), i]));
  const promptIdx = new Map(prompts.map((p, i) => [Number(p.id), i]));
  const engineIdx = new Map(ENGINES.map((e, i) => [e.id as string, i]));
  const bankIdx = new Map(banks.map((b, i) => [b, i]));
  const domains: { d: string; k: DomainKind; b?: number }[] = [];
  const siteBank = (d: string) => [BRAND.domain, ...COMPETITORS.map((c) => c.domain)].findIndex((x) => d.endsWith(x));
  const domainIdx = new Map<string, number>();

  const raw = runs.length
    ? await all<Row>(
        `SELECT id, run_id, prompt_id, engine, mentioned, rank, sentiment, competitors, citations, simulated FROM answers
         WHERE error IS NULL AND run_id IN (${runs.map(() => "?").join(",")})`,
        runs.map((r) => Number(r.id)),
      )
    : [];

  const simRuns = new Map<number, boolean>();
  const rows: DRow[] = [];
  for (const a of raw) {
    const r = runIdx.get(Number(a.run_id));
    const p = promptIdx.get(Number(a.prompt_id));
    const e = engineIdx.get(a.engine);
    if (r === undefined || p === undefined || e === undefined) continue;
    // rebuild the order banks were named in, inserting Ahli at its recorded rank
    const o = parseJSON<string[]>(a.competitors, [])
      .filter((n) => n !== BRAND.name)
      .map((n) => bankIdx.get(n))
      .filter((x): x is number => x !== undefined);
    if (Number(a.mentioned) === 1) o.splice(Math.max(0, Math.min(o.length, (Number(a.rank) || o.length + 1) - 1)), 0, 0);
    const c: number[] = [];
    for (const cite of parseJSON<Citation[]>(a.citations, [])) {
      const d = domainOf(cite.url);
      let i = domainIdx.get(d);
      if (i === undefined) {
        i = domains.length;
        const b = siteBank(d);
        domains.push({ d, k: classifyDomain(d), ...(b >= 0 ? { b } : {}) });
        domainIdx.set(d, i);
      }
      if (!c.includes(i)) c.push(i);
    }
    const sim = Number(a.simulated) === 1 ? 1 : 0;
    simRuns.set(r, (simRuns.get(r) ?? true) && sim === 1);
    rows.push({ id: Number(a.id), r, p, e, o: [...new Set(o)], s: a.sentiment === "positive" ? 2 : a.sentiment === "negative" ? 0 : 1, c, sim });
  }

  const alerts = await all<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE status = 'open'");
  return {
    runs: runs.map((r, i) => ({ id: Number(r.id), date: r.started_at.slice(0, 10), sim: r.mode === "demo" || (simRuns.get(i) ?? false) })),
    prompts: prompts.map((p) => ({ id: Number(p.id), text: p.text, lang: p.lang, product: p.product, persona: p.persona, active: Number(p.active) === 1 })),
    banks,
    banksAr: [BRAND.nameAr, ...COMPETITORS.map((c) => c.aliases.find((a) => /[\u0600-\u06FF]/.test(a)) ?? c.name)],
    bankColors: [BRAND.color, ...COMPETITORS.map((c) => c.color)],
    bankShort: [BRAND.short, ...COMPETITORS.map((c) => c.short)],
    engines: ENGINES.map((e) => ({ id: e.id, label: e.label, color: e.color })),
    domains,
    rows,
    openAlerts: Number(alerts[0]?.n ?? 0),
  };
}
