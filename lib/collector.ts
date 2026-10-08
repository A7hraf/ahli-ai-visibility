import { all, db, run as exec } from "./db";
import { ASK } from "./engines";
import { analyzeAnswer } from "./analyze";
import { compareFacts } from "./accuracy";
import { configuredEngines, isDemoMode, repeats } from "./config";
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
  const engines = configuredEngines();
  const n = repeats();
  let prompts = await all<Prompt>("SELECT * FROM prompts WHERE active = 1 ORDER BY id");
  if (opts.promptIds?.length) prompts = prompts.filter((p) => opts.promptIds!.includes(Number(p.id)));
  const facts = await all<Fact>("SELECT * FROM facts");

  const started = new Date().toISOString();
  const r = await exec("INSERT INTO runs (started_at, mode, status) VALUES (?, 'live', 'running')", [started]);
  const runId = Number(r.lastInsertRowid);

  const jobs: { p: Prompt; engine: (typeof engines)[number]; rep: number }[] = [];
  for (const p of prompts) for (const engine of engines) for (let rep = 1; rep <= n; rep++) jobs.push({ p, engine, rep });

  let failed = 0;
  // small concurrency pool: polite to the APIs, still finishes in minutes
  const CONCURRENCY = 4;
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const { p, engine, rep } = jobs[next++];
      const now = new Date().toISOString();
      try {
        const res = await ASK[engine](p.text);
        const a = await analyzeAnswer(p.text, res.text, facts);
        const ins = await exec(
          `INSERT INTO answers (run_id, prompt_id, engine, repeat, text, mentioned, rank, sentiment, competitors, facts, citations, error, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
          [runId, p.id, engine, rep, res.text, a.mentioned ? 1 : 0, a.rank, a.sentiment, JSON.stringify(a.competitors), JSON.stringify(a.facts), JSON.stringify(res.citations), now],
        );
        for (const m of compareFacts(a.facts, facts)) {
          await exec(
            "INSERT INTO alerts (answer_id, engine, prompt_id, field, said, expected, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
            [Number(ins.lastInsertRowid), engine, p.id, m.field, m.said, m.expected, now],
          );
        }
      } catch (e) {
        failed++;
        await exec(
          `INSERT INTO answers (run_id, prompt_id, engine, repeat, text, mentioned, rank, sentiment, competitors, facts, citations, error, created_at)
           VALUES (?, ?, ?, ?, '', 0, NULL, 'neutral', '[]', '[]', '[]', ?, ?)`,
          [runId, p.id, engine, rep, String((e as Error).message).slice(0, 500), now],
        );
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await exec("UPDATE runs SET finished_at = ?, status = ?, notes = ? WHERE id = ?", [
    new Date().toISOString(),
    failed === jobs.length && jobs.length > 0 ? "failed" : "done",
    `${jobs.length} answers, ${failed} errors, engines: ${engines.join(", ")}`,
    runId,
  ]);
  return { runId, total: jobs.length, failed };
}
