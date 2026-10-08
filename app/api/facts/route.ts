import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  const value = String(b.value ?? "").trim();
  if (!id || !value || value.length > 60) return NextResponse.json({ error: "Enter a value (max 60 characters)." }, { status: 400 });
  await run("UPDATE facts SET value = ?, note = ?, updated_at = datetime('now') WHERE id = ?", [value, "Approved value entered by the team.", id]);
  return NextResponse.json({ ok: true });
}
