"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Dataset, Filters } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { Segmented } from "./core";

const KEYS = ["ch", "mk", "pl", "seg", "pd"] as const;

export const DEFAULT_PERIOD = "4";

/** Dashboard filters live in the URL, so a filtered view can be shared or bookmarked. */
export function useFilters(defaultPeriod = DEFAULT_PERIOD) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const f: Filters = useMemo(() => {
    const o: Filters = {};
    for (const k of KEYS) {
      const v = sp.get(k);
      if (v) o[k] = v;
    }
    if (!o.pd) o.pd = defaultPeriod;
    return o;
  }, [sp, defaultPeriod]);
  const set = useCallback(
    (patch: Partial<Filters>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [sp, router, path],
  );
  return { f, set };
}

export function FilterBar({ ds, ui, f, set, period = true, hide = [] }: { ds: Dataset; ui: UIText; f: Filters; set: (p: Partial<Filters>) => void; period?: boolean; hide?: ("ch" | "mk" | "pl" | "seg")[] }) {
  const products = [...new Set(ds.prompts.map((p) => p.product))];
  const personas = [...new Set(ds.prompts.map((p) => p.persona))];
  const active = (["ch", "mk", "pl", "seg"] as const).filter((k) => f[k]);
  const sel = (key: "ch" | "mk" | "pl" | "seg", label: string, opts: { value: string; label: string }[]) =>
    hide.includes(key) ? null : (
      <label className={`relative flex items-center gap-2 rounded-lg border bg-white py-1.5 pe-8 ps-3 text-[13px] transition hover:border-slate-300 ${f[key] ? "border-navy bg-navy/[0.04]" : "border-line"}`}>
        <select value={f[key] ?? ""} onChange={(e) => set({ [key]: e.target.value || undefined })} className="cursor-pointer appearance-none bg-transparent font-semibold text-ink outline-none">
          <option value="">{`${label}: ${ui.f.all}`}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute end-2.5 text-ink-soft" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </label>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-card">
      {period && (
        <Segmented
          value={f.pd ?? DEFAULT_PERIOD}
          onChange={(v) => set({ pd: v === DEFAULT_PERIOD ? undefined : v })}
          options={[
            { value: "1", label: ui.f.week },
            { value: "4", label: ui.f.month },
            { value: "all", label: ui.f.allTime },
          ]}
        />
      )}
      {sel("ch", ui.f.channel, ds.engines.map((e) => ({ value: e.id, label: e.label })))}
      {sel("mk", ui.f.market, [
        { value: "ar", label: ui.markets.ar },
        { value: "en", label: ui.markets.en },
      ])}
      {sel("pl", ui.f.product, products.map((p) => ({ value: p, label: ui.products[p as keyof UIText["products"]] ?? p })))}
      {sel("seg", ui.f.segment, personas.map((p) => ({ value: p, label: ui.personas[p as keyof UIText["personas"]] ?? p })))}
      {active.length > 0 && (
        <button onClick={() => set({ ch: undefined, mk: undefined, pl: undefined, seg: undefined })} className="rounded-lg px-3 py-1.5 text-[13px] font-bold text-brand hover:bg-brand-50">
          {ui.f.clear}
        </button>
      )}
    </div>
  );
}
