import { NextResponse } from "next/server";
import { checkPassword, findByEmail, touchLogin } from "@/lib/users";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// a few tries per address per 15 minutes (per server instance)
const tries = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const recent = (tries.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
  recent.push(now);
  tries.set(key, recent);
  return recent.length > 10;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; remember?: boolean };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(`${ip}|${email}`)) return NextResponse.json({ error: "too_many" }, { status: 429 });
  const u = email && password ? await findByEmail(email) : null;
  if (!u || !(await checkPassword(password, u.pass_hash))) return NextResponse.json({ error: "invalid" }, { status: 401 });
  await touchLogin(u.id);
  const days = body.remember === false ? 1 : SESSION_DAYS;
  const token = await signSession({ uid: u.id, email: u.email, name: u.name, role: u.role }, days);
  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(body.remember === false ? {} : { maxAge: days * 86400 }),
  });
  return res;
}
