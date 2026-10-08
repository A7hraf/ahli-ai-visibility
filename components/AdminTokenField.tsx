"use client";

import { useEffect, useState } from "react";

export default function AdminTokenField({ lang }: { lang: string }) {
  const [v, setV] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      setV(window.localStorage.getItem("adminToken") ?? "");
    } catch {}
  }, []);
  function save() {
    try {
      window.localStorage.setItem("adminToken", v);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  }
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-muted">
        {lang === "ar" ? "رمز المسؤول (إذا تم ضبط ADMIN_TOKEN)" : "Admin token (if ADMIN_TOKEN is set)"}
      </span>
      <div className="flex gap-2">
        <input id="admin-token" type="password" value={v} onChange={(e) => setV(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
        <button onClick={save} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">{saved ? "✓" : lang === "ar" ? "حفظ" : "Save"}</button>
      </div>
    </label>
  );
}
