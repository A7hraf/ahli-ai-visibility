import { all, parseJSON } from "./db";
import { BRAND, COMPETITORS, ENGINES, PRODUCTS } from "./config";
import { getRuns } from "./metrics";

type Row = { run_id: number; engine: string; mentioned: number; rank: number | null; competitors: string; lang: string; product: string };

export const BANKS = [BRAND.name, ...COMPETITORS.map((c) => c.name)];

/** Rebuild the order banks appeared in one answer (Ahli is inserted at its recorded rank). */
function order(r: Row): string[] {
  const list = parseJSON<string[]>(r.competitors, []).filter((n) => n !== BRAND.name);
  if (Number(r.mentioned) === 1) {
    const at = Math.max(0, Math.min(list.length, (Number(r.rank) || list.length + 1) - 1));
    list.splice(at, 0, BRAND.name);
  }
  return list;
}

async function rowsFor(runIds: number[]): Promise<Row[]> {
  if (!runIds.length) return [];
  return all<Row>(
    `SELECT a.run_id, a.engine, a.mentioned, a.rank, a.competitors, p.lang, p.product
     FROM answers a JOIN prompts p ON p.id = a.prompt_id
     WHERE a.error IS NULL AND a.run_id IN (${runIds.map(() => "?").join(",")})`,
    runIds,
  );
}

const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);

function bankStats(rows: Row[], bank: string) {
  let named = 0, first = 0, top3 = 0, posSum = 0;
  for (const r of rows) {
    const o = order(r);
    const i = o.indexOf(bank);
    if (i >= 0) {
      named++;
      posSum += i + 1;
      if (i === 0) first++;
      if (i < 3) top3++;
    }
  }
  return { mention: pct(named, rows.length), first: pct(first, rows.length), top3: pct(top3, rows.length), avgPos: named ? Math.round((posSum / named) * 10) / 10 : null, named };
}

export async function comparison() {
  const runs = await getRuns();
  if (!runs.length) return null;
  const last = Number(runs[runs.length - 1].id);
  const prev = runs.length > 1 ? Number(runs[runs.length - 2].id) : null;
  const rows = await rowsFor([last]);
  const prevRows = prev ? await rowsFor([prev]) : [];

  const ranking = BANKS.map((b) => {
    const s = bankStats(rows, b);
    const p = prevRows.length ? bankStats(prevRows, b) : null;
    return {
      bank: b,
      isBrand: b === BRAND.name,
      ...s,
      en: bankStats(rows.filter((r) => r.lang === "en"), b).mention,
      ar: bankStats(rows.filter((r) => r.lang === "ar"), b).mention,
      delta: p ? Math.round((s.mention - p.mention) * 10) / 10 : null,
    };
  }).sort((a, b) => b.mention - a.mention);

  const byEngine = BANKS.map((b) => ({
    bank: b,
    cells: ENGINES.map((e) => ({ engine: e.id, v: bankStats(rows.filter((r) => r.engine === e.id), b).mention })),
  }));
  const byProduct = BANKS.map((b) => ({
    bank: b,
    cells: PRODUCTS.map((p) => ({ product: p, v: bankStats(rows.filter((r) => r.product === p), b).mention })),
  }));

  // trend: mention rate per bank across all runs
  const allRows = await rowsFor(runs.map((r) => Number(r.id)));
  const trend = runs.map((run) => {
    const rr = allRows.filter((r) => Number(r.run_id) === Number(run.id));
    const point: Record<string, number | string> = { date: run.started_at.slice(0, 10) };
    for (const b of BANKS) point[b] = bankStats(rr, b).mention;
    return point;
  });

  return { ranking, byEngine, byProduct, trend, total: rows.length };
}
