import { NextResponse } from "next/server";
import { collect } from "@/lib/collector";
import { requireAdmin } from "@/lib/auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const result = await collect();
    // the free daily quota is used up and nothing was measured
    if (result.quota.length && result.realOk === 0) return NextResponse.json({ ...result, error: "quota" }, { status: 429 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
