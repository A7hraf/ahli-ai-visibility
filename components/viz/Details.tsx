"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BRAND, COMPETITORS } from "@/lib/config";
import { bankSummary, breakdown, domainStats, matches, periodRuns, ranking, weekly, BRAND_IDX, type Dataset, type DRow, type Filters } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { BankBadge, BarList, Delta, Drawer } from "./core";
import TrendLines from "./TrendLines";

export const GOLD = "#C9A227";
export const NAVY = "#0E2235";
export const GREY = "#A79C88";
export const KIND_COLOR: Record<string, string> = {
  own: GOLD,
  comparison: "#1F86E0",
  news: "#0F9F94",
  community: "#7A4FE0",
  competitor: "#A79C88",
  lookalike: "#DB2B39",
  government: "#E0559A",
  other: "#D3C8B5",
};

export type Sel =
  | { kind: "seg"; title: ReactNode; kicker: string; f?: Filters; run?: number; prompt?: number }
  | { kind: "bank"; b: number; f?: Filters; kicker?: string }
  | { kind: "domain"; i: number };

export function bankLabel(ds: Dataset, ui: UIText, b: number) {
  return b === BRAND_IDX ? ui.overview.ahli : ui.lang === "ar" ? ds.banksAr[b] : ds.banks[b];
}

export const bankColor = (ds: Dataset, b: number) => ds.bankColors[b] ?? GREY;

/** A cited website's colour: its bank's colour when a bank owns it, otherwise its media type. */
export const domainColor = (ds: Dataset, d: { k: string; b?: number }) => (d.b !== undefined ? bankColor(ds, d.b) : KIND_COLOR[d.k]);

/** Website label, with the owning bank's badge. */
export function DomainName({ ds, d }: { ds: Dataset; d: { d: string; b?: number } }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {d.b !== undefined && <BankBadge color={bankColor(ds, d.b)} short={ds.bankShort[d.b]} size={20} />}
      <span dir="ltr" className="truncate">
        {d.d}
      </span>
    </span>
  );
}

/** Bank badge + name, for labels in lists and tables. */
export function BankName({ ds, ui, b, size = 24, bold }: { ds: Dataset; ui: UIText; b: number; size?: number; bold?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <BankBadge color={bankColor(ds, b)} short={ds.bankShort[b]} size={size} brand={b === BRAND_IDX} />
      <span dir="auto" className={`truncate ${bold || b === BRAND_IDX ? "font-semibold text-ink" : ""}`}>
        {bankLabel(ds, ui, b)}
      </span>
    </span>
  );
}

