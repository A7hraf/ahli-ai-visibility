"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UIText } from "@/lib/ui-text";
import { DEFAULT_PERIOD, useFilters } from "./viz/filters";
import { Segmented } from "./viz/core";
import RunButton from "./RunButton";
import { Icon } from "./Icon";

type Props = {
  lang: "en" | "ar";
  ui: UIText;
  mode: "demo" | "live" | "hybrid";
  real: string[];
  simulated: string[];
  realLabel: string;
  simLabel: string;
  updated: string | null;
  run: { run: string; running: string; done: string; failed: string };
  canRun: boolean;
  engines: { id: string; label: string; color: string }[];
  products: string[];
  personas: string[];
};

// pages whose numbers follow the period / assistant filters in this bar
const FILTERED = ["/", "/competitors", "/queries", "/sources"];

const TITLES: [string, keyof UIText["nav"]][] = [
  ["/competitors", "competitors"],
  ["/compare", "competitors"],
  ["/queries", "queries"],
  ["/prompts", "queries"],
  ["/sources", "sources"],
  ["/plan", "plan"],
  ["/accuracy", "accuracy"],
  ["/site", "site"],
  ["/ask", "ask"],
  ["/answers", "responses"],
  ["/how", "how"],
  ["/settings", "settings"],
];

export default function TopBar(p: Props) {
  const path = usePathname();
  const filtered = FILTERED.includes(path);
  const title = p.ui.nav[TITLES.find(([h]) => path.startsWith(h))?.[1] ?? "overview"];
  // reading progress along the bottom edge
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      setProg(h.scrollHeight > h.clientHeight ? h.scrollTop / (h.scrollHeight - h.clientHeight) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="relative z-30 bg-canvas/[0.92] backdrop-blur-md lg:sticky lg:top-0">
      <span className="absolute bottom-0 start-0 h-[2px] bg-gold transition-[width] duration-150" style={{ width: `${prog * 100}%` }} aria-hidden="true" />
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3.5 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-[17px] font-bold leading-tight text-ink">{title}</p>
            {p.updated && (
              <p className="text-[12px] text-ink-muted">
                {p.ui.status.updated}: {new Date(p.updated + "T00:00:00Z").toLocaleDateString(p.lang === "ar" ? "ar-OM" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
              </p>
            )}
          </div>
          <div className="ms-auto flex items-center gap-2">
            <StatusChip {...p} />
            <LangButton lang={p.lang} />
            {p.canRun && <RunButton labels={p.run} disabled={p.mode === "demo"} compact />}
          </div>
        </div>
        {filtered && <HeaderFilters {...p} />}
      </div>
    </header>
  );
}

function StatusChip({ mode, ui, real, simulated, realLabel, simLabel }: Props) {
  const dot = mode === "live" ? "bg-good" : "bg-gold";
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[4px] bg-gold-50 px-3 py-2 text-[13px] font-bold text-gold-700 transition hover:bg-gold-100">
        <span className="relative flex h-2 w-2">
          {mode !== "demo" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
        </span>
        {ui.status[mode]}
      </summary>
      <div className="absolute end-0 top-full z-40 mt-2 w-72 rounded-[4px] border border-line bg-white p-4 text-[13px] shadow-pop">
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
  );
}

function LangButton({ lang }: { lang: "en" | "ar" }) {
  const router = useRouter();
  function switchLang() {
    document.cookie = `lang=${lang === "ar" ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <button onClick={switchLang} className="flex items-center gap-2 rounded-[4px] border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-ink transition hover:bg-slate-100" aria-label="Switch language">
      {lang === "ar" ? "English" : "العربية"}
      <Icon name="translate" size={15} />
    </button>
  );
}

function HeaderFilters({ ui, engines, products, personas }: Props) {
  const { f, set } = useFilters();
  const chip = (on: boolean) => `flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[13px] font-medium transition ${on ? "border-navy bg-navy text-white" : "border-line bg-white text-ink-2 hover:border-line-2 hover:bg-slate-100"}`;
  const sel = (key: "mk" | "pl" | "seg", label: string, opts: { value: string; label: string }[]) => (
    <label className={`relative flex w-full items-center rounded-[4px] border py-2 pe-7 ps-3 text-[13px] transition hover:border-line-2 ${f[key] ? "border-navy bg-navy/[0.05]" : "border-line bg-white"}`}>
      <select value={f[key] ?? ""} onChange={(e) => set({ [key]: e.target.value || undefined })} className="w-full cursor-pointer appearance-none bg-transparent font-medium text-ink outline-none" aria-label={label}>
        <option value="">{`${label}: ${ui.f.all}`}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute end-2 text-ink-soft" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
  const extra = (["mk", "pl", "seg"] as const).some((k) => f[k]);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] text-ink-muted">{ui.hdr.period}</span>
        <Segmented
          value={f.pd ?? DEFAULT_PERIOD}
          onChange={(v) => set({ pd: v === DEFAULT_PERIOD ? undefined : v })}
          options={[
            { value: "1", label: ui.f.week },
            { value: "4", label: ui.f.month },
            { value: "all", label: ui.f.allTime },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="me-0.5 text-[12.5px] text-ink-muted">{ui.hdr.assistant}</span>
        <button onClick={() => set({ ch: undefined })} className={chip(!f.ch)} aria-pressed={!f.ch}>
          <span className="h-2 w-2 rounded-full bg-gold" />
          {ui.f.all}
        </button>
        {engines.map((e) => (
          <button key={e.id} onClick={() => set({ ch: f.ch === e.id ? undefined : e.id })} className={chip(f.ch === e.id)} aria-pressed={f.ch === e.id}>
            {e.label}
            <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
          </button>
        ))}
      </div>
      <details className="group relative">
        <summary className={`flex cursor-pointer list-none items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[13px] font-medium transition hover:bg-slate-100 ${extra ? "border-navy text-navy" : "border-line bg-white text-ink-2"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {ui.hdr.more}
          {extra && <span className="num flex h-4 min-w-4 items-center justify-center rounded-[3px] bg-navy px-1 text-[10.5px] font-bold text-white">{(["mk", "pl", "seg"] as const).filter((k) => f[k]).length}</span>}
        </summary>
        <div className="absolute end-0 top-full z-40 mt-2 flex w-64 flex-col gap-2 rounded-[4px] border border-line bg-white p-3 shadow-pop">
          {sel("mk", ui.f.market, [
            { value: "ar", label: ui.marketsShort.ar },
            { value: "en", label: ui.marketsShort.en },
          ])}
          {sel("pl", ui.f.product, products.map((x) => ({ value: x, label: ui.products[x as keyof UIText["products"]] ?? x })))}
          {sel("seg", ui.f.segment, personas.map((x) => ({ value: x, label: ui.personas[x as keyof UIText["personas"]] ?? x })))}
          {extra && (
            <button onClick={() => set({ mk: undefined, pl: undefined, seg: undefined })} className="rounded-[4px] px-2.5 py-1.5 text-[12.5px] font-bold text-bad transition hover:bg-bad-soft">
              {ui.f.clear}
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
