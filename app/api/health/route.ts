import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { configuredEngines, env, isDemoMode } from "@/lib/config";
import { geminiModels } from "@/lib/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnostics: one quick, no-retry call per check. Never returns keys.
const clean = (s: string, n = 300) => s.replace(/key=[^&\s"]+/gi, "key=***").replace(/\s+/g, " ").slice(0, n);

async function quick(url: string, init: RequestInit) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    return { status: r.status, ms: Date.now() - t0, body: clean(text, 900), raw: text };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, body: clean(String((e as Error).message)) };
  }
}

export async function GET(req: Request) {
  const test = new URL(req.url).searchParams.get("test") === "1"; // model tests use quota: opt-in
  const out: Record<string, unknown> = { mode: isDemoMode() ? "demo" : "live", engines: configuredEngines() };
  const key = env("GEMINI_API_KEY");
  if (key) {
    const model = geminiModels()[0];
    const headers = { "x-goog-api-key": key, "content-type": "application/json" };
    const base = "https://generativelanguage.googleapis.com/v1beta";
    const body = JSON.stringify({ contents: [{ parts: [{ text: "Reply with one word: OK" }] }] });
    out.geminiModel = model;
    void body;
    const strip = (x: { status: number; ms: number; body: string }) => ({ status: x.status, ms: x.ms, body: x.body });
    const models = await quick(`${base}/models?pageSize=200`, { headers });
    const ids = [...new Set((models.raw ?? "").match(/gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*/g) ?? [])];
    out.flashModels = ids.slice(0, 20);
    const tryModels = geminiModels();
    const tests: Record<string, unknown> = {};
    for (const m of test ? tryModels : []) {
      const r = await quick(`${base}/models/${m}:generateContent`, { method: "POST", headers, body });
      tests[m] = r.status === 200 ? { status: 200, ms: r.ms } : strip(r);
    }
    out.modelTests = test ? tests : "add ?test=1 to test each model (uses quota)";
  }
  try {
    out.lastRuns = await all("SELECT id, status, notes, started_at, mode FROM runs ORDER BY id DESC LIMIT 3");
    out.lastErrors = (await all<{ error: string }>("SELECT error FROM answers WHERE error IS NOT NULL ORDER BY id DESC LIMIT 2")).map((e) => clean(e.error));
  } catch (e) {
    out.db = clean(String((e as Error).message));
  }
  out.database = process.env.DATABASE_URL ? "external" : process.env.VERCEL ? "temporary (/tmp)" : "local file";
  return NextResponse.json(out);
}
