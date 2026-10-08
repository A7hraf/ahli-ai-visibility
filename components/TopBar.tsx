"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RunButton from "./RunButton";

type Props = {
  lang: "en" | "ar";
  mode: "demo" | "live" | "hybrid";
  modeLabel: string;
  real: string[];
  simulated: string[];
  realLabel: string;
  simLabel: string;
  updated: string | null;
  updatedLabel: string;
  run: { run: string; running: string; done: string; failed: string };
};

export default function TopBar({ lang, mode, modeLabel, real, simulated, realLabel, simLabel, updated, updatedLabel, run }: Props) {
  const router = useRouter();
  // reading progress + a slightly stronger bar once the page is scrolled
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      setP(h.scrollHeight > h.clientHeight ? h.scrollTop / (h.scrollHeight - h.clientHeight) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  function switchLang() {
    document.cookie = `lang=${lang === "ar" ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const dot = mode === "live" ? "bg-good" : mode === "hybrid" ? "bg-gold" : "bg-gold-400";
  return (
    <div className="sticky top-[53px] z-30 border-b border-line bg-white/90 backdrop-blur-md lg:top-0">
      <span className="absolute -bottom-px start-0 h-[2px] bg-gold transition-[width] duration-150" style={{ width: `${p * 100}%` }} aria-hidden="true" />
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-8">
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-slate-50">
            <span className="relative flex h-2 w-2">
              {mode !== "demo" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
            </span>
            {modeLabel}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-soft transition group-open:rotate-180" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="absolute start-0 top-full z-40 mt-2 w-72 rounded-xl border border-line bg-white p-4 text-[13px] shadow-pop">
            {real.length > 0 && (
              <>
                <p className="mb-1.5 font-semibold text-good">{realLabel}</p>
                <p className="mb-3 text-ink">{real.join(" · ")}</p>
              </>
            )}
            {simulated.length > 0 && (
              <>
                <p className="mb-1.5 font-semibold text-gold-700">{simLabel}</p>
                <p className="text-ink">{simulated.join(" · ")}</p>
              </>
            )}
          </div>
        </details>
        {updated && (
          <span className="hidden text-[12.5px] text-ink-muted sm:inline">
            {updatedLabel}: <b className="font-semibold text-ink">{new Date(updated + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-OM" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</b>
          </span>
        )}
        <div className="ms-auto flex items-center gap-2">
          <RunButton labels={run} disabled={mode === "demo"} compact />
          <button onClick={switchLang} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-ink hover:bg-slate-50" aria-label="Switch language">
            {lang === "ar" ? "EN" : "عربي"}
          </button>
        </div>
      </div>
    </div>
  );
}
