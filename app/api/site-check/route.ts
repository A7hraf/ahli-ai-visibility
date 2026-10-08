import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { liveCheck } from "@/lib/sitecheck";
import { requireAdmin } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const report = await liveCheck();
  await run("INSERT INTO site_checks (url, checked_at, results) VALUES (?, ?, ?)", ["https://ahlibank.om/", report.checkedAt, JSON.stringify(report)]);
  return NextResponse.json(report);
}
