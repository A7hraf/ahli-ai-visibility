"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function headers(): Record<string, string> {
  try {
    return { "content-type": "application/json", "x-admin-token": window.localStorage.getItem("adminToken") ?? "" };
  } catch {
    return { "content-type": "application/json" };
  }
}

export function FactEditor({ id, value, unit, labels }: { id: number; value: string; unit: string; labels: { edit: string; save: string } }) {
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
          <input id={`fact-${id}`} value={v} onChange={(e) => setV(e.target.value)} className="num w-32 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand" />
          <span className="text-sm text-ink-muted">{unit}</span>
          <button onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">{labels.save}</button>
        </>
      ) : (
        <>
          <span className="num font-display text-xl font-semibold text-navy">{value}</span>
          <span className="text-sm text-ink-muted">{unit}</span>
          <button onClick={() => setEditing(true)} className="ms-auto rounded-lg border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-brand hover:text-brand">{labels.edit}</button>
        </>
      )}
      {err && <span className="text-xs text-bad">{err}</span>}
    </div>
  );
}

export function AlertToggle({ id, status, labels }: { id: number; status: string; labels: { resolve: string; reopen: string; resolved: string } }) {
  const router = useRouter();
  async function flip() {
    await fetch("/api/alerts", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, status: status === "open" ? "resolved" : "open" }) });
    router.refresh();
  }
  return (
    <button onClick={flip} className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium ${status === "open" ? "bg-good-soft text-good hover:bg-good hover:text-white" : "border border-line text-ink-muted hover:text-brand"}`}>
      {status === "open" ? labels.resolve : labels.reopen}
    </button>
  );
}
