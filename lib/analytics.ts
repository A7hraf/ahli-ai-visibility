// Pure analytics over the compact dataset. Runs on the server and in the browser,
// so every chart can be filtered and drilled into without a page reload.

export type Lang = "en" | "ar";
export type DomainKind = "own" | "competitor" | "lookalike" | "comparison" | "news" | "community" | "government" | "other";

export interface DRow {
  id: number; // answer id
  r: number; // run index
  p: number; // prompt index
  e: number; // engine index
  o: number[]; // banks in the order the answer named them (index into banks, 0 = Ahli)
  s: 0 | 1 | 2; // Ahli sentiment: 0 negative, 1 neutral, 2 positive
  c: number[]; // cited domains (index into domains)
  sim: 0 | 1;
}

export interface Dataset {
  runs: { id: number; date: string; sim: boolean }[];
  prompts: { id: number; text: string; lang: Lang; product: string; persona: string; active: boolean }[];
  banks: string[];
  banksAr: string[];
  engines: { id: string; label: string; color: string }[];
  domains: { d: string; k: DomainKind }[];
  rows: DRow[];
  openAlerts: number;
}

export interface Filters {
  ch?: string; // AI channel (engine id)
  mk?: string; // market (language)
  pl?: string; // product line
  seg?: string; // audience segment (persona)
  pd?: string; // period: "1" latest week, "4" last 4 weeks, "all"
}

export const BRAND_IDX = 0;

const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);

export function matches(ds: Dataset, x: DRow, f: Filters) {
  const p = ds.prompts[x.p];
  if (f.ch && ds.engines[x.e]?.id !== f.ch) return false;
  if (f.mk && p.lang !== f.mk) return false;
  if (f.pl && p.product !== f.pl) return false;
  if (f.seg && p.persona !== f.seg) return false;
  return true;
}

/** Runs in the selected period and the same-length window before it. */
export function periodRuns(ds: Dataset, pd?: string) {
  const n = ds.runs.length;
  const len = pd === "all" ? n : Math.max(1, Math.min(n, Number(pd) || 1));
  const cur = new Set<number>();
  const prev = new Set<number>();
  for (let i = n - len; i < n; i++) cur.add(i);
  if (pd !== "all") for (let i = Math.max(0, n - 2 * len); i < n - len; i++) prev.add(i);
  return { cur, prev, len };
}

export function slice(ds: Dataset, f: Filters) {
  const { cur, prev } = periodRuns(ds, f.pd);
  const base = ds.rows.filter((x) => matches(ds, x, f));
  return { base, cur: base.filter((x) => cur.has(x.r)), prev: base.filter((x) => prev.has(x.r)) };
}

export interface Summary {
  n: number;
  reach: number; // % of answers naming Ahli
  top3: number; // % in the shortlist (top 3)
  first: number; // % named first (top of mind)
  sov: number; // Ahli mentions / all bank mentions
  index: number; // 0-100 AI visibility index
  avgPos: number | null;
  pos: number; // sentiment split among answers that name Ahli
  neu: number;
  neg: number;
}

export function bankSummary(rows: DRow[], bank = BRAND_IDX): Summary {
  let named = 0, top3 = 0, first = 0, posSum = 0, all = 0, idx = 0, pos = 0, neu = 0, neg = 0;
  for (const x of rows) {
    all += x.o.length;
    const i = x.o.indexOf(bank);
    if (i < 0) continue;
    named++;
    posSum += i + 1;
    if (i === 0) first++;
    if (i < 3) top3++;
    idx += Math.max(0.35, 1 - i * 0.15);
    if (bank === BRAND_IDX) {
      if (x.s === 2) pos++;
      else if (x.s === 0) neg++;
      else neu++;
    }
  }
  return {
    n: rows.length,
    reach: pct(named, rows.length),
    top3: pct(top3, rows.length),
    first: pct(first, rows.length),
    sov: pct(named, all),
    index: rows.length ? Math.round((idx / rows.length) * 100) : 0,
    avgPos: named ? Math.round((posSum / named) * 10) / 10 : null,
    pos: pct(pos, named),
    neu: pct(neu, named),
    neg: pct(neg, named),
  };
}

export type Metric = "reach" | "top3" | "first" | "sov" | "index";

/** One point per weekly run. */
export function weekly(ds: Dataset, rows: DRow[], bank = BRAND_IDX) {
  return ds.runs.map((run, i) => {
    const rr = rows.filter((x) => x.r === i);
    return { i, date: run.date, sim: run.sim, ...bankSummary(rr, bank) };
  });
}

export type Dim = "engine" | "lang" | "product" | "persona";

export function dimValue(ds: Dataset, x: DRow, dim: Dim): string {
  const p = ds.prompts[x.p];
  return dim === "engine" ? ds.engines[x.e].id : dim === "lang" ? p.lang : dim === "product" ? p.product : p.persona;
}

/** Ahli metrics for each value of a dimension (e.g. per AI channel). */
export function breakdown(ds: Dataset, rows: DRow[], dim: Dim, values: string[], bank = BRAND_IDX) {
  return values
    .map((v) => ({ key: v, ...bankSummary(rows.filter((x) => dimValue(ds, x, dim) === v), bank) }))
    .filter((x) => x.n > 0);
}

/** Every bank's standing, sorted by reach, with change vs the previous period. */
export function ranking(ds: Dataset, cur: DRow[], prev: DRow[]) {
  return ds.banks
    .map((name, b) => {
      const s = bankSummary(cur, b);
      const p = prev.length ? bankSummary(prev, b) : null;
      return { b, name, isBrand: b === BRAND_IDX, ...s, delta: p ? Math.round((s.reach - p.reach) * 10) / 10 : null };
    })
    .sort((a, c) => c.reach - a.reach || c.first - a.first);
}

export function domainStats(ds: Dataset, rows: DRow[]) {
  const n = new Map<number, number>();
  let withCites = 0, citingOwn = 0, total = 0;
  for (const x of rows) {
    if (x.c.length) withCites++;
    let own = false;
    for (const c of x.c) {
      n.set(c, (n.get(c) ?? 0) + 1);
      total++;
      if (ds.domains[c].k === "own") own = true;
    }
    if (own) citingOwn++;
  }
  const domains = [...n.entries()].map(([i, v]) => ({ i, d: ds.domains[i].d, k: ds.domains[i].k, n: v, share: pct(v, total) })).sort((a, b) => b.n - a.n);
  const kinds = new Map<DomainKind, number>();
  for (const d of domains) kinds.set(d.k, (kinds.get(d.k) ?? 0) + d.n);
  return {
    withCites,
    ownRate: pct(citingOwn, withCites),
    total,
    domains,
    kinds: [...kinds.entries()].map(([k, v]) => ({ k, n: v, share: pct(v, total) })).sort((a, b) => b.n - a.n),
  };
}

/** Which competitors appear in the answers that leave Ahli out. */
export function lostTo(ds: Dataset, rows: DRow[]) {
  const miss = rows.filter((x) => !x.o.includes(BRAND_IDX));
  const n = new Map<number, number>();
  for (const x of miss) for (const b of x.o) n.set(b, (n.get(b) ?? 0) + 1);
  return { missed: miss.length, banks: [...n.entries()].map(([b, v]) => ({ b, name: ds.banks[b], n: v, share: pct(v, miss.length) })).sort((a, b) => b.n - a.n) };
}

export const round = (v: number) => Math.round(v * 10) / 10;
