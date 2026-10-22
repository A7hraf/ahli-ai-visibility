"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type S = "todo" | "doing" | "done";

export default function StatusControl({ actionKey, status, labels }: { actionKey: string; status: S; labels: Record<S, string> & { error: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cur, setCur] = useState(status);
  useEffect(() => setCur(status), [status]);
  async function set(s: S) {
    if (s === cur) return;
    const was = cur;
    setCur(s); // show the change straight away
    setBusy(true);
    setErr("");
    const res = await fetch("/api/actions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: actionKey, status: s }) });
    setBusy(false);
    if (!res.ok) {
      setCur(was);
      setErr(labels.error);
      return;
    }
    router.refresh();
  }
  const style: Record<S, string> = {
    todo: "bg-white text-ink ring-line-2",
    doing: "bg-navy text-white ring-navy",
    done: "bg-gold text-navy ring-gold",
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-[4px] border border-line bg-slate-100 p-1">
        {(["todo", "doing", "done"] as S[]).map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={cur === s}
            disabled={busy}
            onClick={() => set(s)}
            className={`rounded-[3px] px-2 py-2 text-[13px] font-bold transition ${cur === s ? `${style[s]} ring-1` : "text-ink-muted hover:bg-white"}`}
          >
            {labels[s]}
          </button>
        ))}
      </div>
      {err && <span className="text-xs text-bad">{err}</span>}
    </div>
  );
}
