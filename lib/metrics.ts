import { all, parseJSON } from "./db";
import { BRAND, COMPETITORS, ENGINES } from "./config";
import type { Alert, Citation, Prompt, Run } from "./types";

type Row = {
  id: number;
  run_id: number;
  prompt_id: number;
  engine: string;
  mentioned: number;
  rank: number | null;
  sentiment: string;
  competitors: string;
  citations: string;
  lang: string;
  product: string;
};

const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);

export async function getRuns(): Promise<Run[]> {
  return all<Run>("SELECT * FROM runs WHERE status != 'running' ORDER BY started_at ASC");
}

async function rows(runId: number): Promise<Row[]> {
  return all<Row>(
    `SELECT a.id, a.run_id, a.prompt_id, a.engine, a.mentioned, a.rank, a.sentiment, a.competitors, a.citations, p.lang, p.product
     FROM answers a JOIN prompts p ON p.id = a.prompt_id
     WHERE a.run_id = ? AND a.error IS NULL`,
    [runId],
  );
}

function summarize(r: Row[]) {
  const total = r.length;
  const m = r.filter((x) => Number(x.mentioned) === 1);
  const top3 = m.filter((x) => x.rank !== null && Number(x.rank) <= 3);
  const pos = m.filter((x) => x.sentiment === "positive").length;
  const neg = m.filter((x) => x.sentiment === "negative").length;
  const ranks = m.map((x) => Number(x.rank)).filter((x) => x > 0);
  // share of voice: Ahli mentions out of all bank mentions
  const compMentions = r.reduce((s, x) => s + parseJSON<string[]>(x.competitors, []).length, 0);
  const sov = pct(m.length, m.length + compMentions);
  // visibility score: 0-100, rewards being named and being near the top
  const score = total
    ? Math.round((m.reduce((s, x) => s + (x.rank ? Math.max(0.35, 1 - (Number(x.rank) - 1) * 0.15) : 0.35), 0) / total) * 100)
    : 0;
  return {
    total,
    mentionRate: pct(m.length, total),
    top3Rate: pct(top3.length, total),
    avgRank: ranks.length ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10 : null,
    positive: pct(pos, m.length),
    negative: pct(neg, m.length),
    sov,
    score,
  };
}

export async function overview(runId: number) {
  const r = await rows(runId);
  const s = summarize(r);
  const alerts = await all<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE status = 'open'");
  return { ...s, openAlerts: Number(alerts[0]?.n ?? 0) };
}

export async function engineLangMatrix(runId: number) {
  const r = await rows(runId);
  return ENGINES.map((e) => {
    const er = r.filter((x) => x.engine === e.id);
    return {
      engine: e.id,
      label: e.label,
      en: summarize(er.filter((x) => x.lang === "en")).mentionRate,
      ar: summarize(er.filter((x) => x.lang === "ar")).mentionRate,
      all: summarize(er).mentionRate,
      top3: summarize(er).top3Rate,
      n: er.length,
    };
  }).filter((x) => x.n > 0);
}

export async function trend() {
  const runs = await getRuns();
  const out = [];
  for (const run of runs) {
    const r = await rows(Number(run.id));
    const s = summarize(r);
    out.push({
      runId: Number(run.id),
      date: run.started_at.slice(0, 10),
      mention: s.mentionRate,
      en: summarize(r.filter((x) => x.lang === "en")).mentionRate,
      ar: summarize(r.filter((x) => x.lang === "ar")).mentionRate,
      top3: s.top3Rate,
      sov: s.sov,
      score: s.score,
    });
  }
  return out;
}

export async function shareOfVoice(runId: number) {
  const r = await rows(runId);
  const counts = new Map<string, number>([[BRAND.name, 0], ...COMPETITORS.map((c) => [c.name, 0] as [string, number])]);
  for (const x of r) {
    if (Number(x.mentioned) === 1) counts.set(BRAND.name, (counts.get(BRAND.name) ?? 0) + 1);
    for (const c of parseJSON<string[]>(x.competitors, [])) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .map(([name, n]) => ({ name, n, share: pct(n, total), isBrand: name === BRAND.name }))
    .sort((a, b) => b.n - a.n);
}

export function domainOf(url: string) {
  try {
    return decodeURIComponent(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return url;
  }
}

export type DomainKind = "own" | "competitor" | "lookalike" | "comparison" | "news" | "community" | "government" | "other";
export function classifyDomain(d: string): DomainKind {
  if (d.endsWith(BRAND.domain)) return "own";
  if (/ahlibank\.com\.qa|alahli|ahliunited/.test(d)) return "lookalike";
  if (COMPETITORS.some((c) => d.endsWith(c.domain))) return "competitor";
  if (/giraffy|yallacompare|compare|souqalmal/.test(d)) return "comparison";
  if (/reddit|quora|expat|forum/.test(d)) return "community";
  if (/gov\.om|cbo\./.test(d)) return "government";
  if (/times|observer|news|zawya|muscatdaily|athir|alroya/.test(d)) return "news";
  return "other";
}

export async function citationStats(runId: number) {
  const r = await rows(runId);
  const domains = new Map<string, number>();
  const ownPages = new Map<string, number>();
  let answersWithCites = 0;
  let answersCitingOwn = 0;
  for (const x of r) {
    const cites = parseJSON<Citation[]>(x.citations, []);
    if (cites.length) answersWithCites++;
    let own = false;
    for (const c of cites) {
      const d = domainOf(c.url);
      domains.set(d, (domains.get(d) ?? 0) + 1);
      if (classifyDomain(d) === "own") {
        own = true;
        ownPages.set(c.url, (ownPages.get(c.url) ?? 0) + 1);
      }
    }
    if (own) answersCitingOwn++;
  }
  const total = [...domains.values()].reduce((a, b) => a + b, 0);
  return {
    answersWithCites,
    ownCitationRate: pct(answersCitingOwn, answersWithCites),
    domains: [...domains.entries()]
      .map(([domain, n]) => ({ domain, n, share: pct(n, total), kind: classifyDomain(domain) }))
      .sort((a, b) => b.n - a.n),
    ownPages: [...ownPages.entries()].map(([url, n]) => ({ url, n })).sort((a, b) => b.n - a.n),
  };
}

export async function promptMatrix(runId: number) {
  const prompts = await all<Prompt>("SELECT * FROM prompts ORDER BY id");
  const r = await rows(runId);
  return prompts.map((p) => {
    const pr = r.filter((x) => Number(x.prompt_id) === Number(p.id));
    const cells = ENGINES.map((e) => {
      const er = pr.filter((x) => x.engine === e.id);
      const m = er.filter((x) => Number(x.mentioned) === 1);
      const ranks = m.map((x) => Number(x.rank)).filter((x) => x > 0);
      return { engine: e.id, n: er.length, mentioned: m.length, bestRank: ranks.length ? Math.min(...ranks) : null };
    });
    return { prompt: p, cells };
  });
}

export async function openAlerts(limit = 50) {
  return all<Alert & { prompt_text: string; lang: string }>(
    `SELECT al.*, p.text AS prompt_text, p.lang FROM alerts al JOIN prompts p ON p.id = al.prompt_id
     ORDER BY CASE al.status WHEN 'open' THEN 0 ELSE 1 END, al.created_at DESC LIMIT ?`,
    [limit],
  );
}
