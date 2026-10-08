"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bankSummary, breakdown, domainStats, lostTo, ranking, slice, weekly, BRAND_IDX, type Dataset, type Metric } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { BarList, ClickHint, Delta, Donut, Heatmap, Legend, Panel, RampLegend, Sparkline, TipProvider, useTip } from "@/components/viz/core";
import { FilterBar, useFilters } from "@/components/viz/filters";
import Details, { GOLD, GREY, KIND_COLOR, NAVY, bankLabel, useFmtDate, type Sel } from "@/components/viz/Details";
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

const METRICS: { key: Metric; k: keyof UIText["kpi"]; h: keyof UIText["help"] }[] = [
  { key: "reach", k: "reach", h: "reach" },
  { key: "top3", k: "shortlist", h: "shortlist" },
  { key: "first", k: "topMind", h: "topMind" },
  { key: "sov", k: "sov", h: "sov" },
];

// a clickable card that can contain other buttons (info tips)
const pressable = (fn: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fn()),
  style: { cursor: "pointer" },
});

function IndexRing({ value, size = 150 }: { value: number; size?: number }) {
  const r = size / 2 - 12;
  const C = 2 * Math.PI * r;
  const arc = 0.75; // three-quarter ring
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[135deg]" style={{ direction: "ltr" }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={12} strokeDasharray={`${C * arc} ${C}`} strokeLinecap="round" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#idxGrad)"
        strokeWidth={12}
        strokeDasharray={`${C * arc * Math.max(0.01, value / 100)} ${C}`}
        strokeLinecap="round"
        className="transition-[stroke-dasharray] duration-700"
      />
      <defs>
        <linearGradient id="idxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E3D47A" />
          <stop offset="100%" stopColor="#B39E2E" />
        </linearGradient>
      </defs>
    </svg>
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

  const m = useMemo(() => {
    const { base, cur, prev } = slice(ds, f);
    const s = bankSummary(cur);
    const p = prev.length ? bankSummary(prev) : null;
    const rank = ranking(ds, cur, prev);
    const pos = rank.findIndex((r) => r.isBrand) + 1;
    const leader = rank.find((r) => !r.isBrand)!;
    const weeks = ds.banks.map((_, b) => weekly(ds, base, b));
    const trend = ds.runs.map((run, i) => {
      const vals = weeks.map((w) => w[i][metric === "index" ? "index" : metric]);
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
        <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center text-ink-muted">{ui.overview.noData}</div>
      </div>
    );

  const kpiVal = (k: Metric) => m.s[k];
  const kpiPrev = (k: Metric) => (m.p ? m.p[k] : null);
  const metricLabel = metric === "index" ? ui.kpi.index : ui.kpi[METRICS.find((x) => x.key === metric)!.k];
  const ar = m.markets.find((x) => x.key === "ar");
  const en = m.markets.find((x) => x.key === "en");
  const gap = ar && en ? Math.round((en.reach - ar.reach) * 10) / 10 : null;
  const sentData = [
    { key: "pos", label: ui.sent.pos, value: m.s.pos, color: "#0ca30c" },
    { key: "neu", label: ui.sent.neu, value: m.s.neu, color: "#B8C4D1" },
    { key: "neg", label: ui.sent.neg, value: m.s.neg, color: "#d03b3b" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />

      {/* KPI row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div
          {...pressable(() => setMetric("index"))}
          aria-pressed={metric === "index"}
          className={`group relative overflow-hidden rounded-2xl bg-navy p-5 text-start text-white shadow-card transition lg:col-span-4 ${metric === "index" ? "ring-2 ring-gold ring-offset-2 ring-offset-canvas" : "hover:-translate-y-0.5"}`}
        >
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative flex items-center gap-5">
            <div className="relative shrink-0">
              <IndexRing value={m.s.index} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[44px] font-semibold leading-none">{m.s.index}</span>
                <span className="mt-1 text-[11px] text-white/60">/ 100</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-400">
                {ui.kpi.index} <InfoTip text={ui.help.index} light />
              </span>
              <span className="flex items-center gap-2">
                <Delta v={m.p ? m.s.index - m.p.index : null} />
                <span className="text-[11.5px] text-white/60">{ui.vsPrev}</span>
              </span>
              <span className="mt-2 border-t border-white/10 pt-3 text-[12px] text-white/65">{ui.kpi.rank}</span>
              <span className="text-[30px] font-semibold leading-none">
                #{m.pos}
                <span className="ms-1 text-[14px] font-normal text-white/60">
                  {ui.of} {ds.banks.length}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-8 xl:grid-cols-4">
          {METRICS.map((k) => (
            <div
              key={k.key}
              {...pressable(() => setMetric(k.key))}
              aria-pressed={metric === k.key}
              className={`flex flex-col gap-2 rounded-2xl border bg-white p-4 text-start shadow-card transition ${metric === k.key ? "border-brand ring-2 ring-brand-100" : "border-line hover:-translate-y-0.5 hover:border-brand-300"}`}
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted">
                {ui.kpi[k.k]} <InfoTip text={ui.help[k.h]} />
              </span>
              <span className="text-[32px] font-semibold leading-none text-ink">
                {kpiVal(k.key)}
                <span className="text-[18px] text-ink-muted">%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Delta v={kpiPrev(k.key) !== null ? kpiVal(k.key) - (kpiPrev(k.key) as number) : null} unit="" />
                <span className="truncate text-[11px] text-ink-soft">{ui.vsPrev}</span>
              </span>
              <span className="mt-auto pt-1">
                <Sparkline data={m.spark(k.key)} color={metric === k.key ? "#0B6298" : "#94A3B8"} w={140} h={32} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* trend + ranking */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title={`${ui.overview.trend} · ${metricLabel}`}
          sub={ui.overview.trendSub}
          action={
            <Legend
              items={[
                { label: ui.overview.ahli, color: GOLD, line: true },
                { label: `${ui.overview.leader} (${bankLabel(ds, ui, m.leader.b)})`, color: NAVY, line: true },
                { label: ui.overview.avg, color: GREY, line: true },
              ]}
            />
          }
        >
          <TrendLines
            data={m.trend}
            fmtDate={fmt}
            unit={metric === "index" ? "" : "%"}
            onPick={(i) => setSel({ kind: "seg", kicker: ui.drawer.week, title: fmt(ds.runs[i].date), run: i })}
            series={[
              { key: "avg", label: ui.overview.avg, color: GREY, width: 1.5, dash: true },
              { key: "leader", label: bankLabel(ds, ui, m.leader.b), color: NAVY, width: 2 },
              { key: "ahli", label: ui.overview.ahli, color: GOLD, width: 3, area: true },
            ]}
          />
          <div className="mt-1 flex justify-end">
            <ClickHint>{lang === "ar" ? "اضغط على أي أسبوع لتفاصيله" : "Click any week for its details"}</ClickHint>
          </div>
        </Panel>
        <Panel className="lg:col-span-4" title={ui.overview.rank} sub={ui.overview.rankSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <BarList
            labelWidth="w-32"
            onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
            items={m.rank.map((r, i) => ({
              key: String(r.b),
              label: (
                <span className="flex items-center gap-2">
                  <span className="num w-4 text-[11.5px] text-ink-soft">{i + 1}</span>
                  <span className="truncate" dir="auto">{bankLabel(ds, ui, r.b)}</span>
                </span>
              ),
              value: r.reach,
              strong: r.isBrand,
              color: r.isBrand ? GOLD : i === 0 ? NAVY : "#C3CDD8",
              tip: (
                <span className="flex flex-col gap-0.5">
                  <b>{bankLabel(ds, ui, r.b)}</b>
                  <span>
                    {ui.kpi.reach}: {r.reach}% · {ui.kpi.topMind}: {r.first}%
                  </span>
                  {r.delta !== null && (
                    <span className="text-white/70">
                      {r.delta > 0 ? "+" : ""}
                      {r.delta} {ui.pts} {ui.vsPrev}
                    </span>
                  )}
                </span>
              ),
            }))}
          />
        </Panel>
      </div>

      {/* channels + markets */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-7" title={ui.overview.channels} sub={ui.overview.channelsSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <div className="grid grid-cols-5 items-end gap-3" style={{ height: 220 }} dir="ltr">
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
                      <span className="flex flex-col gap-0.5">
                        <b>{e.label}</b>
                        <span>
                          {ui.kpi.reach} {c.reach}% · {ui.kpi.shortlist} {c.top3}%
                        </span>
                        <span>
                          {ui.kpi.sov} {c.sov}%
                        </span>
                      </span>
                    ) : (
                      e.label
                    ),
                  )}
                  className="group flex h-full flex-col items-center justify-end gap-2 rounded-xl px-1 pt-2 transition hover:bg-canvas disabled:opacity-40"
                >
                  <span className="num text-[15px] font-semibold text-ink">{c ? `${c.reach}%` : "–"}</span>
                  <Delta v={c && pv ? c.reach - pv.reach : null} size="xs" />
                  <span className="relative w-full max-w-[56px] flex-1">
                    <span className="absolute inset-x-0 bottom-0 rounded-t-lg transition-all duration-500 group-hover:brightness-110" style={{ height: `${c ? Math.max(3, (c.reach / top) * 100) : 0}%`, background: e.color }} />
                  </span>
                  <span className="truncate text-[12.5px] font-medium text-ink-2">{e.label}</span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel className="lg:col-span-5" title={ui.overview.markets} sub={ui.overview.marketsSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <div className="flex flex-col gap-4">
            {(["ar", "en"] as const).map((k) => {
              const v = m.markets.find((x) => x.key === k);
              return (
                <button key={k} disabled={!v} onClick={() => setSel({ kind: "seg", kicker: ui.drawer.market, title: ui.markets[k], f: { mk: k } })} className="group flex flex-col gap-2 rounded-xl p-2 text-start transition hover:bg-canvas">
                  <span className="flex items-baseline justify-between">
                    <span className="text-[13.5px] font-medium text-ink-2">{ui.markets[k]}</span>
                    <span className="num text-[26px] font-semibold leading-none text-ink">{v ? `${v.reach}%` : "–"}</span>
                  </span>
                  <span className="relative h-3.5 rounded-full bg-slate-100">
                    <span className="absolute inset-y-0 start-0 rounded-full transition-all duration-500" style={{ width: `${v?.reach ?? 0}%`, background: k === "ar" ? "#0B6298" : "#7FB2D9" }} />
                  </span>
                  <span className="flex gap-4 text-[11.5px] text-ink-muted">
                    <span>
                      {ui.kpi.shortlist} <b className="num text-ink">{v?.top3 ?? 0}%</b>
                    </span>
                    <span>
                      {ui.kpi.topMind} <b className="num text-ink">{v?.first ?? 0}%</b>
                    </span>
                  </span>
                </button>
              );
            })}
            {gap !== null && (
              <div className={`flex items-center gap-3 rounded-xl p-3 ${gap > 10 ? "bg-bad-soft" : "bg-good-soft"}`}>
                <span className={`num text-[26px] font-semibold leading-none ${gap > 10 ? "text-bad" : "text-good"}`}>{Math.abs(gap)}</span>
                <span className="text-[12.5px] leading-snug text-ink">
                  <b>{ui.overview.gap}</b>
                  <br />
                  {ui.pts} · {gap > 0 ? ui.marketsShort.en : ui.marketsShort.ar} &gt; {gap > 0 ? ui.marketsShort.ar : ui.marketsShort.en}
                </span>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* products + sentiment */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title={ui.overview.products} sub={ui.overview.productsSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
          <Heatmap
            rows={m.heat}
            cols={ds.engines.map((e) => ({ key: e.id, label: e.label }))}
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
        <Panel className="lg:col-span-4" title={ui.overview.sentiment} sub={ui.overview.sentimentSub}>
          <Donut
            thickness={16}
            data={sentData}
            center={
              <>
                <span className="text-[30px] font-semibold leading-none text-ink">{m.s.pos}%</span>
                <span className="mt-1 text-[11.5px] text-ink-muted">{ui.sent.pos}</span>
              </>
            }
          />
          <Legend className="mt-4 justify-center" items={sentData.map((d) => ({ label: d.label, color: d.color, value: `${d.value}%` }))} />
          {ds.openAlerts > 0 && (
            <Link href="/accuracy" className="mt-4 flex items-center gap-3 rounded-xl bg-bad-soft p-3 transition hover:brightness-95">
              <span className="num text-[22px] font-semibold text-bad">{ds.openAlerts}</span>
              <span className="text-[12.5px] font-medium text-ink">{ui.kpi.alerts} {lang === "ar" ? "←" : "→"}</span>
            </Link>
          )}
        </Panel>
      </div>

      {/* lost + media */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={ui.overview.lost} sub={ui.overview.lostSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-canvas p-3">
            <span className="num text-[26px] font-semibold leading-none text-ink">{Math.round((1000 * m.lost.missed) / m.n) / 10}%</span>
            <span className="text-[12.5px] leading-snug text-ink-muted">{lang === "ar" ? "من الإجابات لا تذكر البنك الأهلي" : "of AI answers leave Ahli Bank out"}</span>
          </div>
          <BarList
            onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
            items={m.lost.banks.slice(0, 6).map((b, i) => ({ key: String(b.b), label: bankLabel(ds, ui, b.b), value: b.share, color: i === 0 ? NAVY : "#7E93A9" }))}
          />
        </Panel>
        <Panel title={ui.overview.media} sub={ui.overview.mediaSub} action={<Link href="/sources" className="text-[12.5px] font-semibold text-brand hover:underline">{ui.nav.sources} {lang === "ar" ? "←" : "→"}</Link>}>
          {m.media.total ? (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Donut
                size={150}
                thickness={20}
                data={m.media.kinds.map((k) => ({ key: k.k, label: ui.media[k.k], value: k.n, color: KIND_COLOR[k.k] }))}
                center={
                  <>
                    <span className="text-[24px] font-semibold leading-none text-ink">{m.media.ownRate}%</span>
                    <span className="mt-1 max-w-[90px] text-[10.5px] leading-tight text-ink-muted">{ui.sources.ownedSub}</span>
                  </>
                }
              />
              <div className="w-full min-w-0 flex-1">
                <BarList
                  dense
                  labelWidth="w-36"
                  onSelect={(k) => setSel({ kind: "domain", i: Number(k) })}
                  items={m.media.domains.slice(0, 6).map((d) => ({ key: String(d.i), label: <span dir="ltr">{d.d}</span>, sub: ui.media[d.k], value: d.share, color: KIND_COLOR[d.k] }))}
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
        <Panel title={ui.overview.plan} sub={ui.overview.planSub} action={<Link href="/plan" className="rounded-xl bg-navy px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-700">{ui.overview.openPlan}</Link>}>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <div>
                <p className="text-[12px] text-ink-muted">{ui.plan.progress}</p>
                <p className="mt-1 text-[30px] font-semibold leading-none text-ink">
                  {plan.done}
                  <span className="text-[16px] font-normal text-ink-muted"> / {plan.done + plan.doing + plan.todo}</span>
                </p>
                <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
                  <span className="bg-good" style={{ flex: plan.done }} />
                  <span className="bg-gold" style={{ flex: plan.doing }} />
                  <span className="bg-slate-200" style={{ flex: plan.todo }} />
                </div>
                <Legend
                  className="mt-2"
                  items={[
                    { label: ui.overview.done, color: "#1D7A47", value: plan.done },
                    { label: ui.overview.inProgress, color: "#ADA042", value: plan.doing },
                    { label: ui.overview.toDo, color: "#E2E8F0", value: plan.todo },
                  ]}
                />
              </div>
              <div className="rounded-xl bg-gold-50 p-4 ring-1 ring-gold-100">
                <p className="text-[12px] font-medium text-gold-700">{ui.overview.forecastTo}</p>
                <p className="mt-1 flex items-baseline gap-2 text-ink">
                  <span className="text-[20px] font-semibold text-ink-muted">{plan.current}%</span>
                  <span className="text-ink-soft">{lang === "ar" ? "←" : "→"}</span>
                  <span className="text-[34px] font-semibold leading-none text-gold-700">{plan.target}%</span>
                </p>
                <p className="mt-1 text-[12px] text-ink-muted">{ui.kpi.reach}</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <TrendLines
                height={240}
                data={plan.points}
                fmtDate={fmt}
                domain={[0, 100]}
                forecastFrom={plan.points.find((p) => p.withPlan !== undefined)?.date}
                forecastLabel={plan.labels.forecast}
                todayLabel={plan.labels.today}
                series={[
                  { key: "noAction", label: plan.labels.noAction, color: GREY, width: 1.5, dash: true },
                  { key: "withPlan", label: plan.labels.withPlan, color: GOLD, width: 2.5, dash: true, area: true },
                  { key: "actual", label: plan.labels.actual, color: "#0B6298", width: 2.5 },
                ]}
              />
              <Legend
                className="mt-2 justify-center"
                items={[
                  { label: plan.labels.actual, color: "#0B6298", line: true },
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
