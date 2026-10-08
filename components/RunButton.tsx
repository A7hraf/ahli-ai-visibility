"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export default function RunButton({ labels, disabled, disabledHint, compact = false }: { labels: { run: string; running: string; done: string; failed: string }; disabled?: boolean; disabledHint?: string; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [msg, setMsg] = useState("");

  async function go() {
    setState("running");
    setMsg("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("adminToken") ?? "" : "";
      const res = await fetch("/api/run", { method: "POST", headers: { "x-admin-token": token } });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setState(j.realTotal && !j.realOk ? "failed" : "done");
      setMsg(j.realTotal ? `${j.real.join(", ")}: ${j.realOk}/${j.realTotal}${j.lastError ? ` · ${j.lastError}` : ""}` : `${j.total - j.failed}/${j.total}`);
      router.refresh();
    } catch (e) {
      setState("failed");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className={compact ? "relative" : "flex flex-col items-end gap-1"}>
      <button
        onClick={go}
        disabled={disabled || state === "running"}
        title={disabled ? disabledHint : undefined}
        className={`inline-flex items-center gap-2 rounded-full bg-navy font-semibold text-white transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40 ${compact ? "px-4 py-2 text-[13px]" : "px-5 py-2.5 text-sm shadow-card"}`}
      >
        <Icon name="play" size={compact ? 13 : 15} />
        {state === "running" ? labels.running : labels.run}
      </button>
      {state === "done" && <span className={`text-xs text-good ${compact ? "absolute end-0 top-full mt-1 w-64 rounded-lg bg-white p-2 text-end shadow-pop" : ""}`}>{labels.done} · {msg}</span>}
      {state === "failed" && <span className={`max-w-xs text-xs text-bad ${compact ? "absolute end-0 top-full mt-1 w-72 rounded-lg bg-white p-2 shadow-pop" : ""}`}>{labels.failed}: {msg}</span>}
      {!compact && disabled && disabledHint && <span className="max-w-xs text-end text-xs text-ink-soft">{disabledHint}</span>}
    </div>
  );
}
