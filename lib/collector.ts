import { all, db, run as exec } from "./db";
import { ASK, QuotaError } from "./engines";
import { analyzeAnswer, heuristicAnalysis } from "./analyze";
import { compareFacts } from "./accuracy";
import { ENGINES, configuredEngines, geminiOnly, isDemoMode, repeats } from "./config";
import { simulateAnswer } from "./simulate";
import type { Fact, Prompt } from "./types";

/**
 * One full measurement run: every active question → every configured engine → N repeats.
 * Answers are analysed and checked against the Bank's approved facts; mismatches raise alerts.
 */
export async function collect(opts: { promptIds?: number[] } = {}) {
  if (isDemoMode()) {
    throw new Error("Demo mode: add at least one engine API key (see .env.example) to run live measurements.");
  }
  await db();
  const real = configuredEngines();
  // engines without a key are simulated (hybrid mode) so every chart stays complete; they are flagged
  const engines = ENGINES.map((e) => e.id);
  const n = repeats();
  let prompts = await all<Prompt>("SELECT * FROM prompts WHERE active = 1 ORDER BY id");
  if (opts.promptIds?.length) prompts = prompts.filter((p) => opts.promptIds!.includes(Number(p.id)));
  const facts = await all<Fact>("SELECT * FROM facts");

  const started = new Date().toISOString();
  const r = await exec("INSERT INTO runs (started_at, mode, status) VALUES (?, 'live', 'running')", [started]);
  const runId = Number(r.lastInsertRowid);

  const jobs: { p: Prompt; engine: (typeof engines)[number]; rep: number }[] = [];
  for (const p of prompts) for (const engine of engines) for (let rep = 1; rep <= (real.includes(engine) ? n : 1); rep++) jobs.push({ p, engine, rep });

  let failed = 0;
  let realOk = 0;
  let lastError = "";
  // an engine whose daily quota ran out is skipped for the rest of the run (no pile of failed answers)
  const outOfQuota = new Set<string>();
  // small concurrency pool: polite to the APIs, still finishes in minutes
  const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.CONCURRENCY ?? (geminiOnly() ? 2 : 4)) || 4));
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const { p, engine, rep } = jobs[next++];
      if (outOfQuota.has(engine)) continue;
      const now = new Date().toISOString();
      const simulated = !real.includes(engine);
      try {
        const res = simulated ? simulateAnswer(p.text, engine, started.slice(0, 10)) : await ASK[engine](p.text);
        const a = simulated ? heuristicAnalysis(res.text) : await analyzeAnswer(p.text, res.text, facts);
        const ins = await exec(
          `INSERT INTO answers (run_id, prompt_id, engine, repeat, text, mentioned, rank, sentiment, competitors, facts, citations, error, simulated, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          [runId, p.id, engine, rep, res.text, a.mentioned ? 1 : 0, a.rank, a.sentiment, JSON.stringify(a.competitors), JSON.stringify(a.facts), JSON.stringify(res.citations), simulated ? 1 : 0, now],
        );
        if (!simulated) realOk++;
        for (const m of compareFacts(a.facts, facts)) {
          await exec(
            "INSERT INTO alerts (answer_id, engine, prompt_id, field, said, expected, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
            [Number(ins.lastInsertRowid), engine, p.id, m.field, m.said, m.expected, now],
          );
        }
      } catch (e) {
        if (e instanceof QuotaError) {
          outOfQuota.add(engine);
          lastError = String(e.message).slice(0, 200);
          continue;
        }
        failed++;
        lastError = String((e as Error).message).slice(0, 200);
        await exec(
          `INSERT INTO answers (run_id, prompt_id, engine, repeat, text, mentioned, rank, sentiment, competitors, facts, citations, error, created_at)
           VALUES (?, ?, ?, ?, '', 0, NULL, 'neutral', '[]', '[]', '[]', ?, ?)`,
          [runId, p.id, engine, rep, String((e as Error).message).slice(0, 500), now],
        );
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const quota = [...outOfQuota];
  // nothing real came back because the quota is used up: drop the run so the dashboards don't show an empty week
  if (quota.length && realOk === 0) {
    await exec("DELETE FROM answers WHERE run_id = ?", [runId]);
    await exec("DELETE FROM alerts WHERE answer_id NOT IN (SELECT id FROM answers)");
    await exec("DELETE FROM runs WHERE id = ?", [runId]);
    return { runId: null, total: 0, failed: 0, real, realTotal: 0, realOk: 0, lastError, quota };
  }
  await exec("UPDATE runs SET finished_at = ?, status = ?, notes = ? WHERE id = ?", [
    new Date().toISOString(),
    failed === jobs.length && jobs.length > 0 ? "failed" : "done",
    `${jobs.length} answers, ${failed} errors, real: ${real.join(", ") || "none"}, simulated: ${engines.filter((e) => !real.includes(e)).join(", ") || "none"}`,
    runId,
  ]);
  // AI-written weekly insights (stored once, so viewing the dashboard costs nothing)
  try {
    const { generateAiInsights } = await import("./insights");
    await generateAiInsights(runId);
  } catch {}
  const realTotal = jobs.filter((j) => real.includes(j.engine)).length;
  return { runId, total: jobs.length, failed, real, realTotal, realOk, lastError, quota };
}
