import type { Client } from "@libsql/client";
import { COMPETITORS, ENGINES } from "./config";
import { compareFacts } from "./accuracy";
import type { Citation, ExtractedFact, Fact, Prompt, Sentiment } from "./types";

// Deterministic random numbers so the demo looks the same on every machine
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AHLI_PAGES = [
  "https://ahlibank.om/ahlibank/personal-banking/loans/personal-loan/",
  "https://ahlibank.om/ahlibank/personal-banking/loans/home-loan/",
  "https://ahlibank.om/assets/uploads/2024/01/ahlibank-KFS_Personal-Loan_Bilingual.pdf",
  "https://ahlibank.om/",
];
const THIRD_PARTY = [
  { url: "https://giraffy.com/om/ar/finance/personal-loans", w: 9 },
  { url: "https://yallacompare.com/omn/ar/القروض-الشخصية/", w: 7 },
  { url: "https://www.reddit.com/r/Oman/", w: 6 },
  { url: "https://timesofoman.com/", w: 4 },
  { url: "https://www.omanobserver.om/", w: 3 },
  { url: "https://cbo.gov.om/", w: 2 },
  { url: "https://www.ahlibank.com.qa/en/borrow/personal-loan", w: 2 },
  { url: "https://www.expatica.com/", w: 2 },
];

