import { NextResponse } from "next/server";
import { z } from "zod";
import { ASK } from "@/lib/engines";
import { analyzeAnswer, heuristicAnalysis } from "@/lib/analyze";
import { all } from "@/lib/db";
import { ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import { simulateAnswer } from "@/lib/simulate";
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

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a question of at least 5 characters." }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!allowed(ip)) return NextResponse.json({ error: "limit" }, { status: 429 });

  const { question } = parsed.data;
  const demo = isDemoMode();
  const real: EngineId[] = demo ? [] : configuredEngines();
  const all5: EngineId[] = ENGINES.map((e) => e.id);
  const engines = (parsed.data.engines?.length ? parsed.data.engines : all5).filter((e) => all5.includes(e));
  const facts = real.length ? await all<Fact>("SELECT * FROM facts") : [];

  const results = await Promise.all(
    engines.map(async (engine) => {
      try {
        const simulated = !real.includes(engine);
        const res = simulated ? simulateAnswer(question, engine) : await ASK[engine](question);
        const a = simulated ? heuristicAnalysis(res.text) : await analyzeAnswer(question, res.text, facts);
        return { engine, ok: true, simulated, text: res.text, citations: res.citations, mentioned: a.mentioned, rank: a.rank, competitors: a.competitors, sentiment: a.sentiment, facts: a.facts };
      } catch (e) {
        return { engine, ok: false, simulated: false, error: String((e as Error).message).slice(0, 300) };
      }
    }),
  );
  return NextResponse.json({ demo, question, results });
}
