"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function headers(): Record<string, string> {
  return { "content-type": "application/json" };
}

export function FactEditor({ id, value, unit, labels, canEdit = true }: { id: number; value: string; unit: string; labels: { edit: string; save: string }; canEdit?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [err, setErr] = useState("");
  async function save() {
    const res = await fetch("/api/facts", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, value: v }) });
    if (!res.ok) return setErr((await res.json()).error);
    setEditing(false);
    setErr("");
    router.refresh();
  }
  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input id={`fact-${id}`} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} autoFocus className="field num !h-9 !w-36" />
          <span className="text-sm text-ink-muted">{unit}</span>
          <button onClick={save} className="rounded-[4px] bg-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-navy-700">{labels.save}</button>
        </>
      ) : (
        <>
          <span className="num font-display text-[22px] text-navy">{value}</span>
          <span className="text-sm text-ink-muted">{unit}</span>
          {canEdit && <button onClick={() => setEditing(true)} className="ms-auto rounded-[4px] border border-line px-2.5 py-1 text-xs font-bold text-ink-2 transition hover:bg-slate-100 hover:text-navy">{labels.edit}</button>}
        </>
      )}
      {err && <span className="text-xs text-bad">{err}</span>}
    </div>
  );
}

export function AlertToggle({ id, status, labels }: { id: number; status: string; labels: { resolve: string; reopen: string; resolved: string } }) {
  const router = useRouter();
  const [cur, setCur] = useState(status);
  const [busy, setBusy] = useState(false);
  async function flip() {
    const next = cur === "open" ? "resolved" : "open";
    setCur(next);
    setBusy(true);
    const res = await fetch("/api/alerts", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, status: next }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) setCur(cur);
    router.refresh();
  }
  return (
    <button onClick={flip} disabled={busy} className={`whitespace-nowrap rounded-[4px] px-4 py-2 text-[12.5px] font-bold transition active:scale-95 ${cur === "open" ? "bg-navy text-white hover:bg-navy-700" : "border border-line bg-white text-ink-muted hover:text-navy"}`}>
      {cur === "open" ? labels.resolve : labels.reopen}
    </button>
  );
}
