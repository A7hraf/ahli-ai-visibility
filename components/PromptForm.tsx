"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

function adminHeaders(): Record<string, string> {
  try {
    return { "content-type": "application/json", "x-admin-token": window.localStorage.getItem("adminToken") ?? "" };
  } catch {
    return { "content-type": "application/json" };
  }
}

const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand-100";

export default function PromptForm({
  labels,
  langs,
  products,
  personas,
  defaultLang,
}: {
  labels: { text: string; lang: string; product: string; persona: string; save: string };
  langs: Record<string, string>;
  products: Record<string, string>;
  personas: Record<string, string>;
  defaultLang: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [lang, setLang] = useState(defaultLang);
  const [product, setProduct] = useState("accounts");
  const [persona, setPersona] = useState("general");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/prompts", { method: "POST", headers: adminHeaders(), body: JSON.stringify({ text, lang, product, persona }) });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json()).error);
      return;
    }
    setText("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-12">
      <label className="flex flex-col gap-1.5 md:col-span-6">
        <span className="text-xs font-medium text-ink-muted">{labels.text}</span>
        <input id="prompt-text" dir="auto" value={text} onChange={(e) => setText(e.target.value)} className={field} placeholder={lang === "ar" ? "مثال: وين أحصل أفضل تمويل سيارة في عمان؟" : "e.g. Where can I get the best car finance in Oman?"} />
      </label>
      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-medium text-ink-muted">{labels.lang}</span>
        <select id="prompt-lang" value={lang} onChange={(e) => setLang(e.target.value)} className={field}>
          {Object.entries(langs).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-medium text-ink-muted">{labels.product}</span>
        <select id="prompt-product" value={product} onChange={(e) => setProduct(e.target.value)} className={field}>
          {Object.entries(products).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-medium text-ink-muted">{labels.persona}</span>
        <select id="prompt-persona" value={persona} onChange={(e) => setPersona(e.target.value)} className={field}>
          {Object.entries(personas).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
      </label>
      <div className="flex items-center gap-3 md:col-span-12">
        <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          <Icon name="plus" size={15} /> {labels.save}
        </button>
        {err && <span className="text-sm text-bad">{err}</span>}
      </div>
    </form>
  );
}

export function PromptRowActions({ id, active, labels }: { id: number; active: boolean; labels: { active: string; delete: string } }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  async function toggle() {
    await fetch("/api/prompts", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ id, active: !active }) });
    router.refresh();
  }
  async function del() {
    await fetch(`/api/prompts?id=${id}`, { method: "DELETE", headers: adminHeaders() });
    router.refresh();
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
        <input id={`active-${id}`} type="checkbox" checked={active} onChange={toggle} className="h-4 w-4 accent-[#0B6298]" />
        {labels.active}
      </label>
      {confirming ? (
        <button onClick={del} className="rounded-lg bg-bad px-2 py-1 text-xs font-medium text-white">{labels.delete}?</button>
      ) : (
        <button onClick={() => setConfirming(true)} className="rounded-lg p-1.5 text-ink-soft hover:bg-bad-soft hover:text-bad" aria-label={labels.delete}>
          <Icon name="trash" size={15} />
        </button>
      )}
    </div>
  );
}
