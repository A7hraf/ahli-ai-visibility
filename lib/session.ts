// Signed session cookie. Works in the Edge middleware and in Node route handlers (Web Crypto only).

export type Role = "admin" | "marketing";
export interface Session {
  uid: number;
  email: string;
  name: string;
  role: Role;
  exp: number; // seconds since epoch
}

export const SESSION_COOKIE = "sada_session";
export const SESSION_DAYS = 14;

const enc = new TextEncoder();

// Set SESSION_SECRET in production. Without it the key is derived from the account passwords,
// so it is only as secret as those passwords.
function secret() {
  return (
    process.env.SESSION_SECRET ||
    `sada|${process.env.ADMIN_PASSWORD ?? ""}|${process.env.MARKETING_PASSWORD ?? ""}|${process.env.ADMIN_TOKEN ?? ""}|${process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN ?? ""}`
  );
}

const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signSession(s: Omit<Session, "exp">, days = SESSION_DAYS): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + days * 86400 })));
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = await hmac(body);
  // constant-time compare
  if (want.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (!s.exp || s.exp < Date.now() / 1000) return null;
    if (s.role !== "admin" && s.role !== "marketing") return null;
    return s;
  } catch {
    return null;
  }
}
