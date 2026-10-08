import { NextResponse } from "next/server";
import { z } from "zod";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PERSONAS, PRODUCTS } from "@/lib/config";

const Body = z.object({
  text: z.string().trim().min(5).max(400),
  lang: z.enum(["en", "ar"]),
  product: z.enum(PRODUCTS),
  persona: z.enum(PERSONAS),
});

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a question of at least 5 characters and choose its language and product." }, { status: 400 });
  const { text, lang, product, persona } = parsed.data;
  await run("INSERT INTO prompts (text, lang, product, persona) VALUES (?, ?, ?, ?)", [text, lang, product, persona]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await run("UPDATE prompts SET active = ? WHERE id = ?", [b.active ? 1 : 0, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await run("DELETE FROM prompts WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
