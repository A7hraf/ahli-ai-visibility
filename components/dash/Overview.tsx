"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bankSummary, breakdown, ranking, slice, weekly, type Dataset, type Metric } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { BankBadge, Delta, Donut, Heatmap, Insight, Legend, Panel, Sparkline, TipProvider, TipRow, useTip, Waffle } from "@/components/viz/core";
import { CountUp, Reveal, useShown } from "@/components/viz/motion";
import { useFilters } from "@/components/viz/filters";
import Details, { GOLD, GREY, NAVY, bankColor, bankLabel, useFmtDate, type Sel } from "@/components/viz/Details";
import { AnswerPreview } from "@/components/viz/story";
import TrendLines from "@/components/viz/TrendLines";
import InfoTip from "@/components/InfoTip";
import { Icon } from "@/components/Icon";

export interface PlanSnapshot {
  done: number;
  doing: number;
  todo: number;
  statuses: ("todo" | "doing" | "done")[];
  current: number;
  target: number;
  points: { date: string; actual?: number; noAction?: number; withPlan?: number }[];
  labels: { actual: string; noAction: string; withPlan: string; today: string; forecast: string };
}

const METRICS: { key: Exclude<Metric, "index">; k: "reach" | "shortlist" | "topMind" | "sov" }[] = [
  { key: "reach", k: "reach" },
  { key: "top3", k: "shortlist" },
  { key: "first", k: "topMind" },
  { key: "sov", k: "sov" },
];
const SENT = { pos: "#1F6B3F", neu: "#B9B3A3", neg: "#D6006C" };

// a clickable card that can contain other buttons (info tips)
const pressable = (fn: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fn()),
  style: { cursor: "pointer" },
});

