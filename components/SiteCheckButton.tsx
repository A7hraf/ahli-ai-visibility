"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export default function SiteCheckButton({ labels }: { labels: { run: string; running: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await fetch("/api/site-check", { method: "POST" });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={go} disabled={busy} className="inline-flex items-center gap-2 rounded-[4px] bg-gold px-5 py-2.5 text-sm font-bold text-navy transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60">
      <span className={busy ? "animate-spin" : ""}><Icon name="globe" size={15} /></span> {busy ? labels.running : labels.run}
    </button>
  );
}
