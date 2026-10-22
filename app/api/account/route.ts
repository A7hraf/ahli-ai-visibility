import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { checkPassword, findById, updateUser, validPassword } from "@/lib/users";

export const dynamic = "force-dynamic";

// change my own password
export async function PATCH(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  const u = await findById(me.uid);
  if (!u || !(await checkPassword(String(b.current ?? ""), u.pass_hash))) return NextResponse.json({ error: "current" }, { status: 400 });
  if (!validPassword(b.next)) return NextResponse.json({ error: "password" }, { status: 400 });
  await updateUser(u.id, { password: b.next });
  return NextResponse.json({ ok: true });
}
