"use client";

import { useState } from "react";
import type { UIText } from "@/lib/ui-text";
import type { Role } from "@/lib/session";
import { Icon } from "./Icon";

type U = { id: number; email: string; name: string; role: Role; created_at: string; last_login: string | null };

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");

/** Admin: add accounts, change roles, reset passwords, delete. */
export function TeamAccounts({ initial, me, ui, lang }: { initial: U[]; me: number; ui: UIText; lang: "en" | "ar" }) {
  const u = ui.users;
  const [users, setUsers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "marketing" as Role, password: "" });
  const [reset, setReset] = useState<{ id: number; pw: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(method: string, body?: unknown, query = "") {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/users${query}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ ok: false, text: u.errors[j.error] ?? u.errors.failed });
        return false;
      }
      if (j.users) setUsers(j.users);
      return true;
    } finally {
      setBusy(false);
    }
  }

  const fmt = (d: string | null) => (d ? new Date(d.replace(" ", "T") + "Z").toLocaleString(lang === "ar" ? "ar-OM" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : u.never);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["admin", "marketing"] as const).map((r) => (
          <div key={r} className="rounded-[4px] border border-line bg-paper p-3.5">
            <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <span className={`h-2.5 w-2.5 rounded-full ${r === "admin" ? "bg-navy" : "bg-gold"}`} />
              {ui.auth.roles[r]}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{u.perms[r]}</p>
          </div>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-[4px] border border-line">
        {users.map((x) => (
          <li key={x.id} className="flex flex-col gap-3 p-3.5 transition hover:bg-paper">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${x.role === "admin" ? "bg-navy text-white" : "bg-gold text-navy"}`}>{initials(x.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-ink">
                  {x.name}
                  {x.id === me && <span className="ms-2 rounded-[3px] bg-slate-200 px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">{u.you}</span>}
                </p>
                <p dir="ltr" className="truncate text-[12px] text-ink-muted" style={{ textAlign: lang === "ar" ? "right" : "left" }}>
                  {x.email}
                </p>
              </div>
              <span className="hidden text-[11.5px] text-ink-soft md:block">
                {u.lastLogin}: {fmt(x.last_login)}
              </span>
              <select
                value={x.role}
                disabled={busy}
                onChange={(e) => call("PATCH", { id: x.id, role: e.target.value })}
                aria-label={u.role}
                className="rounded-[4px] border border-line bg-white px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none transition hover:border-line-2 focus:border-navy"
              >
                <option value="admin">{ui.auth.roles.admin}</option>
                <option value="marketing">{ui.auth.roles.marketing}</option>
              </select>
              <button onClick={() => setReset(reset?.id === x.id ? null : { id: x.id, pw: "" })} className="rounded-[4px] border border-line px-2.5 py-1.5 text-[12.5px] font-bold text-ink-2 transition hover:bg-slate-100">
                {u.reset}
              </button>
              {x.id !== me && (
                <button
                  onClick={() => window.confirm(u.removeAsk) && call("DELETE", undefined, `?id=${x.id}`)}
                  aria-label={u.remove}
                  title={u.remove}
                  className="rounded-[4px] p-2 text-ink-soft transition hover:bg-bad-soft hover:text-bad"
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
            {reset?.id === x.id && (
              <form
                className="rise flex flex-wrap items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await call("PATCH", { id: x.id, password: reset.pw })) {
                    setReset(null);
                    setMsg({ ok: true, text: u.changed });
                  }
                }}
              >
                <input type="password" autoComplete="new-password" placeholder={u.newPassword} value={reset.pw} onChange={(e) => setReset({ id: x.id, pw: e.target.value })} className="field !h-9 max-w-xs" />
                <button disabled={busy} className="rounded-[4px] bg-navy px-3.5 py-2 text-[12.5px] font-bold text-white transition hover:bg-navy-700">
                  {u.save}
                </button>
                <button type="button" onClick={() => setReset(null)} className="px-2 text-[12.5px] text-ink-muted hover:text-ink">
                  {u.cancel}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {msg && <p className={`rise rounded-[4px] px-3 py-2 text-[13px] font-medium ${msg.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}

      {adding ? (
        <form
          className="rise grid gap-3 rounded-[4px] border border-line bg-paper p-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("POST", form)) {
              setForm({ name: "", email: "", role: "marketing", password: "" });
              setAdding(false);
            }
          }}
        >
          <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-ink-2">
            {u.name}
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field !h-10" />
          </label>
          <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-ink-2">
            {u.email}
            <input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field !h-10" placeholder="name@ahlibank.om" />
          </label>
          <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-ink-2">
            {u.role}
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="field !h-10">
              <option value="marketing">{ui.auth.roles.marketing}</option>
              <option value="admin">{ui.auth.roles.admin}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-ink-2">
            {u.password}
            <input required type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field !h-10" />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className="rounded-[4px] bg-navy px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-navy-700">
              {u.create}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-[4px] px-3 py-2.5 text-[13.5px] text-ink-muted hover:text-ink">
              {u.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 self-start rounded-[4px] border border-dashed border-line-2 px-4 py-2.5 text-[13.5px] font-bold text-navy transition hover:border-navy hover:bg-white">
          <Icon name="plus" size={16} />
          {u.add}
        </button>
      )}
    </div>
  );
}

/** Anyone: change my own password. */
export function MyPassword({ ui }: { ui: UIText }) {
  const u = ui.users;
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const r = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ current: cur, next }) }).catch(() => null);
        const j = r ? await r.json().catch(() => ({})) : {};
        setBusy(false);
        if (r?.ok) {
          setCur("");
          setNext("");
          setMsg({ ok: true, text: u.changed });
        } else setMsg({ ok: false, text: u.errors[j.error] ?? u.errors.failed });
      }}
    >
      <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-ink-2">
        {u.current}
        <input required type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} className="field !h-10" />
      </label>
      <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-ink-2">
        {u.newPassword}
        <input required type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="field !h-10" />
      </label>
      {msg && <p className={`rise rounded-[4px] px-3 py-2 text-[13px] font-medium ${msg.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}
      <button disabled={busy} className="self-start rounded-[4px] bg-navy px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-navy-700 disabled:opacity-60">
        {u.change}
      </button>
    </form>
  );
}