function Ring({ value, size = 168, stroke = 14, color, track = "rgba(255,255,255,0.12)", children }: { value: number; size?: number; stroke?: number; color: string; track?: string; children?: React.ReactNode }) {
  const shown = useShown();
  const r = size / 2 - stroke / 2 - 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ direction: "ltr" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${shown ? C * Math.max(0.005, Math.min(1, value / 100)) : 0} ${C}`} style={{ transition: "stroke-dasharray .9s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Ranked bars, one per bank; Ahli's row is highlighted. */
function Race({ ds, ui, rank, onPick }: { ds: Dataset; ui: UIText; rank: ReturnType<typeof ranking>; onPick: (b: number) => void }) {
  const shown = useShown();
  const tip = useTip();
  const top = Math.max(...rank.map((r) => r.reach), 1);
  return (
    <ol className="flex flex-col">
      {rank.map((r, i) => (
        <li key={r.b}>
          <button
            onClick={() => onPick(r.b)}
            {...tip(
              <span className="flex flex-col gap-1">
                <b>{bankLabel(ds, ui, r.b)}</b>
                <TipRow color={bankColor(ds, r.b)} label={ui.kpi.reach} value={`${r.reach}%`} />
                <TipRow label={ui.kpi.shortlist} value={`${r.top3}%`} />
                <TipRow label={ui.kpi.topMind} value={`${r.first}%`} />
                {r.delta !== null && <TipRow label={ui.vsPrev} value={`${r.delta > 0 ? "+" : ""}${r.delta}`} />}
              </span>,
            )}
            className={`group grid w-full grid-cols-[18px_auto_minmax(0,1fr)_minmax(0,1.3fr)_52px] items-center gap-3 rounded-[3px] px-2 py-2 text-start transition-colors hover:bg-slate-100 ${r.isBrand ? "bg-gold-100 hover:bg-gold-100" : ""}`}
          >
            <span className="num text-[12px] text-ink-soft">{i + 1}</span>
            <BankBadge color={bankColor(ds, r.b)} short={ds.bankShort[r.b]} size={26} brand={r.isBrand} />
            <span dir="auto" className={`truncate text-[13.5px] ${r.isBrand ? "font-bold text-ink" : "text-ink-2"}`}>
              {bankLabel(ds, ui, r.b)}
            </span>
            <span className="relative h-2 rounded-[2px] bg-slate-200">
              <span className="absolute inset-y-0 start-0 rounded-[2px] group-hover:brightness-110" style={{ width: shown ? `${Math.max(1.5, (r.reach / top) * 100)}%` : "0%", background: bankColor(ds, r.b), transition: `width .7s cubic-bezier(.2,.7,.2,1) ${i * 40}ms` }} />
            </span>
            <span className="num text-end text-[13px] font-bold text-ink">{r.reach}%</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One column per assistant, in its own colour. */
function AssistantColumns({ ds, ui, rows, prev, onPick }: { ds: Dataset; ui: UIText; rows: ReturnType<typeof breakdown>; prev: ReturnType<typeof breakdown>; onPick: (id: string, label: string) => void }) {
  const shown = useShown();
  const tip = useTip();
  const top = Math.max(...rows.map((x) => x.reach), 1);
  const sorted = [...ds.engines].sort((a, b) => (rows.find((x) => x.key === b.id)?.reach ?? -1) - (rows.find((x) => x.key === a.id)?.reach ?? -1));
  return (
    <div className="grid grid-cols-5 items-end gap-2" style={{ height: 210 }} dir="ltr">
      {sorted.map((e, i) => {
        const c = rows.find((x) => x.key === e.id);
        const pv = prev.find((x) => x.key === e.id);
        return (
          <button
            key={e.id}
            disabled={!c}
            onClick={() => onPick(e.id, e.label)}
            {...tip(
              c ? (
                <span className="flex flex-col gap-1">
                  <b>{e.label}</b>
                  <TipRow color={e.color} label={ui.kpi.reach} value={`${c.reach}%`} />
                  <TipRow label={ui.kpi.shortlist} value={`${c.top3}%`} />
                  {pv && <TipRow label={ui.vsPrev} value={`${c.reach - pv.reach > 0 ? "+" : ""}${Math.round((c.reach - pv.reach) * 10) / 10}`} />}
                </span>
              ) : (
                e.label
              ),
            )}
            className="group flex h-full flex-col items-center justify-end gap-1.5 rounded-[3px] px-0.5 pt-1 transition hover:bg-slate-100 disabled:opacity-40"
          >
            <span className="num text-[12.5px] font-bold text-ink transition-transform group-hover:-translate-y-0.5">{c ? `${c.reach}%` : "–"}</span>
            <span className="relative w-full max-w-[44px] flex-1">
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-[2px] group-hover:brightness-110"
                style={{ height: shown && c ? `${Math.max(3, (c.reach / top) * 100)}%` : "0%", background: e.color, transition: `height .7s cubic-bezier(.2,.7,.2,1) ${i * 50}ms, filter .2s` }}
              />
            </span>
            <span className="w-full truncate text-[11.5px] font-bold text-ink-2">{e.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Overview(props: { ds: Dataset; ui: UIText; lang: "en" | "ar"; plan: PlanSnapshot | null; userName: string }) {
  return (
    <TipProvider>
      <OverviewInner {...props} />
    </TipProvider>
  );
}

function OverviewInner({ ds, ui, lang, plan, userName }: { ds: Dataset; ui: UIText; lang: "en" | "ar"; plan: PlanSnapshot | null; userName: string }) {
  const { f, set } = useFilters();
  const [metric, setMetric] = useState<Metric>("reach");
  const [sel, setSel] = useState<Sel | null>(null);
  const fmt = useFmtDate(lang);
  const h = ui.home;

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
    const heat = products
      .map((pl) => ({
        key: pl,
        label: ui.products[pl as keyof UIText["products"]] ?? pl,
        cells: ds.engines.map((e) => {
          const rr = cur.filter((x) => ds.prompts[x.p].product === pl && ds.engines[x.e].id === e.id);
          return rr.length ? bankSummary(rr).reach : null;
        }),
      }))
      .sort((a, b) => b.cells.reduce<number>((t, v) => t + (v ?? 0), 0) - a.cells.reduce<number>((t, v) => t + (v ?? 0), 0));
    return { s, p, rank, pos, leader, trend, spark, channels, chPrev, markets, heat, cur, n: cur.length };
  }, [ds, f, metric, ui]);

  if (!ds.runs.length || !m.n) return <div className="mt-6 rounded-[4px] border border-dashed border-line-2 bg-white p-12 text-center text-ink-muted">{ui.overview.noData}</div>;

  const arM = m.markets.find((x) => x.key === "ar");
  const enM = m.markets.find((x) => x.key === "en");
  const gap = arM && enM ? Math.round((arM.reach - enM.reach) * 10) / 10 : null;
  const sov = [...m.rank].sort((a, b) => b.sov - a.sov);
  const engLabel = (id: string) => ds.engines.find((e) => e.id === id)?.label ?? id;
  const pName = (k: string) => ui.products[k as keyof UIText["products"]] ?? k;
  const dReach = m.p ? Math.round((m.s.reach - m.p.reach) * 10) / 10 : null;
  const leaderName = bankLabel(ds, ui, m.leader.b);
  const firstTrend = m.trend.find((t) => t.ahli !== undefined && t.leader !== undefined);
  const lastTrend = [...m.trend].reverse().find((t) => t.ahli !== undefined && t.leader !== undefined);
  const g0 = firstTrend ? Math.round(((firstTrend.leader ?? 0) - (firstTrend.ahli ?? 0)) * 10) / 10 : null;
  const g1 = lastTrend ? Math.round(((lastTrend.leader ?? 0) - (lastTrend.ahli ?? 0)) * 10) / 10 : null;
  const metricLabel = metric === "index" ? ui.kpi.index : ui.kpi[METRICS.find((x) => x.key === metric)!.k];
  const unit = metric === "index" ? "" : "%";
  const arrow = lang === "ar" ? "←" : "→";

  return (
    <div className="flex flex-col gap-5">
      {/* hero: the one-line answer and the score */}
      <Reveal>
        <section className="spot relative overflow-hidden rounded-[4px] bg-navy px-6 py-7 text-white sm:px-9 sm:py-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[12.5px] text-white/70">
                {fill(ui.hdr.greeting, { name: userName })} · <span className="text-gold-400">{h.kicker}</span>
              </p>
              <h1 className="font-display text-[30px] leading-[1.15] sm:text-[38px]">{ui.overview.title}</h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-white/80">
                {fill(h.take, { n: Math.round(m.s.reach), rank: m.pos, banks: ds.banks.length })} {dReach !== null && (dReach > 0.5 ? fill(ui.ins.up, { d: dReach }) : dReach < -0.5 ? fill(ui.ins.down, { d: Math.abs(dReach) }) : ui.ins.flat)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <Link href="/plan" className="group flex items-center gap-2 rounded-[4px] bg-gold px-4 py-2.5 text-[14px] font-bold text-navy transition hover:brightness-105">
                  <Icon name="rocket" size={16} />
                  {ui.overview.openPlan}
                </Link>
                <Link href="/competitors" className="flex items-center gap-2 rounded-[4px] border border-white/30 px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-white/10">
                  <Icon name="trophy" size={16} />
                  {h.competitors}
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-7">
              <button onClick={() => setMetric("index")} className="rounded-full transition hover:scale-[1.03]" aria-label={ui.kpi.index}>
                <Ring value={m.s.index} size={150} stroke={12} color={GOLD}>
                  <span className="font-display text-[42px] leading-none">
                    <CountUp value={m.s.index} />
                  </span>
                  <span className="mt-1 text-[11px] text-white/65">{ui.kpi.index}</span>
                </Ring>
              </button>
              <ul className="flex min-w-[220px] flex-col divide-y divide-white/15 text-[13px]">
                <li>
                  <Link href="/competitors" className="flex items-center justify-between gap-6 py-2.5 transition hover:text-gold-400">
                    <span className="text-white/75">{h.rank}</span>
                    <b className="font-display text-[20px]">
                      #{m.pos}
                      <span className="ms-1 text-[12px] font-normal text-white/55">/ {ds.banks.length}</span>
                    </b>
                  </Link>
                </li>
                {gap !== null && (
                  <li>
                    <button onClick={() => setSel({ kind: "seg", kicker: ui.drawer.market, title: ui.markets.ar, f: { mk: "ar" } })} className="flex w-full items-center justify-between gap-6 py-2.5 transition hover:text-gold-400">
                      <span className="text-white/75">{h.langGap}</span>
                      <b dir="ltr" className={`font-display text-[20px] ${gap < 0 ? "text-[#FF9DBE]" : "text-[#9FE0B5]"}`}>
                        {gap > 0 ? "+" : gap < 0 ? "−" : ""}
                        {Math.abs(gap)}
                      </b>
                    </button>
                  </li>
                )}
                <li>
                  <Link href="/accuracy" className="flex items-center justify-between gap-6 py-2.5 transition hover:text-gold-400">
                    <span className="flex items-center gap-1.5 text-white/75">
                      <Icon name="alert" size={14} />
                      {h.wrong}
                    </span>
                    <b className="font-display text-[20px]">{ds.openAlerts}</b>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* the four headline numbers; each one switches the trend chart */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((k, i) => {
          const v = m.s[k.key];
          const pv = m.p ? m.p[k.key] : null;
          const on = metric === k.key;
          return (
            <Reveal key={k.key} delay={i * 70}>
              <div
                {...pressable(() => setMetric(k.key))}
                aria-pressed={on}
                className={`group flex h-full flex-col gap-2 overflow-hidden rounded-[4px] border bg-white pt-4 text-start transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop ${on ? "border-navy shadow-[inset_0_0_0_1px_#0B3A5B]" : "border-line"}`}
              >
                <span className="flex items-start justify-between gap-2 px-4">
                  <span>
                    <span className="block text-[14.5px] font-bold text-ink">{ui.kpi[k.k]}</span>
                    <span className="block text-[11px] text-ink-soft">{ui.term[k.k]}</span>
                  </span>
                  <InfoTip text={ui.help[k.k]} />
                </span>
                <span className="flex items-end justify-between gap-2 px-4">
                  <span className="font-display text-[32px] leading-none text-ink">
                    <CountUp value={v} />%
                  </span>
                  <Delta v={pv !== null ? v - pv : null} />
                </span>
                <span className="px-4 text-[11.5px] text-ink-muted">{h.ks[k.key]}</span>
                <span className="mt-auto block">
                  <Sparkline data={m.spark(k.key)} color={on ? NAVY : GOLD} w={300} h={34} />
                </span>
              </div>
            </Reveal>
          );
        })}
      </div>
      <p className="-mt-2 flex items-center gap-1.5 text-[12px] text-ink-muted">
        <Icon name="sparkle" size={13} />
        {h.kpiHint}
      </p>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title={ui.overview.trend}
          term={metricLabel}
          action={
            <Legend
              items={[
                { label: ui.overview.ahli, color: GOLD },
                { label: leaderName, color: bankColor(ds, m.leader.b) },
                { label: ui.overview.avg, color: GREY, line: true },
              ]}
            />
          }
        >
          <Insight>{m.leader.reach <= m.rank.find((r) => r.isBrand)!.reach ? ui.ins.weLead : g0 !== null && g1 !== null ? fill(h.trendTake, { lead: leaderName, g0, g1 }) : fill(ui.ins.lead, { bank: leaderName, gap: Math.round((m.leader.reach - m.s.reach) * 10) / 10 })}</Insight>
          <TrendLines
            height={280}
            data={m.trend}
            fmtDate={fmt}
            unit={unit}
            onPick={(i) => setSel({ kind: "seg", kicker: ui.drawer.week, title: fmt(ds.runs[i].date), run: i })}
            series={[
              { key: "avg", label: ui.overview.avg, color: GREY, width: 1.5, dash: true },
              { key: "leader", label: leaderName, color: bankColor(ds, m.leader.b), width: 2 },
              { key: "ahli", label: ui.overview.ahli, color: GOLD, width: 3, area: true },
            ]}
          />
        </Panel>
        <Panel className="lg:col-span-4" title={ui.kpi.sov} term={ui.term.sov}>
          <Insight>{fill(h.sovTake, { v: m.s.sov, lead: bankLabel(ds, ui, sov.find((r) => !r.isBrand)!.b), lv: sov.find((r) => !r.isBrand)!.sov })}</Insight>
          <Donut
            size={176}
            thickness={24}
            onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
            data={sov.map((r) => ({ key: String(r.b), label: bankLabel(ds, ui, r.b), value: r.sov, color: bankColor(ds, r.b) }))}
            center={
              <>
                <span className="font-display text-[28px] leading-none text-ink">
                  <CountUp value={m.s.sov} />%
                </span>
                <span className="mt-1 text-[11px] text-ink-muted">{ui.overview.ahli}</span>
              </>
            }
          />
          <ul className="mt-5 grid grid-cols-3 gap-x-2 gap-y-1">
            {sov.map((r) => (
              <li key={r.b}>
                <button onClick={() => setSel({ kind: "bank", b: r.b })} className={`group flex w-full items-center justify-between gap-1.5 rounded-[3px] px-1.5 py-1 text-[12px] transition hover:bg-slate-100 ${r.isBrand ? "bg-gold-100" : ""}`}>
                  <BankBadge color={bankColor(ds, r.b)} short={ds.bankShort[r.b]} size={22} brand={r.isBrand} />
                  <b className="num text-ink-2">{r.sov}%</b>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title={ui.overview.race}
          term={`${ui.term.reach} · ${ds.banks.length}`}
          action={
            <Link href="/competitors" className="flex items-center gap-1.5 rounded-[4px] border border-line px-3 py-1.5 text-[12.5px] font-bold text-navy transition hover:bg-slate-100">
              {h.competitors} {arrow}
            </Link>
          }
        >
          <Insight>{fill(h.raceTake, { lead: bankLabel(ds, ui, m.rank[0].b), lv: m.rank[0].reach, rank: m.pos, v: m.s.reach })}</Insight>
          <Race ds={ds} ui={ui} rank={m.rank} onPick={(b) => setSel({ kind: "bank", b })} />
        </Panel>
        <Panel className="flex flex-col lg:col-span-4" title={h.waffle} term={ui.term.reach}>
          <p className="mb-4 flex items-baseline gap-2">
            <span className="font-display text-[40px] leading-none text-gold-600">
              <CountUp value={Math.round(m.s.reach)} />
            </span>
            <span className="text-[13px] text-ink-muted">{h.mentions}</span>
          </p>
          <div className="flex flex-1 items-center justify-center">
            <Waffle value={m.s.reach} empty="#EFEDE6" size={19} gap={5} />
          </div>
          <Legend
            className="mt-4"
            items={[
              { label: `${h.mentions} · ${Math.round(m.s.reach)}`, color: GOLD },
              { label: `${h.noMention} · ${100 - Math.round(m.s.reach)}`, color: "#E3E0DC" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title={h.asst} term={h.asstTerm}>
          {m.channels.length > 1 &&
            (() => {
              const c = [...m.channels].sort((a, b) => b.reach - a.reach);
              return <Insight>{fill(ui.ins.channels, { best: engLabel(c[0].key), bv: c[0].reach, worst: engLabel(c[c.length - 1].key), wv: c[c.length - 1].reach })}</Insight>;
            })()}
          <AssistantColumns ds={ds} ui={ui} rows={m.channels} prev={m.chPrev} onPick={(id, label) => setSel({ kind: "seg", kicker: ui.drawer.channel, title: label, f: { ch: id } })} />
        </Panel>
        <Panel title={h.lang} term={h.langTerm}>
          {gap !== null && <Insight>{gap < -5 ? fill(ui.ins.lang, { gap: Math.abs(gap) }) : ui.ins.langOk}</Insight>}
          <div className="flex items-start justify-around gap-2">
            {(["en", "ar"] as const).map((k) => {
              const v = m.markets.find((x) => x.key === k);
              const c = k === "ar" ? GOLD : NAVY;
              return (
                <button key={k} disabled={!v} onClick={() => setSel({ kind: "seg", kicker: ui.drawer.market, title: ui.markets[k], f: { mk: k } })} className="group flex flex-col items-center gap-2 rounded-[4px] p-2 transition hover:bg-slate-100">
                  <Ring value={v?.reach ?? 0} size={112} stroke={11} color={c} track="#EFEDE6">
                    <span className="font-display text-[22px] leading-none text-ink">
                      {v ? <CountUp value={v.reach} /> : "–"}
                      {v ? "%" : ""}
                    </span>
                  </Ring>
                  <span className="text-[13px] font-bold text-ink-2">{ui.marketsShort[k]}</span>
                </button>
              );
            })}
          </div>
          {gap !== null && (
            <p className={`mt-3 flex items-center justify-center gap-2 rounded-[4px] px-3 py-2 text-[13px] font-bold ${gap < 0 ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>
              {h.gap}
              <span className="num">
                {Math.abs(gap)} {h.pts}
              </span>
            </p>
          )}
        </Panel>
        <Panel title={h.sent} term={h.sentTerm}>
          <Insight>{fill(h.sentTake, { v: m.s.pos })}</Insight>
          <div className="flex h-3 overflow-hidden rounded-[2px]" dir="ltr">
            {(["neg", "neu", "pos"] as const).map((k) => (
              <span key={k} className="h-full transition-[flex-grow] duration-700" style={{ flexGrow: m.s[k] || 0.0001, background: SENT[k] }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
            {(["pos", "neu", "neg"] as const).map((k) => (
              <li key={k} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-2">
                  <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SENT[k] }} />
                  {ui.sent[k]}
                </span>
                <b className="num text-ink">{m.s[k]}%</b>
              </li>
            ))}
          </ul>
          {ds.openAlerts > 0 && (
            <Link href="/accuracy" className="group mt-4 flex items-center justify-between gap-3 rounded-[4px] border border-[#FBD3E0] bg-bad-soft p-3.5 transition hover:shadow-pop">
              <span className="flex items-center gap-3">
                <span className="font-display text-[28px] leading-none text-bad">{ds.openAlerts}</span>
                <span className="text-[12.5px]">
                  <b className="block text-ink">{h.wrong}</b>
                  <span className="text-ink-muted">{h.fixNow}</span>
                </span>
              </span>
              <span className="text-bad transition-transform group-hover:-translate-x-1 ltr:group-hover:translate-x-1">{arrow}</span>
            </Link>
          )}
        </Panel>
      </div>

      <Panel title={ui.overview.products} term={h.heatTerm} action={<span className="flex items-center gap-1.5 text-[12px] text-ink-muted"><Icon name="sparkle" size={13} />{h.heatHint}</span>}>
        {m.heat.length > 1 && (
          <Insight>
            {(() => {
              const tot = (r: (typeof m.heat)[number]) => r.cells.filter((v) => v !== null).reduce<number>((t, v) => t + (v ?? 0), 0) / Math.max(1, r.cells.filter((v) => v !== null).length);
              const best = m.heat[0];
              const worst = m.heat[m.heat.length - 1];
              return fill(ui.ins.products, { best: pName(best.key), bv: Math.round(tot(best)), worst: pName(worst.key), wv: Math.round(tot(worst)) });
            })()}
          </Insight>
        )}
        <Heatmap
          rows={m.heat}
          rowWidth="10rem"
          cols={ds.engines.map((e) => ({
            key: e.id,
            label: (
              <span className="inline-flex items-center gap-1.5 font-bold text-ink-2">
                {e.label}
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
              </span>
            ),
          }))}
          max={100}
          format={(v) => `${Math.round(v)}%`}
          tipText={(r, c, v) => (
            <span>
              <b>{pName(r)}</b> · {engLabel(c)}
              <br />
              {ui.kpi.reach}: {v}%
            </span>
          )}
          onSelect={(r, c) => setSel({ kind: "seg", kicker: ui.drawer.cell, title: `${pName(r)} · ${engLabel(c)}`, f: { pl: r, ch: c } })}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title={h.chat} term={h.chatTerm}>
          <AnswerPreview ds={ds} ui={ui} rows={m.cur} take={(n, t) => fill(h.chatTake, { n, t })} />
        </Panel>
        {plan && (
          <Panel className="flex flex-col lg:col-span-4" title={h.prog} term={h.progTerm}>
            <div className="flex items-end justify-between gap-2">
              <p className="font-display text-[40px] leading-none text-ink">
                <CountUp value={plan.done} />
                <span className="text-[18px] text-ink-muted">/{plan.statuses.length}</span>
              </p>
              <span className="rounded-[3px] bg-good-soft px-2 py-1 text-[12px] font-bold text-good">
                +{Math.max(0, Math.round((plan.target - plan.current) * 10) / 10)} {h.ptsExp}
              </span>
            </div>
            <div className="mt-3 flex gap-1" dir="ltr">
              {plan.statuses.map((st, i) => (
                <span key={i} className="h-2 flex-1 rounded-[1px]" style={{ background: st === "done" ? GOLD : st === "doing" ? NAVY : "#E3E0DC" }} />
              ))}
            </div>
            <div className="mt-4 rounded-[4px] border border-line p-2">
              <TrendLines
                height={150}
                data={plan.points}
                fmtDate={fmt}
                domain={[0, 100]}
                forecastFrom={plan.points.find((p) => p.withPlan !== undefined)?.date}
                forecastLabel={plan.labels.forecast}
                todayLabel={plan.labels.today}
                series={[
                  { key: "noAction", label: plan.labels.noAction, color: GREY, width: 1.5, dash: true },
                  { key: "withPlan", label: plan.labels.withPlan, color: GOLD, width: 2.5, dash: true },
                  { key: "actual", label: plan.labels.actual, color: GOLD, width: 2.5, area: true },
                ]}
              />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{fill(h.progTake, { d: plan.done, t: plan.statuses.length, to: plan.target })}</p>
            <Link href="/plan" className="mt-auto flex items-center justify-center gap-2 rounded-[4px] bg-navy px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-navy-700">
              <Icon name="rocket" size={16} />
              {ui.overview.openPlan}
            </Link>
          </Panel>
        )}
      </div>

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} onFocus={(nf) => { set(nf); setSel(null); }} />
    </div>
  );
}

