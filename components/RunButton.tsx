"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export default function RunButton({ labels, disabled, disabledHint }: { labels: { run: string; running: string; done: string; failed: string }; disabled?: boolean; disabledHint?: string }) {
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
      setState("done");
      setMsg(`${j.total - j.failed}/${j.total}`);
      router.refresh();
    } catch (e) {
      setState("failed");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={go}
        disabled={disabled || state === "running"}
        title={disabled ? disabledHint : undefined}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="play" size={15} />
        {state === "running" ? labels.running : labels.run}
      </button>
      {state === "done" && <span className="text-xs text-good">{labels.done} · {msg}</span>}
      {state === "failed" && <span className="max-w-xs text-xs text-bad">{labels.failed}: {msg}</span>}
      {disabled && disabledHint && <span className="max-w-xs text-end text-xs text-ink-soft">{disabledHint}</span>}
    </div>
  );
}
