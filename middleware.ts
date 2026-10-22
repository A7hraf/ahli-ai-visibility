import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Everything sits behind sign-in except the login page itself, the sign-in API and the weekly cron (own secret).
const OPEN = ["/login", "/api/auth/login", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const token = process.env.ADMIN_TOKEN;
  if (pathname.startsWith("/api/") && token && req.headers.get("x-admin-token") === token) return NextResponse.next();
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (s) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // skip Next internals and files with an extension (logo, favicon)
  matcher: ["/((?!_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
