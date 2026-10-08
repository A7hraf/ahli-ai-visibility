"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bankSummary, breakdown, domainStats, lostTo, ranking, slice, weekly, BRAND_IDX, type Dataset, type Metric } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { BankBadge, BarList, ClickHint, Delta, Donut, Heatmap, Legend, Panel, RampLegend, Sparkline, Star, TipProvider, TipRow, useTip } from "@/components/viz/core";
import { FilterBar, useFilters } from "@/components/viz/filters";
import Details, { DomainName, domainColor, BankName, GOLD, GREY, KIND_COLOR, bankColor, bankLabel, useFmtDate, type Sel } from "@/components/viz/Details";
import TrendLines from "@/components/viz/TrendLines";
import InfoTip from "@/components/InfoTip";

export interface PlanSnapshot {
  done: number;
  doing: number;
  todo: number;
  current: number;
  target: number;
  points: { date: string; actual?: number; noAction?: number; withPlan?: number }[];
  labels: { actual: string; noAction: string; withPlan: string; today: string; forecast: string };
}

// each KPI tile has its own colour
const METRICS: { key: Metric; k: keyof UIText["kpi"]; h: keyof UIText["help"]; color: string; tint: string; icon: string }[] = [
  { key: "reach", k: "reach", h: "reach", color: "#0F9F94", tint: "bg-turq-50", icon: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { key: "top3", k: "shortlist", h: "shortlist", color: "#1F86E0", tint: "bg-sky-50", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
  { key: "first", k: "topMind", h: "topMind", color: "#7A4FE0", tint: "bg-violet-50", icon: "M12 2l3 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.9 3 1.1-6.5L2.5 8.9 9 8z" },
  { key: "sov", k: "sov", h: "sov", color: "#EB5E3A", tint: "bg-coral-50", icon: "M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z M16 8a5 5 0 0 1 0 8 M19 5a9 9 0 0 1 0 14" },
];
const MARKET_COLOR = { ar: "#0F9F94", en: "#1F86E0" };
const SCALE = 0.86; // race track: leave room after 100% for the value label

// a clickable card that can contain other buttons (info tips)
const pressable = (fn: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fn()),
  style: { cursor: "pointer" },
});

function Ring({ value, size = 168, stroke = 14, color, track = "rgba(255,255,255,0.1)", children }: { value: number; size?: number; stroke?: number; color: string; track?: string; children?: React.ReactNode }) {
  const r = size / 2 - stroke / 2 - 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ direction: "ltr" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C * Math.max(0.005, Math.min(1, value / 100))} ${C}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export default function Overview({ ds, ui, lang, plan }: { ds: Dataset; ui: UIText; lang: "en" | "ar"; plan: PlanSnapshot | null }) {
  return (
    <TipProvider>
      <OverviewInner ds={ds} ui={ui} lang={lang} plan={plan} />
    </TipProvider>
  );
}

