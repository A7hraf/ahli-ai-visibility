import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setStatus } from "@/lib/actions";

export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  if (!["todo", "doing", "done"].includes(b.status)) return NextResponse.json({ error: "Choose a status." }, { status: 400 });
  try {
    await setStatus(String(b.key), b.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