function pickWeighted<T extends { w: number }>(r: () => number, items: T[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let x = r() * total;
  for (const i of items) {
    if ((x -= i.w) <= 0) return i;
  }
  return items[items.length - 1];
}

// How likely each engine is to name the Bank before the pilot fixes (EN / AR)
const BASE: Record<string, [number, number]> = {
  chatgpt: [0.34, 0.14],
  gemini: [0.3, 0.12],
  claude: [0.28, 0.1],
  perplexity: [0.38, 0.17],
  deepseek: [0.16, 0.05],
};

const COMP_WEIGHT: Record<string, number> = {
  "Bank Muscat": 0.78,
  "National Bank of Oman": 0.6,
  "Bank Dhofar": 0.5,
  "Sohar International": 0.48,
  "Sohar Islamic": 0.3,
  "Bank Nizwa": 0.36,
  "Oman Arab Bank": 0.32,
  "HSBC Oman": 0.28,
};

const WEEKS = 8;
const FIX_WEEK = 5; // simulated content fixes go live from this week

export async function seedDemoHistory(c: Client) {
  const prompts = (await c.execute("SELECT * FROM prompts WHERE active = 1")).rows as unknown as Prompt[];
  const truth = (await c.execute("SELECT * FROM facts")).rows as unknown as Fact[];
  const r = rng(20261008);
  const now = new Date();
  // runs are weekly, on Mondays, ending this week
  const lastMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7), 6, 0, 0));

  for (let w = 0; w < WEEKS; w++) {
    const when = new Date(lastMonday.getTime() - (WEEKS - 1 - w) * 7 * 86400000).toISOString();
    const runRes = await c.execute({
      sql: "INSERT INTO runs (started_at, finished_at, mode, status, notes) VALUES (?, ?, 'demo', 'done', ?)",
      args: [when, when, "Simulated demo run"],
    });
    const runId = Number(runRes.lastInsertRowid);
    const lift = w >= FIX_WEEK - 1 ? 0.06 + (w - (FIX_WEEK - 1)) * 0.03 : w * 0.01;

    const stmts: { sql: string; args: (string | number | null)[] }[] = [];
    const alertQueue: { idx: number; mism: ReturnType<typeof compareFacts>; engine: string; promptId: number }[] = [];

    for (const p of prompts) {
      for (const e of ENGINES) {
        const [en, ar] = BASE[e.id];
        const base = p.lang === "ar" ? ar : en;
        const brandBoost = p.product === "brand" || /ahli|الأهلي/i.test(p.text) ? 0.4 : 0;
        const pMention = Math.min(0.97, base + lift + brandBoost);
        const mentioned = r() < pMention;
        // bigger banks have more content online, so engines name them more often
        let comps = COMPETITORS.filter((c) => r() < (COMP_WEIGHT[c.name] ?? 0.35)).map((x) => x.name);
        if (comps.length < 2) comps = [...comps, ...COMPETITORS.map((c) => c.name).filter((n) => !comps.includes(n)).slice(0, 2 - comps.length)];
        comps = comps.sort(() => r() - 0.5).sort((a, b) => (COMP_WEIGHT[b] ?? 0) - (COMP_WEIGHT[a] ?? 0) + (r() - 0.5) * 0.6);
        let rank: number | null = null;
        if (mentioned) {
          const topChance = 0.25 + lift * 1.5 + brandBoost;
          rank = r() < topChance ? 1 + Math.floor(r() * 3) : 4 + Math.floor(r() * 2);
          rank = Math.min(rank, comps.length + 1);
        }
        const s = r();
        const sentiment: Sentiment = !mentioned ? "neutral" : s < 0.62 ? "positive" : s < 0.92 ? "neutral" : "negative";

        // facts the engine stated about the Bank
        const facts: ExtractedFact[] = [];
        if (mentioned && (p.product === "personal_finance" || p.product === "home_finance")) {
          const stale = r() < (w >= FIX_WEEK - 1 ? 0.08 : 0.3); // old PDF quoted
          if (p.product === "personal_finance") {
            facts.push({ field: "personal_loan_rate", value: stale ? "5.25%" : "4.50%" });
            if (r() < 0.5) facts.push({ field: "personal_loan_max", value: stale ? "OMR 50,000" : "OMR 70,000" });
          } else {
            facts.push({ field: "home_loan_rate", value: stale ? "5.50%" : "4.75%" });
          }
        }

        // citations
        const citations: Citation[] = [];
        if (e.webSearch) {
          const n = 2 + Math.floor(r() * 4);
          const own = mentioned && r() < 0.35 + lift;
          if (own) citations.push({ url: AHLI_PAGES[Math.floor(r() * AHLI_PAGES.length)] });
          while (citations.length < n) {
            const c3 = r() < 0.25 ? { url: `https://${COMPETITORS[Math.floor(r() * COMPETITORS.length)].domain}/` } : { url: pickWeighted(r, THIRD_PARTY).url };
            if (!citations.some((x) => x.url === c3.url)) citations.push(c3);
          }
        }

        const order = [...comps];
        if (mentioned && rank) order.splice(rank - 1, 0, "Ahli Bank");
        const text =
          (p.lang === "ar"
            ? `إجابة محاكاة (بيانات تجريبية). البنوك المقترحة: ${order.join("، ")}.`
            : `Simulated answer (demo data). Banks suggested: ${order.join(", ")}.`) +
          (facts.length ? (p.lang === "ar" ? ` معلومات ذُكرت عن البنك الأهلي: ${facts.map((f) => f.value).join("، ")}.` : ` Facts stated about Ahli Bank: ${facts.map((f) => f.value).join(", ")}.`) : "");

        stmts.push({
          sql: `INSERT INTO answers (run_id, prompt_id, engine, repeat, text, mentioned, rank, sentiment, competitors, facts, citations, error, created_at)
                VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
          args: [runId, p.id, e.id, text, mentioned ? 1 : 0, rank, sentiment, JSON.stringify(comps), JSON.stringify(facts), JSON.stringify(citations), when],
        });
        const mism = compareFacts(facts, truth);
        if (mism.length) alertQueue.push({ idx: stmts.length - 1, mism, engine: e.id, promptId: p.id });
      }
    }
    const results = await c.batch(stmts, "write");
    const alertStmts = alertQueue.flatMap((a) =>
      a.mism.map((m) => ({
        sql: "INSERT INTO alerts (answer_id, engine, prompt_id, field, said, expected, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [Number(results[a.idx].lastInsertRowid), a.engine, a.promptId, m.field, m.said, m.expected, w < WEEKS - 2 ? "resolved" : "open", when],
      })),
    );
    if (alertStmts.length) await c.batch(alertStmts, "write");
  }
}
