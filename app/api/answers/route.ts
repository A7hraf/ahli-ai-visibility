import { NextResponse } from "next/server";
import { all } from "@/lib/db";

// A few answers by id, for the detail panels (read-only, public questions only)
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 8);
  if (!ids.length) return NextResponse.json({ answers: [] });
  const rows = await all<{ id: number; text: string; prompt: string; lang: string; engine: string; mentioned: number; rank: number | null; simulated: number }>(
    `SELECT a.id, substr(a.text, 1, 900) AS text, p.text AS prompt, p.lang, a.engine, a.mentioned, a.rank, a.simulated
     FROM answers a JOIN prompts p ON p.id = a.prompt_id WHERE a.id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  rows.sort((a, b) => ids.indexOf(Number(a.id)) - ids.indexOf(Number(b.id)));
  return NextResponse.json({ answers: rows });
}
