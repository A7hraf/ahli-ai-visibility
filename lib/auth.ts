import { NextResponse } from "next/server";

/** If ADMIN_TOKEN is set, write actions need the same token in the x-admin-token header. */
export function requireAdmin(req: Request): NextResponse | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return null;
  if (req.headers.get("x-admin-token") === token) return null;
  return NextResponse.json({ error: "Admin token required. Enter it in Settings." }, { status: 401 });
}
