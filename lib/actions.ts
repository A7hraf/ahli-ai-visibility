import { all, run as exec } from "./db";
import { getRuns } from "./metrics";
import { ACTIONS, type ActionDef, type Status } from "./plan";
export * from "./plan";

type Row = { key: string; status: Status; done_at: string | null; updated_at: string };

export async function setStatus(key: string, status: Status) {
  if (!ACTIONS.some((a) => a.key === key)) throw new Error("Unknown action");
  await exec("UPDATE actions SET status = ?, done_at = CASE WHEN ? = 'done' THEN COALESCE(done_at, ?) ELSE NULL END, updated_at = datetime('now') WHERE key = ?", [status, status, new Date().toISOString(), key]);
}

async function scopedRate(runId: number, scope: ActionDef["scope"]) {
  const where = ["a.run_id = ?", "a.error IS NULL"];
  const args: (string | number)[] = [runId];
  if (scope.lang) {
    where.push("p.lang = ?");
    args.push(scope.lang);
  }
  if (scope.product) {
    where.push("p.product = ?");
    args.push(scope.product);
  }
  const r = await all<{ n: number; m: number }>(`SELECT COUNT(*) AS n, SUM(a.mentioned) AS m FROM answers a JOIN prompts p ON p.id = a.prompt_id WHERE ${where.join(" AND ")}`, args);
  const n = Number(r[0]?.n ?? 0);
  return n ? (100 * Number(r[0]?.m ?? 0)) / n : null;
}

export interface ActionView extends ActionDef {
  status: Status;
  doneAt: string | null;
  measured: { before: number; after: number; delta: number; runsAfter: number } | null;
  waiting: boolean;
}

/** Each action with its status and, once done, the measured change in its scope (avg of up to 3 runs before vs after). */
export async function actionViews(): Promise<ActionView[]> {
  const rows = await all<Row>("SELECT key, status, done_at, updated_at FROM actions");
  const runs = await getRuns();
  const out: ActionView[] = [];
  for (const a of ACTIONS) {
    const r = rows.find((x) => x.key === a.key);
    const status = (r?.status ?? "todo") as Status;
    const doneAt = r?.done_at ?? null;
    let measured: ActionView["measured"] = null;
    let waiting = false;
    if (status === "done" && doneAt) {
      const before = runs.filter((x) => x.started_at < doneAt).slice(-3);
      const after = runs.filter((x) => x.started_at >= doneAt).slice(0, 3);
      if (after.length && before.length) {
        const avg = async (rs: typeof runs) => {
          const v = (await Promise.all(rs.map((x) => scopedRate(Number(x.id), a.scope)))).filter((x): x is number => x !== null);
          return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
        };
        const b = await avg(before);
        const af = await avg(after);
        measured = { before: Math.round(b), after: Math.round(af), delta: Math.round(af - b), runsAfter: after.length };
      } else waiting = true;
    }
    out.push({ ...a, status, doneAt, measured, waiting });
  }
  const rank = { doing: 0, todo: 1, done: 2 } as const;
  return out.sort((x, y) => rank[x.status] - rank[y.status] || x.priority - y.priority || y.impact - x.impact);
}
