import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { configuredEngines, env, isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnostics: one quick, no-retry call per check. Never returns keys.
const clean = (s: string) => s.replace(/key=[^&\s"]+/gi, "key=***").replace(/\s+/g, " ").slice(0, 300);

async function quick(url: string, init: RequestInit) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    return { status: r.status, ms: Date.now() - t0, body: clean(text) };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, body: clean(String((e as Error).message)) };
  }
}

export async function GET() {
  const out: Record<string, unknown> = { mode: isDemoMode() ? "demo" : "live", engines: configuredEngines() };
  const key = env("GEMINI_API_KEY");
  if (key) {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const headers = { "x-goog-api-key": key, "content-type": "application/json" };
    const base = "https://generativelanguage.googleapis.com/v1beta";
    const body = JSON.stringify({ contents: [{ parts: [{ text: "Reply with one word: OK" }] }] });
    out.geminiModel = model;
    out.geminiPlain = await quick(`${base}/models/${model}:generateContent`, { method: "POST", headers, body });
    out.geminiSearch = await quick(`${base}/models/${model}:generateContent`, {
      method: "POST",
      headers,
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with one word: OK" }] }], tools: [{ google_search: {} }] }),
    });
    const models = await quick(`${base}/models?pageSize=200`, { headers });
    out.flashModels = (models.body.match(/models\/gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*/g) ?? []).slice(0, 15);
    if (models.status !== 200) out.modelsList = models;
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