export function useFmtDate(lang: "en" | "ar") {
  return useMemo(() => (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-OM" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), [lang]);
}

/** Ahli and competitor names highlighted inside an answer. */
export function Highlight({ text }: { text: string }) {
  const terms = useMemo(() => {
    const t = [...BRAND.aliases.map((a) => ({ a, brand: true })), ...COMPETITORS.flatMap((c) => c.aliases.filter((x) => x.length > 3).map((a) => ({ a, brand: false })))];
    return t.sort((x, y) => y.a.length - x.a.length);
  }, []);
  const re = useMemo(() => new RegExp(`(${terms.map((t) => t.a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi"), [terms]);
  return (
    <>
      {text.split(re).map((part, i) => {
        const hit = terms.find((t) => t.a.toLowerCase() === part.toLowerCase());
        if (!hit) return <span key={i}>{part}</span>;
        return (
          <mark key={i} className={`rounded px-0.5 font-semibold ${hit.brand ? "bg-gold-100 text-gold-700" : "bg-brand-50 text-brand-600"}`}>
            {part}
          </mark>
        );
      })}
    </>
  );
}

type Sample = { id: number; text: string; prompt: string; lang: string; engine: string; mentioned: number; rank: number | null; simulated: number };

function Samples({ ids, ui, ds }: { ids: number[]; ui: UIText; ds: Dataset }) {
  const [items, setItems] = useState<Sample[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return setItems([]);
    let live = true;
    setItems(null);
    fetch(`/api/answers?ids=${key}`)
      .then((r) => r.json())
      .then((j) => live && setItems(j.answers ?? []))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [key]);
  if (!items) return <p className="animate-pulse text-[13px] text-ink-muted">{ui.drawer.loading}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => {
        const eng = ds.engines.find((e) => e.id === a.engine);
        return (
          <li key={a.id} className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2 py-0.5 font-semibold text-ink">
                <span className="h-2 w-2 rounded-full" style={{ background: eng?.color }} />
                {eng?.label ?? a.engine}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${Number(a.mentioned) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                {Number(a.mentioned) ? `${ui.drawer.named} · #${a.rank}` : ui.drawer.notNamed}
              </span>
              {Number(a.simulated) === 1 && <span className="rounded-full bg-gold-50 px-2 py-0.5 font-medium text-gold-700">{ui.drawer.simulated}</span>}
            </div>
            <p dir="auto" className="mb-2 text-[13px] font-semibold text-ink">
              “{a.prompt}”
            </p>
            <p dir="auto" className="line-clamp-6 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
              <Highlight text={a.text} />
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Mini({ label, value, delta, tone }: { label: string; value: ReactNode; delta?: number | null; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-white p-3">
      <span className="text-[11.5px] text-ink-muted">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <b className="text-[22px] font-semibold leading-none text-ink" style={tone ? { color: tone } : undefined}>
          {value}
        </b>
        <Delta v={delta} size="xs" />
      </span>
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 mt-6 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted first:mt-0">{children}</h3>;
}

function answersHref(f: Filters, run?: number, ds?: Dataset, prompt?: number) {
  const q = new URLSearchParams();
  if (f.ch) q.set("engine", f.ch);
  if (f.mk) q.set("lang", f.mk);
  if (f.pl) q.set("product", f.pl);
  if (f.seg) q.set("persona", f.seg);
  if (run !== undefined && ds) q.set("run", String(ds.runs[run].id));
  if (prompt !== undefined && ds) q.set("prompt", String(ds.prompts[prompt].id));
  const s = q.toString();
  return s ? `/answers?${s}` : "/answers";
}

/** Pick a few answers to show: some that name Ahli, some that leave it out. */
function pickIds(rows: DRow[]) {
  const latest = [...rows].sort((a, b) => b.r - a.r);
  const miss = latest.filter((x) => !x.o.includes(BRAND_IDX)).slice(0, 2);
  const hit = latest.filter((x) => x.o.includes(BRAND_IDX)).slice(0, 2);
  return [...hit, ...miss].slice(0, 4).map((x) => x.id);
}

export default function Details({ ds, ui, lang, base, sel, onClose, onFocus }: { ds: Dataset; ui: UIText; lang: "en" | "ar"; base: Filters; sel: Sel | null; onClose: () => void; onFocus?: (f: Filters) => void }) {
  const fmt = useFmtDate(lang);
  const content = useMemo(() => {
    if (!sel) return null;
    const { cur, prev } = periodRuns(ds, base.pd);
    if (sel.kind === "seg") {
      const f = { ...base, ...sel.f };
      const all = ds.rows.filter((x) => matches(ds, x, f) && (sel.prompt === undefined || x.p === sel.prompt));
      const rows = all.filter((x) => (sel.run !== undefined ? x.r === sel.run : cur.has(x.r)));
      const prevRows = sel.run !== undefined ? all.filter((x) => x.r === sel.run! - 1) : all.filter((x) => prev.has(x.r));
      const s = bankSummary(rows);
      const p = prevRows.length ? bankSummary(prevRows) : null;
      const overall = weekly(ds, ds.rows.filter((x) => matches(ds, x, { pd: base.pd })));
      const tr = weekly(ds, all).map((w, i) => ({ date: w.date, seg: w.n ? w.reach : undefined, all: overall[i].reach }));
      const rk = ranking(ds, rows, []).slice(0, 6);
      const dom = domainStats(ds, rows).domains.slice(0, 5);
      return (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Mini label={ui.kpi.reach} value={`${s.reach}%`} delta={p ? s.reach - p.reach : null} />
            <Mini label={ui.kpi.shortlist} value={`${s.top3}%`} delta={p ? s.top3 - p.top3 : null} />
            <Mini label={ui.kpi.topMind} value={`${s.first}%`} delta={p ? s.first - p.first : null} />
            <Mini label={ui.kpi.sov} value={`${s.sov}%`} delta={p ? s.sov - p.sov : null} />
          </div>
          <p className="mt-2 text-[12px] text-ink-soft">
            {s.n} {ui.drawer.answersAnalysed}
          </p>
          {sel.run === undefined && ds.runs.length > 1 && (
            <>
              <H>{ui.drawer.trend}</H>
              <div className="rounded-xl border border-line bg-white p-3">
                <TrendLines
                  height={170}
                  data={tr}
                  fmtDate={fmt}
                  series={[
                    { key: "all", label: ui.drawer.allAnswers, color: GREY, width: 1.5 },
                    { key: "seg", label: typeof sel.title === "string" ? sel.title : ui.overview.ahli, color: GOLD, width: 2.5, area: true },
                  ]}
                />
              </div>
            </>
          )}
          {!f.ch && (
            <>
              <H>{ui.drawer.byChannel}</H>
              <BarList dense items={breakdown(ds, rows, "engine", ds.engines.map((e) => e.id)).map((r) => ({ key: r.key, label: ds.engines.find((e) => e.id === r.key)!.label, value: r.reach, color: ds.engines.find((e) => e.id === r.key)!.color }))} />
            </>
          )}
          {!f.mk && (
            <>
              <H>{ui.drawer.byMarket}</H>
              <BarList dense items={breakdown(ds, rows, "lang", ["ar", "en"]).map((r) => ({ key: r.key, label: ui.markets[r.key as "ar" | "en"], value: r.reach, color: r.key === "ar" ? "#0B6298" : "#7FB2D9" }))} />
            </>
          )}
          {!f.pl && sel.prompt === undefined && (
            <>
              <H>{ui.drawer.byProduct}</H>
              <BarList dense items={breakdown(ds, rows, "product", Object.keys(ui.products)).map((r) => ({ key: r.key, label: ui.products[r.key as keyof UIText["products"]], value: r.reach, color: "#0B6298" }))} />
            </>
          )}
          <H>{ui.drawer.competitors}</H>
          <BarList dense unit="%" labelWidth="w-44" items={rk.map((r) => ({ key: String(r.b), label: <BankName ds={ds} ui={ui} b={r.b} size={22} />, value: r.reach, strong: r.isBrand, color: bankColor(ds, r.b) }))} />
          {dom.length > 0 && (
            <>
              <H>{ui.drawer.sources}</H>
              <BarList dense labelWidth="w-44" items={dom.map((d) => ({ key: d.d, label: <DomainName ds={ds} d={d} />, sub: ui.media[d.k], value: d.share, color: domainColor(ds, d) }))} />
            </>
          )}
          <H>{ui.drawer.sample}</H>
          <Samples ids={pickIds(rows)} ui={ui} ds={ds} />
          <div className="sticky -bottom-5 -mx-6 -mb-5 mt-6 flex flex-wrap gap-2 border-t border-line bg-canvas/95 px-6 pb-5 pt-4 backdrop-blur">
            <Link href={answersHref(f, sel.run, ds, sel.prompt)} className="inline-flex flex-1 items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-700">
              {ui.drawer.viewAll}
            </Link>
            {onFocus && sel.f && Object.keys(sel.f).length > 0 && (
              <button onClick={() => onFocus(sel.f!)} className="inline-flex flex-1 items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:border-brand hover:text-brand">
                {ui.drawer.focus}
              </button>
            )}
          </div>
        </>
      );
    }

    if (sel.kind === "bank") {
      const all = ds.rows.filter((x) => matches(ds, x, { ...base, ...sel.f }));
      const rows = all.filter((x) => cur.has(x.r));
      const prevRows = all.filter((x) => prev.has(x.r));
      const s = bankSummary(rows, sel.b);
      const a = bankSummary(rows, BRAND_IDX);
      const p = prevRows.length ? bankSummary(prevRows, sel.b) : null;
      const wb = weekly(ds, all, sel.b);
      const wa = weekly(ds, all, BRAND_IDX);
      const tr = wb.map((w, i) => ({ date: w.date, bank: w.reach, ahli: wa[i].reach }));
      const brand = sel.b === BRAND_IDX;
      const name = bankLabel(ds, ui, sel.b);
      const byE = breakdown(ds, rows, "engine", ds.engines.map((e) => e.id), sel.b);
      const byEA = breakdown(ds, rows, "engine", ds.engines.map((e) => e.id), BRAND_IDX);
      const byP = breakdown(ds, rows, "product", Object.keys(ui.products), sel.b);
      const byPA = breakdown(ds, rows, "product", Object.keys(ui.products), BRAND_IDX);
      const color = bankColor(ds, sel.b);
      return (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Mini label={ui.kpi.reach} value={`${s.reach}%`} delta={p ? s.reach - p.reach : null} />
            <Mini label={ui.kpi.shortlist} value={`${s.top3}%`} delta={p ? s.top3 - p.top3 : null} />
            <Mini label={ui.kpi.topMind} value={`${s.first}%`} delta={p ? s.first - p.first : null} />
            <Mini label={ui.competitors.avgPos} value={s.avgPos ?? "–"} />
          </div>
          {!brand && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3 text-[13px] ring-1 ring-line">
              <span className="text-ink-muted">{ui.drawer.vsAhli}</span>
              <b className="num text-ink">{Math.round((s.reach - a.reach) * 10) / 10 > 0 ? "+" : ""}{Math.round((s.reach - a.reach) * 10) / 10} {ui.pts}</b>
              <span className="text-ink-soft">({s.reach}% · {a.reach}%)</span>
            </div>
          )}
          {ds.runs.length > 1 && (
            <>
              <H>{ui.drawer.trend}</H>
              <div className="rounded-xl border border-line bg-white p-3">
                <TrendLines
                  height={180}
                  data={tr}
                  fmtDate={fmt}
                  series={brand ? [{ key: "ahli", label: name, color: GOLD, width: 2.5, area: true }] : [{ key: "ahli", label: ui.overview.ahli, color: GOLD, width: 2 }, { key: "bank", label: name, color, width: 3, area: true }]}
                />
              </div>
            </>
          )}
          <H>{ui.drawer.byChannel}</H>
          <BarList dense items={byE.map((r) => ({ key: r.key, label: ds.engines.find((e) => e.id === r.key)!.label, value: r.reach, color, marker: brand ? null : byEA.find((x) => x.key === r.key)?.reach }))} />
          <H>{ui.drawer.byProduct}</H>
          <BarList dense items={byP.map((r) => ({ key: r.key, label: ui.products[r.key as keyof UIText["products"]], value: r.reach, color, marker: brand ? null : byPA.find((x) => x.key === r.key)?.reach }))} />
          {!brand && (
            <p className="mt-2 flex items-center gap-2 text-[11.5px] text-ink-soft">
              <span className="inline-block h-3 w-0.5 rounded bg-ink/60" /> = {ui.overview.ahli}
            </p>
          )}
          <H>{ui.drawer.sample}</H>
          <Samples ids={[...rows].filter((x) => x.o.includes(sel.b)).sort((x, y) => y.r - x.r).slice(0, 3).map((x) => x.id)} ui={ui} ds={ds} />
        </>
      );
    }

    // domain
    const all = ds.rows.filter((x) => matches(ds, x, base) && cur.has(x.r));
    const rows = all.filter((x) => x.c.includes(sel.i));
    const withC = all.filter((x) => x.c.length).length;
    const d = ds.domains[sel.i];
    const s = bankSummary(rows);
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink ring-1 ring-line">
            <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[d.k] }} />
            {ui.media[d.k]}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Mini label={ui.drawer.citedIn} value={`${withC ? Math.round((1000 * rows.length) / withC) / 10 : 0}%`} />
          <Mini label={ui.kpi.reach} value={`${s.reach}%`} />
        </div>
        <div className="mt-3 rounded-xl bg-brand-50 p-3.5 text-[13px] leading-relaxed text-ink">
          <b className="mb-0.5 block text-[11.5px] uppercase tracking-wide text-brand">{ui.drawer.advice}</b>
          {ui.sources.advice[d.k]}
        </div>
        <H>{ui.drawer.byChannel}</H>
        <BarList dense unit="" items={ds.engines.map((e) => ({ key: e.id, label: e.label, value: rows.filter((x) => ds.engines[x.e].id === e.id).length, color: e.color })).filter((x) => x.value > 0)} />
        <H>{ui.drawer.byProduct}</H>
        <BarList dense unit="" items={Object.keys(ui.products).map((p) => ({ key: p, label: ui.products[p as keyof UIText["products"]], value: rows.filter((x) => ds.prompts[x.p].product === p).length, color: "#0B6298" })).filter((x) => x.value > 0)} />
        <H>{ui.drawer.sample}</H>
        <Samples ids={pickIds(rows)} ui={ui} ds={ds} />
      </>
    );
  }, [sel, ds, base, ui, fmt, lang, onFocus]);

  const title = !sel ? "" : sel.kind === "seg" ? sel.title : sel.kind === "bank" ? bankLabel(ds, ui, sel.b) : <span dir="ltr">{ds.domains[sel.i].d}</span>;
  const kicker = !sel ? "" : sel.kind === "seg" ? sel.kicker : sel.kind === "bank" ? sel.kicker ?? ui.drawer.bank : ui.drawer.source;
  return (
    <Drawer
      open={!!sel}
      onClose={onClose}
      title={title}
      kicker={kicker}
      closeLabel={ui.drawer.close}
      accent={sel?.kind === "bank" ? bankColor(ds, sel.b) : sel?.kind === "domain" ? KIND_COLOR[ds.domains[sel.i].k] : GOLD}
      badge={sel?.kind === "bank" ? <BankBadge color={bankColor(ds, sel.b)} short={ds.bankShort[sel.b]} size={46} brand={sel.b === BRAND_IDX} /> : undefined}
    >
      {content}
    </Drawer>
  );
}
