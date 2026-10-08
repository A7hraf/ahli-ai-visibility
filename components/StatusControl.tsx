"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type S = "todo" | "doing" | "done";

export default function StatusControl({ actionKey, status, labels }: { actionKey: string; status: S; labels: Record<S, string> & { error: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function set(s: S) {
    if (s === status) return;
    setBusy(true);
    setErr("");
    let token = "";
    try {
      token = window.localStorage.getItem("adminToken") ?? "";
    } catch {}
    const res = await fetch("/api/actions", { method: "PATCH", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify({ key: actionKey, status: s }) });
    setBusy(false);
    if (!res.ok) {
      setErr(labels.error);
      return;
    }
    router.refresh();
  }
  const style: Record<S, string> = {
    todo: "bg-slate-100 text-ink-muted ring-slate-300",
    doing: "bg-gold-50 text-gold-700 ring-gold",
    done: "bg-good-soft text-good ring-good",
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
        {(["todo", "doing", "done"] as S[]).map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={status === s}
            disabled={busy}
            onClick={() => set(s)}
            className={`rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition ${status === s ? `${style[s]} ring-1` : "text-ink-muted hover:bg-white"}`}
          >
            {labels[s]}
          </button>
        ))}
      </div>
      {err && <span className="text-xs text-bad">{err}</span>}
    </div>
  );
}
