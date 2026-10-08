import { NextResponse } from "next/server";
import { collect } from "@/lib/collector";
import { isDemoMode } from "@/lib/config";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Called weekly by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) return NextResponse.json({ skipped: "demo mode" });
  try {
    return NextResponse.json(await collect());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
