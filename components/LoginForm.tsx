"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UIText } from "@/lib/ui-text";

export default function LoginForm({ lang, a, next }: { lang: "en" | "ar"; a: UIText["auth"]; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: pw, remember }) });
      if (r.ok) {
        // full load: the app shell (menu, header) only renders for signed-in users
        window.location.assign(next);
        return;
      }
      setErr(r.status === 429 ? a.tooMany : a.invalid);
    } catch {
      setErr(a.invalid);
    }
    setBusy(false);
  }

  function switchLang() {
    document.cookie = `lang=${lang === "ar" ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-8 px-6 py-8 sm:px-12 lg:py-11">
      <div className="flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-11 w-auto" />
        <button onClick={switchLang} className="flex items-center gap-2 rounded-[4px] border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-ink transition hover:bg-slate-100">
          {lang === "ar" ? "English" : "العربية"}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <form onSubmit={submit} className="rise flex w-full max-w-[420px] flex-col gap-5 rounded-[4px] border border-line bg-white p-7 shadow-card sm:p-8">
          <div>
            <h2 className="font-display text-[26px] leading-tight text-ink">{a.title}</h2>
            <p className="mt-1.5 text-[14px] text-ink-muted">{a.sub}</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-2">{a.email}</span>
            <input type="email" required autoComplete="username" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="name@ahlibank.om" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-2">{a.password}</span>
            <span className="relative" dir="ltr">
              <input type={show ? "text" : "password"} required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="field pe-11" />
              <button type="button" onClick={() => setShow(!show)} aria-label={a.show} aria-pressed={show} className="absolute inset-y-0 right-1 flex items-center px-2 text-ink-soft transition hover:text-ink">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  {show ? <path d="M3 3l18 18" /> : <circle cx="12" cy="12" r="3" />}
                </svg>
              </button>
            </span>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 text-ink-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-navy" />
              {a.remember}
            </label>
            <button type="button" onClick={() => setForgot(!forgot)} className="font-bold text-navy hover:underline">
              {a.forgotLink}
            </button>
          </div>
          {forgot && <p className="rise rounded-[4px] bg-slate-100 px-3 py-2 text-[12.5px] text-ink-2">{a.forgot}</p>}
          {err && (
            <p role="alert" className="rise rounded-[4px] border border-bad/20 bg-bad-soft px-3 py-2 text-[13px] font-medium text-bad">
              {err}
            </p>
          )}
          <button disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-[4px] bg-navy text-[15px] font-bold text-white transition hover:bg-navy-700 active:scale-[0.99] disabled:opacity-70">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {busy ? a.signingIn : a.signin}
          </button>
        </form>
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-[12.5px] text-ink-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        {a.internal}
      </p>
    </section>
  );
}
