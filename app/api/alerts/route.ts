import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireMember } from "@/lib/auth";

export async function PATCH(req: Request) {
  const denied = await requireMember(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  const status = b.status === "resolved" ? "resolved" : "open";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await run("UPDATE alerts SET status = ? WHERE id = ?", [status, id]);
  return NextResponse.json({ ok: true });
}
