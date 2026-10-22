import { NextResponse } from "next/server";
import { currentUser, requireAdmin } from "@/lib/auth";
import { adminCount, createUser, deleteUser, findByEmail, findById, listUsers, updateUser, validEmail, validPassword, ROLES } from "@/lib/users";
import type { Role } from "@/lib/session";

export const dynamic = "force-dynamic";

const isRole = (r: unknown): r is Role => ROLES.includes(r as Role);

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ users: await listUsers() });
}

// add an account
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as { email?: string; name?: string; role?: string; password?: string };
  if (!validEmail(b.email)) return NextResponse.json({ error: "email" }, { status: 400 });
  if (!b.name?.trim()) return NextResponse.json({ error: "name" }, { status: 400 });
  if (!isRole(b.role)) return NextResponse.json({ error: "role" }, { status: 400 });
  if (!validPassword(b.password)) return NextResponse.json({ error: "password" }, { status: 400 });
  if (await findByEmail(b.email)) return NextResponse.json({ error: "exists" }, { status: 409 });
  await createUser({ email: b.email, name: b.name, role: b.role, password: b.password });
  return NextResponse.json({ users: await listUsers() });
}

// change name, role or reset password
export async function PATCH(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as { id?: number; name?: string; role?: string; password?: string };
  const u = b.id ? await findById(Number(b.id)) : null;
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (b.role !== undefined && !isRole(b.role)) return NextResponse.json({ error: "role" }, { status: 400 });
  if (b.password !== undefined && !validPassword(b.password)) return NextResponse.json({ error: "password" }, { status: 400 });
  if (b.role === "marketing" && u.role === "admin" && (await adminCount()) <= 1) return NextResponse.json({ error: "last_admin" }, { status: 400 });
  await updateUser(u.id, { name: b.name?.trim() || undefined, role: b.role as Role | undefined, password: b.password });
  return NextResponse.json({ users: await listUsers() });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  const u = id ? await findById(id) : null;
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const me = await currentUser();
  if (me?.uid === u.id) return NextResponse.json({ error: "self" }, { status: 400 });
  if (u.role === "admin" && (await adminCount()) <= 1) return NextResponse.json({ error: "last_admin" }, { status: 400 });
  await deleteUser(u.id);
  return NextResponse.json({ users: await listUsers() });
}
