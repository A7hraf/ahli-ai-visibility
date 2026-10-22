import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { all, run } from "./db";
import type { Role } from "./session";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  last_login: string | null;
}

export const ROLES: Role[] = ["admin", "marketing"];

// The two starting accounts. Set ADMIN_PASSWORD / MARKETING_PASSWORD (and the emails) in the environment;
// the defaults are only for a first look and should be changed in Settings straight away.
export function seedAccounts() {
  return [
    {
      email: (process.env.ADMIN_EMAIL || "admin@ahlibank.om").toLowerCase(),
      name: process.env.ADMIN_NAME || "مسؤول النظام",
      role: "admin" as Role,
      password: process.env.ADMIN_PASSWORD || "Admin@2026",
    },
    {
      email: (process.env.MARKETING_EMAIL || "marketing@ahlibank.om").toLowerCase(),
      name: process.env.MARKETING_NAME || "فريق التسويق الرقمي",
      role: "marketing" as Role,
      password: process.env.MARKETING_PASSWORD || "Marketing@2026",
    },
  ];
}

export const usingDefaultPasswords = () => !process.env.ADMIN_PASSWORD || !process.env.MARKETING_PASSWORD;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32);
  return `s1$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [v, salt, key] = stored.split("$");
  if (v !== "s1" || !salt || !key) return false;
  const want = Buffer.from(key, "base64");
  const got = await scrypt(pw, Buffer.from(salt, "base64"), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}

export const validPassword = (pw: unknown): pw is string => typeof pw === "string" && pw.length >= 8 && pw.length <= 200;
export const validEmail = (e: unknown): e is string => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

export async function listUsers(): Promise<User[]> {
  return all<User>("SELECT id, email, name, role, created_at, last_login FROM users ORDER BY role, id");
}

export async function findByEmail(email: string) {
  return (await all<User & { pass_hash: string }>("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]))[0] ?? null;
}

export async function findById(id: number) {
  return (await all<User & { pass_hash: string }>("SELECT * FROM users WHERE id = ?", [id]))[0] ?? null;
}

export async function createUser(u: { email: string; name: string; role: Role; password: string }) {
  await run("INSERT INTO users (email, name, role, pass_hash) VALUES (?, ?, ?, ?)", [u.email.trim().toLowerCase(), u.name.trim(), u.role, await hashPassword(u.password)]);
}

export async function updateUser(id: number, patch: { name?: string; role?: Role; password?: string }) {
  if (patch.name !== undefined) await run("UPDATE users SET name = ? WHERE id = ?", [patch.name.trim(), id]);
  if (patch.role !== undefined) await run("UPDATE users SET role = ? WHERE id = ?", [patch.role, id]);
  if (patch.password !== undefined) await run("UPDATE users SET pass_hash = ? WHERE id = ?", [await hashPassword(patch.password), id]);
}

export async function deleteUser(id: number) {
  await run("DELETE FROM users WHERE id = ?", [id]);
}

export async function adminCount() {
  return Number((await all<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"))[0]?.n ?? 0);
}

export async function touchLogin(id: number) {
  await run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [id]);
}
