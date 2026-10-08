import { NextResponse } from "next/server";
import { ASK } from "@/lib/engines";
import { all } from "@/lib/db";
import { configuredEngines, isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnostics: is each connected engine answering? Never returns keys.
let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return NextResponse.json(cache.body);
  const engines = configuredEngines();
  const checks: Record<string, string> = {};
  for (const e of engines) {
    const t0 = Date.now();
    try {
      const r = await ASK[e]("Reply with one word: OK");
      checks[e] = `ok in ${Date.now() - t0} ms: ${r.text.slice(0, 40)}`;
    } catch (err) {
      checks[e] = `error: ${String((err as Error).message).replace(/key=[^&\s]+/gi, "key=***").slice(0, 300)}`;
    }
  }
  const runs = await all<{ id: number; status: string; notes: string | null; started_at: string; mode: string }>("SELECT id, status, notes, started_at, mode FROM runs ORDER BY id DESC LIMIT 3");
  const errs = await all<{ error: string }>("SELECT error FROM answers WHERE error IS NOT NULL ORDER BY id DESC LIMIT 2");
  const body = {
    mode: isDemoMode() ? "demo" : "live",
    engines,
    checks,
    database: process.env.DATABASE_URL ? "external" : process.env.VERCEL ? "temporary (/tmp)" : "local file",
    lastRuns: runs,
    lastErrors: errs.map((e) => e.error.replace(/key=[^&\s]+/gi, "key=***").slice(0, 300)),
  };
  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
