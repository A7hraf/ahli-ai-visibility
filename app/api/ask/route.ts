import { NextResponse } from "next/server";
import { z } from "zod";
import { ASK } from "@/lib/engines";
import { analyzeAnswer, heuristicAnalysis } from "@/lib/analyze";
import { all } from "@/lib/db";
import { BRAND, COMPETITORS, ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import type { EngineId, Fact } from "@/lib/types";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Simple protection for a public link: per-visitor and per-day caps (per server instance).
const PER_IP = Number(process.env.ASK_PER_IP_PER_HOUR ?? 10);
const PER_DAY = Number(process.env.ASK_DAILY_LIMIT ?? 300);
const hits = new Map<string, number[]>();
let day = new Date().toISOString().slice(0, 10);
let dayCount = 0;

function allowed(ip: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= PER_IP || dayCount >= PER_DAY) return false;
  recent.push(now);
  hits.set(ip, recent);
  dayCount++;
  return true;
}

const Body = z.object({
  question: z.string().trim().min(5).max(400),
  engines: z.array(z.enum(["chatgpt", "gemini", "claude", "perplexity", "deepseek"])).optional(),
});

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function simulate(question: string, engine: EngineId) {
  const ar = /[؀-ۿ]/.test(question);
  let seed = hash(question + engine);
  const r = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  const comps = [...COMPETITORS].sort(() => r() - 0.5).slice(0, 3).map((c) => c.name);
  const named = r() < (ar ? 0.35 : 0.55) || /ahli|الأهلي/i.test(question);
  if (named) comps.splice(Math.floor(r() * 4), 0, BRAND.name);
  const lines = comps.map((b, i) => `${i + 1}. ${b}`).join("\n");
  const text = ar
    ? `(إجابة محاكاة — وضع تجريبي)\nبناءً على المصادر المتاحة، هذه بعض البنوك التي يمكنك النظر فيها في عُمان:\n${lines}\nننصح بمقارنة الرسوم والشروط في موقع كل بنك قبل القرار.`
    : `(Simulated answer — demo mode)\nBased on available sources, here are banks you could consider in Oman:\n${lines}\nCompare fees and terms on each bank's website before deciding.`;
  const citations = ENGINES.find((e) => e.id === engine)?.webSearch
    ? [{ url: "https://giraffy.com/om/ar/finance/personal-loans" }, { url: `https://${COMPETITORS[Math.floor(r() * COMPETITORS.length)].domain}/` }, ...(named && r() < 0.5 ? [{ url: "https://ahlibank.om/" }] : [])]
    : [];
  return { text, citations };
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a question of at least 5 characters." }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!allowed(ip)) return NextResponse.json({ error: "limit" }, { status: 429 });

  const { question } = parsed.data;
  const demo = isDemoMode();
  const available: EngineId[] = demo ? ENGINES.map((e) => e.id) : configuredEngines();
  const engines = (parsed.data.engines?.length ? parsed.data.engines : available).filter((e) => available.includes(e));
  const facts = demo ? [] : await all<Fact>("SELECT * FROM facts");

  const results = await Promise.all(
    engines.map(async (engine) => {
      try {
        const res = demo ? simulate(question, engine) : await ASK[engine](question);
        const a = demo ? heuristicAnalysis(res.text) : await analyzeAnswer(question, res.text, facts);
        return { engine, ok: true, text: res.text, citations: res.citations, mentioned: a.mentioned, rank: a.rank, competitors: a.competitors, sentiment: a.sentiment, facts: a.facts };
      } catch (e) {
        return { engine, ok: false, error: String((e as Error).message).slice(0, 300) };
      }
    }),
  );
  return NextResponse.json({ demo, question, results });
}
