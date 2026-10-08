import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { DEFAULT_FACTS, DEFAULT_PROMPTS } from "./seed";
import { ENGINES, configuredEngines, isDemoMode } from "./config";

let client: Client | null = null;
let ready: Promise<void> | null = null;

// Accept the names used by Vercel's Turso integration as well as our own
const pickEnv = (...names: string[]) => {
  for (const n of names) {
    const k = Object.keys(process.env).find((x) => x.toLowerCase() === n.toLowerCase());
    const v = k ? process.env[k]?.trim() : undefined;
    if (v) return v;
  }
  return undefined;
};
export const DB_URL_ENV = () => pickEnv("DATABASE_URL", "TURSO_DATABASE_URL", "TURSO_URL", "LIBSQL_URL");
const DB_TOKEN_ENV = () => pickEnv("DATABASE_AUTH_TOKEN", "TURSO_AUTH_TOKEN", "TURSO_DATABASE_AUTH_TOKEN", "LIBSQL_AUTH_TOKEN");

function dbUrl(): string {
  const external = DB_URL_ENV();
  if (external) return external;
  // Serverless file systems are read-only except /tmp
  if (process.env.VERCEL) return "file:/tmp/ahli-visibility.db";
  try {
    mkdirSync("data", { recursive: true });
  } catch {}
  return "file:data/local.db";
}

function getClient(): Client {
  if (!client) {
    client = createClient({ url: dbUrl(), authToken: DB_TOKEN_ENV() || undefined });
  }
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    lang TEXT NOT NULL,
    product TEXT NOT NULL,
    persona TEXT NOT NULL DEFAULT 'general',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    prompt_id INTEGER NOT NULL,
    engine TEXT NOT NULL,
    repeat INTEGER NOT NULL DEFAULT 1,
    text TEXT NOT NULL DEFAULT '',
    mentioned INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    sentiment TEXT NOT NULL DEFAULT 'neutral',
    competitors TEXT NOT NULL DEFAULT '[]',
    facts TEXT NOT NULL DEFAULT '[]',
    citations TEXT NOT NULL DEFAULT '[]',
    error TEXT,
    simulated INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_answers_run ON answers(run_id)`,
  `CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field TEXT NOT NULL UNIQUE,
    product TEXT NOT NULL,
    label_en TEXT NOT NULL,
    label_ar TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    note TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    answer_id INTEGER NOT NULL,
    engine TEXT NOT NULL,
    prompt_id INTEGER NOT NULL,
    field TEXT NOT NULL,
    said TEXT NOT NULL,
    expected TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS actions (
    key TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'todo',
    done_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    body TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS site_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    results TEXT NOT NULL
  )`,
];

async function init() {
  const c = getClient();
  for (const s of SCHEMA) await c.execute(s);
  // migration for databases created before the "simulated" column existed
  try {
    await c.execute("ALTER TABLE answers ADD COLUMN simulated INTEGER NOT NULL DEFAULT 0");
  } catch {}
  const p = await c.execute("SELECT COUNT(*) AS n FROM prompts");
  if (Number(p.rows[0].n) === 0) {
    for (const pr of DEFAULT_PROMPTS) {
      await c.execute({
        sql: "INSERT INTO prompts (text, lang, product, persona) VALUES (?, ?, ?, ?)",
        args: [pr.text, pr.lang, pr.product, pr.persona],
      });
    }
  }
  const f = await c.execute("SELECT COUNT(*) AS n FROM facts");
  if (Number(f.rows[0].n) === 0) {
    for (const fc of DEFAULT_FACTS) {
      await c.execute({
        sql: "INSERT INTO facts (field, product, label_en, label_ar, value, unit, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [fc.field, fc.product, fc.label_en, fc.label_ar, fc.value, fc.unit, fc.note],
      });
    }
  }
  // Demo mode, or engines still without keys: start with clearly-flagged simulated history
  if (isDemoMode() || configuredEngines().length < ENGINES.length) {
    const a = await c.execute("SELECT COUNT(*) AS n FROM answers");
    if (Number(a.rows[0].n) === 0) {
      const { seedDemoHistory } = await import("./demo");
      await seedDemoHistory(c);
      await c.execute("UPDATE answers SET simulated = 1 WHERE run_id IN (SELECT id FROM runs WHERE mode = 'demo')");
    }
  }
  // improvement plan: one row per action, keeps the team's status updates
  const { ACTIONS, initialStatus } = await import("./plan");
  const have = new Set((await c.execute("SELECT key FROM actions")).rows.map((r) => String(r.key)));
  const runDates = isDemoMode() ? (await c.execute("SELECT started_at FROM runs ORDER BY started_at")).rows.map((r) => String(r.started_at)) : undefined;
  for (const a of ACTIONS) {
    if (have.has(a.key)) continue;
    const s = initialStatus(a.key, runDates);
    await c.execute({ sql: "INSERT INTO actions (key, status, done_at) VALUES (?, ?, ?)", args: [a.key, s.status, s.doneAt] });
  }
}

export async function db(): Promise<Client> {
  if (!ready) ready = init().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return getClient();
}

export async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => ({ ...row }) as unknown as T);
}

export async function run(sql: string, args: InValue[] = []) {
  const c = await db();
  return c.execute({ sql, args });
}

export function parseJSON<T>(s: unknown, fallback: T): T {
  if (typeof s !== "string") return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
