import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Role, type Session } from "./session";
import { findById } from "./users";

/** The signed-in user, checked against the users table (a deleted user or changed role takes effect at once). */
export async function sessionFrom(token: string | undefined): Promise<Session | null> {
  const s = await verifySession(token);
  if (!s) return null;
  const u = await findById(s.uid).catch(() => null);
  if (!u || u.email !== s.email) return null;
  return { ...s, name: u.name, role: u.role };
}

export async function currentUser(): Promise<Session | null> {
  const jar = await cookies();
  return sessionFrom(jar.get(SESSION_COOKIE)?.value);
}

const tokenOk = (req: Request) => {
  const token = process.env.ADMIN_TOKEN;
  return !!token && req.headers.get("x-admin-token") === token;
};

/** Write actions need a signed-in user with one of these roles (or the ADMIN_TOKEN header, for scripts). */
export async function requireRole(req: Request, roles: Role[]): Promise<NextResponse | null> {
  if (tokenOk(req)) return null;
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const s = await sessionFrom(m ? decodeURIComponent(m[1]) : undefined);
  if (!s) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!roles.includes(s.role)) return NextResponse.json({ error: "Only a system admin can do this." }, { status: 403 });
  return null;
}

export const requireAdmin = (req: Request) => requireRole(req, ["admin"]);
export const requireMember = (req: Request) => requireRole(req, ["admin", "marketing"]);