function OverviewInner({ ds, ui, lang, plan }: { ds: Dataset; ui: UIText; lang: "en" | "ar"; plan: PlanSnapshot | null }) {
  const { f, set } = useFilters();
  const [metric, setMetric] = useState<Metric>("reach");
  const [sel, setSel] = useState<Sel | null>(null);
  const fmt = useFmtDate(lang);
  const tip = useTip();
  const ar = lang === "ar";

  const m = useMemo(() => {
    const { base, cur, prev } = slice(ds, f);
    const s = bankSummary(cur);
    const p = prev.length ? bankSummary(prev) : null;
    const rank = ranking(ds, cur, prev);
    const pos = rank.findIndex((r) => r.isBrand) + 1;
    const leader = rank.find((r) => !r.isBrand)!;
    const weeks = ds.banks.map((_, b) => weekly(ds, base, b));
    const trend = ds.runs.map((run, i) => {
      const vals = weeks.map((w) => w[i][metric]);
      return { date: run.date, ahli: weeks[0][i].n ? vals[0] : undefined, leader: weeks[leader.b][i].n ? vals[leader.b] : undefined, avg: weeks[0][i].n ? Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 10) / 10 : undefined };
    });
    const spark = (k: Metric) => weeks[0].filter((w) => w.n).map((w) => w[k]);
    const channels = breakdown(ds, cur, "engine", ds.engines.map((e) => e.id));
    const chPrev = breakdown(ds, prev, "engine", ds.engines.map((e) => e.id));
    const markets = breakdown(ds, cur, "lang", ["ar", "en"]);
    const products = [...new Set(ds.prompts.map((x) => x.product))];
    const heat = products.map((pl) => ({
      key: pl,
      label: ui.products[pl as keyof UIText["products"]] ?? pl,
      cells: ds.engines.map((e) => {
        const rr = cur.filter((x) => ds.prompts[x.p].product === pl && ds.engines[x.e].id === e.id);
        return rr.length ? bankSummary(rr).reach : null;
      }),
    }));
    const lost = lostTo(ds, cur);
    const media = domainStats(ds, cur);
    return { s, p, rank, pos, leader, trend, spark, channels, chPrev, markets, heat, lost, media, n: cur.length };
  }, [ds, f, metric, ui]);

  if (!ds.runs.length || !m.n)
    return (
      <div className="flex flex-col gap-5">
        <FilterBar ds={ds} ui={ui} f={f} set={set} />
        <div className="rounded-4xl border border-dashed border-line bg-paper p-12 text-center text-ink-muted">{ui.overview.noData}</div>
      </div>
    );

  const metricDef = METRICS.find((x) => x.key === metric)!;
  const arM = m.markets.find((x) => x.key === "ar");
  const enM = m.markets.find((x) => x.key === "en");
  const gap = arM && enM ? Math.round((enM.reach - arM.reach) * 10) / 10 : null;
  const sentData = [
    { key: "pos", label: ui.sent.pos, value: m.s.pos, color: "#16A34A" },
    { key: "neu", label: ui.sent.neu, value: m.s.neu, color: "#D3C8B5" },
    { key: "neg", label: ui.sent.neg, value: m.s.neg, color: "#DB2B39" },
  ];
  const sov = [...m.rank].sort((a, b) => b.sov - a.sov);
  const arrow = ar ? "←" : "→";

  return (
    <div className="flex flex-col gap-6">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />

      {/* HERO: index + the bank race */}
      <section className="pattern-star hero-glow rise relative overflow-hidden rounded-[32px] bg-navy p-6 text-white shadow-pop sm:p-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-gold-400 ring-1 ring-white/10">
              <Star size={12} /> {ui.kpi.index} <InfoTip text={ui.help.index} light />
            </span>
            <h2 className="font-display text-[28px] font-semibold leading-[1.25] sm:text-[34px]">
              {ar ? (
                <>
                  البنك الأهلي يظهر في <span className="text-gold-400">{m.s.reach}%</span> من إجابات الذكاء الاصطناعي
                </>
              ) : (
                <>
                  Ahli Bank appears in <span className="text-gold-400">{m.s.reach}%</span> of AI answers
                </>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-6">
              <div {...pressable(() => setMetric("index"))} aria-pressed={metric === "index"} className="rounded-full">
                <Ring value={m.s.index} color="url(#heroGold)" size={150}>
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F3DC7B" />
                        <stop offset="100%" stopColor="#C9A227" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="font-display text-[46px] font-bold leading-none">{m.s.index}</span>
                  <span className="mt-1 text-[11px] text-white/55">/ 100</span>
                </Ring>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[12px] text-white/55">{ui.kpi.rank}</p>
                  <p className="font-display text-[40px] font-bold leading-none">
                    #{m.pos}
                    <span className="ms-1.5 text-[15px] font-normal text-white/55">
                      {ui.of} {ds.banks.length}
                    </span>
                  </p>
                </div>
                <span className="flex items-center gap-2 text-[12px] text-white/60">
                  <Delta v={m.p ? m.s.index - m.p.index : null} /> {ui.vsPrev}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-display text-[17px] font-semibold">{ar ? "سباق البنوك في إجابات الذكاء الاصطناعي" : "The bank race in AI answers"}</p>
              <span className="text-[11.5px] text-white/50">{ui.kpi.reach}</span>
            </div>
            <ol className="flex flex-col gap-1">
              {m.rank.map((r, i) => {
                const c = bankColor(ds, r.b);
                return (
                  <li key={r.b}>
                    <button
                      onClick={() => setSel({ kind: "bank", b: r.b })}
                      {...tip(
                        <span className="flex flex-col gap-1">
                          <b>{bankLabel(ds, ui, r.b)}</b>
                          <TipRow color={c} label={ui.kpi.reach} value={`${r.reach}%`} />
                          <TipRow label={ui.kpi.topMind} value={`${r.first}%`} />
                          {r.delta !== null && <TipRow label={ui.vsPrev} value={`${r.delta > 0 ? "+" : ""}${r.delta}`} />}
                        </span>,
                      )}
                      className={`group grid w-full grid-cols-[18px_1fr] items-center gap-x-3 rounded-2xl px-2.5 py-1.5 text-start transition hover:bg-white/[0.07] sm:grid-cols-[18px_minmax(92px,150px)_1fr] ${r.isBrand ? "bg-gold/[0.14] ring-1 ring-gold/40" : ""}`}
                    >
                      <span className="num text-[12px] font-semibold text-white/45">{i + 1}</span>
                      <span dir="auto" className={`truncate text-[13px] ${r.isBrand ? "font-bold text-gold-400" : "text-white/85"}`}>
                        {bankLabel(ds, ui, r.b)}
                      </span>
                      {/* the track runs from the bank's name outward, in reading direction */}
                      <span className="relative col-span-2 h-8 sm:col-span-1">
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
                        {[25, 50, 75].map((g) => (
                          <span key={g} className="absolute bottom-1 top-1 w-px bg-white/[0.06]" style={{ insetInlineStart: `${g * SCALE}%` }} />
                        ))}
                        <span className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full transition-all duration-700" style={{ insetInlineStart: 0, width: `${r.reach * SCALE}%`, background: `linear-gradient(to ${ar ? "left" : "right"}, ${c}00, ${c})` }} />
                        <span className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center transition-all duration-700 group-hover:scale-110 rtl:translate-x-1/2" style={{ insetInlineStart: `${r.reach * SCALE}%` }}>
                          <BankBadge color={c} short={ds.bankShort[r.b]} size={r.isBrand ? 32 : 28} brand={r.isBrand} />
                        </span>
                        <span className="num absolute top-1/2 -translate-y-1/2 whitespace-nowrap ps-5 text-[12px] font-semibold text-white/80" style={{ insetInlineStart: `${r.reach * SCALE}%` }}>
                          {r.reach}%
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* KPI tiles, one colour each */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {METRICS.map((k) => {
          const v = m.s[k.key];
          const pv = m.p ? m.p[k.key] : null;
          const on = metric === k.key;
          return (
            <div
              key={k.key}
              {...pressable(() => setMetric(k.key))}
              aria-pressed={on}
              className={`rise relative flex flex-col gap-3 overflow-hidden rounded-4xl ${k.tint} p-5 text-start transition ${on ? "-translate-y-1 shadow-pop" : "shadow-card hover:-translate-y-0.5"}`}
              style={on ? { boxShadow: `0 0 0 2px ${k.color}, 0 14px 30px -12px ${k.color}88` } : undefined}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: k.color }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={k.icon} />
                    </svg>
                  </span>
                  {ui.kpi[k.k]}
                </span>
                <InfoTip text={ui.help[k.h]} />
              </span>
              <span className="font-display text-[44px] font-bold leading-none" style={{ color: k.color }}>
                {v}
                <span className="text-[22px]">%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Delta v={pv !== null ? v - pv : null} />
                <span className="truncate text-[11px] text-ink-muted">{ui.vsPrev}</span>
              </span>
              <Sparkline data={m.spark(k.key)} color={k.color} w={220} h={40} />
            </div>
          );
        })}
      </div>

      {/* trend + share of voice */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          accent={metric === "index" ? GOLD : metricDef.color}
          title={`${ui.overview.trend} · ${metric === "index" ? ui.kpi.index : ui.kpi[metricDef.k]}`}
          sub={ui.overview.trendSub}
          action={
            <Legend
              items={[
                { label: ui.overview.ahli, color: GOLD, line: true },
                { label: bankLabel(ds, ui, m.leader.b), color: bankColor(ds, m.leader.b), line: true },
                { label: ui.overview.avg, color: GREY, line: true },
              ]}
            />
          }
        >
          <TrendLines
            height={300}
            data={m.trend}
            fmtDate={fmt}
            unit={metric === "index" ? "" : "%"}
            onPick={(i) => setSel({ kind: "seg", kicker: ui.drawer.week, title: fmt(ds.runs[i].date), run: i })}
            series={[
              { key: "avg", label: ui.overview.avg, color: GREY, width: 1.5, dash: true },
              { key: "leader", label: bankLabel(ds, ui, m.leader.b), color: bankColor(ds, m.leader.b), width: 2.5 },
              { key: "ahli", label: ui.overview.ahli, color: GOLD, width: 3.5, area: true },
            ]}
          />
          <div className="mt-1 flex justify-end">
            <ClickHint>{ar ? "اضغط على أي أسبوع لتفاصيله" : "Click any week for its details"}</ClickHint>
          </div>
        </Panel>
        <Panel className="lg:col-span-4" accent="#EB5E3A" title={ui.kpi.sov} sub={ar ? "حصة كل بنك من كل ذكر للبنوك" : "Each bank's share of all bank mentions"}>
          <Donut
            size={176}
            thickness={26}
            onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
            data={sov.map((r) => ({ key: String(r.b), label: bankLabel(ds, ui, r.b), value: r.sov, color: bankColor(ds, r.b) }))}
            center={
              <>
                <BankBadge color={GOLD} short={ds.bankShort[BRAND_IDX]} size={30} brand />
                <span className="mt-1.5 font-display text-[26px] font-bold leading-none text-ink">{m.s.sov}%</span>
              </>
            }
          />
          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {sov.map((r) => (
              <li key={r.b}>
                <button onClick={() => setSel({ kind: "bank", b: r.b })} className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-start text-[12px] hover:bg-paper ${r.isBrand ? "bg-gold-50" : ""}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: bankColor(ds, r.b) }} />
                  <span dir="auto" className={`min-w-0 flex-1 truncate ${r.isBrand ? "font-semibold text-ink" : "text-ink-2"}`}>
                    {bankLabel(ds, ui, r.b)}
                  </span>
                  <b className="num text-ink">{r.sov}%</b>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* channels + markets */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-7" accent="#1F86E0" title={ui.overview.channels} sub={ui.overview.channelsSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <div className="grid grid-cols-5 items-end gap-3" style={{ height: 250 }} dir="ltr">
            {ds.engines.map((e) => {
              const c = m.channels.find((x) => x.key === e.id);
              const pv = m.chPrev.find((x) => x.key === e.id);
              const top = Math.max(...m.channels.map((x) => x.reach), 1);
              return (
                <button
                  key={e.id}
                  disabled={!c}
                  onClick={() => setSel({ kind: "seg", kicker: ui.drawer.channel, title: e.label, f: { ch: e.id } })}
                  {...tip(
                    c ? (
                      <span className="flex flex-col gap-1">
                        <b>{e.label}</b>
                        <TipRow color={e.color} label={ui.kpi.reach} value={`${c.reach}%`} />
                        <TipRow label={ui.kpi.shortlist} value={`${c.top3}%`} />
                        <TipRow label={ui.kpi.sov} value={`${c.sov}%`} />
                      </span>
                    ) : (
                      e.label
                    ),
                  )}
                  className="group flex h-full flex-col items-center justify-end gap-2 rounded-3xl px-1 pt-2 transition hover:bg-paper disabled:opacity-40"
                >
                  <span className="font-display text-[20px] font-bold leading-none" style={{ color: e.color }}>
                    {c ? `${c.reach}%` : "–"}
                  </span>
                  <Delta v={c && pv ? c.reach - pv.reach : null} size="xs" />
                  <span className="relative w-full max-w-[64px] flex-1">
                    <span
                      className="absolute inset-x-0 bottom-0 rounded-t-[18px] rounded-b-md transition-all duration-700 group-hover:brightness-110"
                      style={{ height: `${c ? Math.max(3, (c.reach / top) * 100) : 0}%`, background: `linear-gradient(180deg, ${e.color}, ${e.color}bb)`, boxShadow: `0 10px 24px -10px ${e.color}` }}
                    />
                  </span>
                  <span className="truncate text-[12.5px] font-semibold text-ink-2">{e.label}</span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel className="lg:col-span-5" accent="#0F9F94" title={ui.overview.markets} sub={ui.overview.marketsSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <div className="flex items-start justify-around gap-3">
            {(["ar", "en"] as const).map((k) => {
              const v = m.markets.find((x) => x.key === k);
              return (
                <button key={k} disabled={!v} onClick={() => setSel({ kind: "seg", kicker: ui.drawer.market, title: ui.markets[k], f: { mk: k } })} className="group flex flex-col items-center gap-2 rounded-3xl p-2 transition hover:bg-paper">
                  <Ring value={v?.reach ?? 0} size={136} stroke={14} color={MARKET_COLOR[k]} track="#F1EBE0">
                    <span className="font-display text-[32px] font-bold leading-none" style={{ color: MARKET_COLOR[k] }}>
                      {v ? `${v.reach}%` : "–"}
                    </span>
                    <span className="mt-1 text-[10.5px] text-ink-muted">{ui.kpi.reach}</span>
                  </Ring>
                  <span className="text-[13.5px] font-semibold text-ink">{ui.markets[k]}</span>
                  <span className="text-[11.5px] text-ink-muted">
                    {ui.kpi.shortlist} <b className="num text-ink">{v?.top3 ?? 0}%</b>
                  </span>
                </button>
              );
            })}
          </div>
          {gap !== null && (
            <div className={`mt-4 flex items-center gap-3 rounded-2xl p-3.5 ${gap > 10 ? "bg-bad-soft" : "bg-good-soft"}`}>
              <span className={`font-display text-[30px] font-bold leading-none ${gap > 10 ? "text-bad" : "text-good"}`}>{Math.abs(gap)}</span>
              <span className="text-[12.5px] leading-snug text-ink">
                <b>{ui.overview.gap}</b>
                <br />
                {ui.pts} · {gap > 0 ? ui.marketsShort.en : ui.marketsShort.ar} &gt; {gap > 0 ? ui.marketsShort.ar : ui.marketsShort.en}
              </span>
            </div>
          )}
        </Panel>
      </div>

      {/* products + sentiment */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-8" accent="#0F9F94" title={ui.overview.products} sub={ui.overview.productsSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
          <Heatmap
            rows={m.heat}
            cols={ds.engines.map((e) => ({
              key: e.id,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                  {e.label}
                </span>
              ),
            }))}
            max={100}
            format={(v) => `${Math.round(v)}%`}
            tipText={(r, c, v) => (
              <span>
                <b>{ui.products[r as keyof UIText["products"]]}</b> · {ds.engines.find((e) => e.id === c)?.label}
                <br />
                {ui.kpi.reach}: {v}%
              </span>
            )}
            onSelect={(r, c) => setSel({ kind: "seg", kicker: ui.drawer.cell, title: `${ui.products[r as keyof UIText["products"]]} · ${ds.engines.find((e) => e.id === c)?.label}`, f: { pl: r, ch: c } })}
          />
        </Panel>
        <Panel className="lg:col-span-4" accent="#16A34A" title={ui.overview.sentiment} sub={ui.overview.sentimentSub}>
          <Donut
            thickness={20}
            data={sentData}
            center={
              <>
                <span className="font-display text-[34px] font-bold leading-none text-good">{m.s.pos}%</span>
                <span className="mt-1 text-[11.5px] text-ink-muted">{ui.sent.pos}</span>
              </>
            }
          />
          <Legend className="mt-4 justify-center" items={sentData.map((d) => ({ label: d.label, color: d.color, value: `${d.value}%` }))} />
          {ds.openAlerts > 0 && (
            <Link href="/accuracy" className="mt-5 flex items-center gap-3 rounded-2xl bg-bad-soft p-3.5 transition hover:brightness-95">
              <span className="font-display text-[26px] font-bold leading-none text-bad">{ds.openAlerts}</span>
              <span className="text-[12.5px] font-medium text-ink">
                {ui.kpi.alerts} {arrow}
              </span>
            </Link>
          )}
        </Panel>
      </div>

      {/* lost + media */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel accent="#DB2B39" title={ui.overview.lost} sub={ui.overview.lostSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-paper p-3.5">
            <span className="font-display text-[30px] font-bold leading-none text-bad">{Math.round((1000 * m.lost.missed) / m.n) / 10}%</span>
            <span className="text-[12.5px] leading-snug text-ink-muted">{ar ? "من الإجابات لا تذكر البنك الأهلي" : "of AI answers leave Ahli Bank out"}</span>
          </div>
          <BarList
            labelWidth="w-44"
            onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
            items={m.lost.banks.slice(0, 6).map((b) => ({ key: String(b.b), label: <BankName ds={ds} ui={ui} b={b.b} />, value: b.share, color: bankColor(ds, b.b) }))}
          />
        </Panel>
        <Panel
          accent="#1F86E0"
          title={ui.overview.media}
          sub={ui.overview.mediaSub}
          action={
            <Link href="/sources" className="rounded-full bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-gold-50">
              {ui.nav.sources} {arrow}
            </Link>
          }
        >
          {m.media.total ? (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Donut
                size={156}
                thickness={22}
                data={m.media.kinds.map((k) => ({ key: k.k, label: ui.media[k.k], value: k.n, color: KIND_COLOR[k.k] }))}
                center={
                  <>
                    <span className="font-display text-[26px] font-bold leading-none text-gold-700">{m.media.ownRate}%</span>
                    <span className="mt-1 max-w-[90px] text-[10.5px] leading-tight text-ink-muted">{ui.sources.ownedSub}</span>
                  </>
                }
              />
              <div className="w-full min-w-0 flex-1">
                <BarList
                  dense
                  labelWidth="w-36"
                  onSelect={(k) => setSel({ kind: "domain", i: Number(k) })}
                  items={m.media.domains.slice(0, 6).map((d) => ({ key: String(d.i), label: <DomainName ds={ds} d={d} />, sub: ui.media[d.k], value: d.share, color: domainColor(ds, d) }))}
                />
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">–</p>
          )}
        </Panel>
      </div>

      {/* growth plan */}
      {plan && (
        <Panel
          tone="gold"
          title={ui.overview.plan}
          sub={ui.overview.planSub}
          action={
            <Link href="/plan" className="rounded-full bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-700">
              {ui.overview.openPlan} {arrow}
            </Link>
          }
        >
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <div className="rounded-3xl bg-white/80 p-5">
                <p className="text-[12px] text-ink-muted">{ui.plan.progress}</p>
                <p className="mt-1 font-display text-[36px] font-bold leading-none text-ink">
                  {plan.done}
                  <span className="text-[16px] font-normal text-ink-muted"> / {plan.done + plan.doing + plan.todo}</span>
                </p>
                <div className="mt-3 flex h-3 gap-1 overflow-hidden rounded-full">
                  <span className="rounded-full bg-good" style={{ flex: plan.done }} />
                  <span className="rounded-full bg-gold" style={{ flex: plan.doing }} />
                  <span className="rounded-full bg-slate-200" style={{ flex: plan.todo }} />
                </div>
                <Legend
                  className="mt-2.5"
                  items={[
                    { label: ui.overview.done, color: "#1D7A47", value: plan.done },
                    { label: ui.overview.inProgress, color: "#C9A227", value: plan.doing },
                    { label: ui.overview.toDo, color: "#E5DDCE", value: plan.todo },
                  ]}
                />
              </div>
              <div className="rounded-3xl bg-navy p-5 text-white">
                <p className="text-[12px] font-medium text-gold-400">{ui.overview.forecastTo}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[22px] font-semibold text-white/60">{plan.current}%</span>
                  <span className="text-white/40">{arrow}</span>
                  <span className="font-display text-[42px] font-bold leading-none text-gold-400">{plan.target}%</span>
                </p>
                <p className="mt-1 text-[12px] text-white/55">{ui.kpi.reach}</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 p-4 lg:col-span-8">
              <TrendLines
                height={250}
                data={plan.points}
                fmtDate={fmt}
                domain={[0, 100]}
                forecastFrom={plan.points.find((p) => p.withPlan !== undefined)?.date}
                forecastLabel={plan.labels.forecast}
                todayLabel={plan.labels.today}
                series={[
                  { key: "noAction", label: plan.labels.noAction, color: GREY, width: 1.5, dash: true },
                  { key: "withPlan", label: plan.labels.withPlan, color: GOLD, width: 3, dash: true, area: true },
                  { key: "actual", label: plan.labels.actual, color: "#0F9F94", width: 3 },
                ]}
              />
              <Legend
                className="mt-2 justify-center"
                items={[
                  { label: plan.labels.actual, color: "#0F9F94", line: true },
                  { label: plan.labels.withPlan, color: GOLD, line: true },
                  { label: plan.labels.noAction, color: GREY, line: true },
                ]}
              />
            </div>
          </div>
        </Panel>
      )}

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} onFocus={(nf) => { set(nf); setSel(null); }} />
    </div>
  );
}
