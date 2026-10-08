"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export default function SiteCheckButton({ labels }: { labels: { run: string; running: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    let token = "";
    try {
      token = window.localStorage.getItem("adminToken") ?? "";
    } catch {}
    await fetch("/api/site-check", { method: "POST", headers: { "x-admin-token": token } });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={go} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-brand bg-white px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50 disabled:opacity-50">
      <Icon name="globe" size={15} /> {busy ? labels.running : labels.run}
    </button>
  );
}
