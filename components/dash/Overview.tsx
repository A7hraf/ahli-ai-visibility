"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bankSummary, breakdown, domainStats, lostTo, ranking, slice, weekly, BRAND_IDX, type Dataset, type Metric } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { BankBadge, BarList, ClickHint, Delta, Donut, Heatmap, Insight, Legend, Panel, RampLegend, Sparkline, Star, TipProvider, TipRow, useTip, Waffle } from "@/components/viz/core";
import { CountUp, Reveal, spotlight, useShown } from "@/components/viz/motion";
import { FilterBar, useFilters } from "@/components/viz/filters";
import Details, { BankName, DomainName, GOLD, GREY, KIND_COLOR, bankColor, bankLabel, domainColor, useFmtDate, type Sel } from "@/components/viz/Details";
import { AnswerPreview, Chapter, SectionNav } from "@/components/viz/story";
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

// each headline number has its own colour
const METRICS: { key: Metric; k: "reach" | "shortlist" | "topMind" | "sov"; color: string; tint: string; icon: string }[] = [
  { key: "reach", k: "reach", color: "#0F9F94", tint: "bg-turq-50", icon: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { key: "top3", k: "shortlist", color: "#1F86E0", tint: "bg-sky-50", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
  { key: "first", k: "topMind", color: "#7A4FE0", tint: "bg-violet-50", icon: "M12 2l3 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.9 3 1.1-6.5L2.5 8.9 9 8z" },
  { key: "sov", k: "sov", color: "#EB5E3A", tint: "bg-coral-50", icon: "M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z M16 8a5 5 0 0 1 0 8 M19 5a9 9 0 0 1 0 14" },
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
  const shown = useShown();
  const r = size / 2 - stroke / 2 - 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ direction: "ltr" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${shown ? C * Math.max(0.005, Math.min(1, value / 100)) : 0} ${C}`} style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function RaceTrack({ ds, ui, rank, lang, onPick }: { ds: Dataset; ui: UIText; rank: ReturnType<typeof ranking>; lang: "en" | "ar"; onPick: (b: number) => void }) {
  const shown = useShown();
  const tip = useTip();
  return (
    <ol className="flex flex-col gap-0.5">
      {rank.map((r, i) => {
        const c = bankColor(ds, r.b);
        const at = shown ? r.reach * SCALE : 0;
        return (
          <li key={r.b}>
            <button
              onClick={() => onPick(r.b)}
              {...tip(
                <span className="flex flex-col gap-1">
                  <b>{bankLabel(ds, ui, r.b)}</b>
                  <TipRow color={c} label={ui.kpi.reach} value={`${r.reach}%`} />
                  <TipRow label={ui.kpi.topMind} value={`${r.first}%`} />
                  {r.delta !== null && <TipRow label={ui.vsPrev} value={`${r.delta > 0 ? "+" : ""}${r.delta}`} />}
                </span>,
              )}
              className={`group grid w-full grid-cols-[18px_1fr] items-center gap-x-3 rounded-lg px-2.5 py-0.5 text-start transition-colors duration-150 hover:bg-slate-50 sm:grid-cols-[18px_minmax(110px,160px)_1fr] ${r.isBrand ? "bg-gold-50 ring-1 ring-gold-100" : ""}`}
            >
              <span className="num text-[12px] font-bold text-ink-soft">{i + 1}</span>
              <span dir="auto" className={`truncate text-[14px] ${r.isBrand ? "font-extrabold text-ink" : "font-medium text-ink-2"}`}>
                {bankLabel(ds, ui, r.b)}
              </span>
              {/* the track runs from the bank's name outward, in reading direction */}
              <span className="relative col-span-2 h-8 sm:col-span-1">
                <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-100" />
                {[25, 50, 75].map((g) => (
                  <span key={g} className="absolute bottom-1.5 top-1.5 w-px bg-slate-200/70" style={{ insetInlineStart: `${g * SCALE}%` }} />
                ))}
                <span
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full group-hover:h-2"
                  style={{ insetInlineStart: 0, width: `${at}%`, background: c, transition: `width 1.3s cubic-bezier(.2,.7,.2,1) ${i * 90}ms, height .2s` }}
                />
                <span
                  className={`absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rtl:translate-x-1/2 ${r.isBrand ? "pulse-gold rounded-full" : ""}`}
                  style={{ insetInlineStart: `${at}%`, transition: `inset-inline-start 1.3s cubic-bezier(.2,.7,.2,1) ${i * 90}ms` }}
                >
                  <BankBadge color={c} short={ds.bankShort[r.b]} size={r.isBrand ? 30 : 26} brand={r.isBrand} />
                </span>
                <span
                  className="num absolute top-1/2 -translate-y-1/2 whitespace-nowrap ps-5 text-[13px] font-bold text-ink"
                  style={{ insetInlineStart: `${at}%`, opacity: shown ? 1 : 0, transition: `inset-inline-start 1.3s cubic-bezier(.2,.7,.2,1) ${i * 90}ms, opacity .4s ${900 + i * 90}ms` }}
                >
                  {r.reach}%
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ChannelColumns({ ds, ui, m, onPick }: { ds: Dataset; ui: UIText; m: { channels: ReturnType<typeof breakdown>; chPrev: ReturnType<typeof breakdown> }; onPick: (id: string, label: string) => void }) {
  const shown = useShown();
  const tip = useTip();
  const top = Math.max(...m.channels.map((x) => x.reach), 1);
  return (
    <div className="grid grid-cols-5 items-end gap-3" style={{ height: 250 }} dir="ltr">
      {ds.engines.map((e, i) => {
        const c = m.channels.find((x) => x.key === e.id);
        const pv = m.chPrev.find((x) => x.key === e.id);
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
                  <TipRow label={ui.kpi.sov} value={`${c.sov}%`} />
                </span>
              ) : (
                e.label
              ),
            )}
            className="group flex h-full flex-col items-center justify-end gap-2 rounded-xl px-1 pt-2 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <span className="text-[18px] font-extrabold leading-none text-ink transition-transform group-hover:-translate-y-0.5">
              {c ? <CountUp value={c.reach} /> : "–"}
              {c ? "%" : ""}
            </span>
            <Delta v={c && pv ? c.reach - pv.reach : null} size="xs" />
            <span className="relative w-full max-w-[52px] flex-1 rounded-t-lg bg-slate-100">
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-lg group-hover:brightness-110"
                style={{
                  height: shown && c ? `${Math.max(3, (c.reach / top) * 100)}%` : "0%",
                  background: e.color,
                  transition: `height 1.1s cubic-bezier(.2,.7,.2,1) ${i * 110}ms, filter .2s`,
                }}
              />
            </span>
            <span className="flex items-center gap-1.5 truncate text-[13px] font-bold text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: e.color }} />{e.label}</span>
          </button>
        );
      })}
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
    const prodStats = breakdown(ds, cur, "product", products);
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
    return { s, p, rank, pos, leader, trend, spark, channels, chPrev, markets, prodStats, heat, lost, media, cur, n: cur.length };
  }, [ds, f, metric, ui]);

  if (!ds.runs.length || !m.n)
    return (
      <div className="flex flex-col gap-5">
        <FilterBar ds={ds} ui={ui} f={f} set={set} />
        <div className="rounded-4xl border border-dashed border-line bg-paper p-12 text-center text-ink-muted">{ui.overview.noData}</div>
      </div>
    );

  const metricDef = METRICS.find((x) => x.key === metric);
  const arM = m.markets.find((x) => x.key === "ar");
  const enM = m.markets.find((x) => x.key === "en");
  const gap = arM && enM ? Math.round((enM.reach - arM.reach) * 10) / 10 : null;
  const sentData = [
    { key: "pos", label: ui.sent.pos, value: m.s.pos, color: "#16A34A" },
    { key: "neu", label: ui.sent.neu, value: m.s.neu, color: "#D0D5DD" },
    { key: "neg", label: ui.sent.neg, value: m.s.neg, color: "#DB2B39" },
  ];
  const sov = [...m.rank].sort((a, b) => b.sov - a.sov);
  const arrow = ar ? "←" : "→";
  const brandRow = m.rank.find((r) => r.isBrand)!;
  const leadGap = Math.round((m.leader.reach - brandRow.reach) * 10) / 10;
  const chSorted = [...m.channels].sort((a, b) => b.reach - a.reach);
  const engLabel = (id: string) => ds.engines.find((e) => e.id === id)?.label ?? id;
  const prodSorted = [...m.prodStats].filter((x) => x.key !== "brand").sort((a, b) => b.reach - a.reach);
  const pName = (k: string) => ui.products[k as keyof UIText["products"]] ?? k;
  const dIdx = m.p ? Math.round((m.s.reach - m.p.reach) * 10) / 10 : null;

  const chapters = [
    { id: "now", label: ui.story.s1 },
    { id: "rivals", label: ui.story.s2 },
    { id: "where", label: ui.story.s3 },
    { id: "eyes", label: ui.story.s4 },
    { id: "sources", label: ui.story.s5 },
    ...(plan ? [{ id: "next", label: ui.story.s6 }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />
      <SectionNav items={chapters} label={ui.story.jump} />

      {/* 1. WHERE ARE WE TODAY */}
      <Chapter id="now" n={1} title={ui.story.s1}>
        {/* KPI row: the five numbers that matter, all clickable */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Reveal>
            <div
              {...pressable(() => setMetric("index"))}
              aria-pressed={metric === "index"}
              className={`group flex h-full flex-col gap-3 rounded-2xl border bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop ${metric === "index" ? "border-gold ring-2 ring-gold/30" : "border-line"}`}
            >
              <span className="flex items-center justify-between gap-2 text-[13.5px] font-bold text-ink-2">
                {ui.kpi.index}
                <InfoTip text={ui.help.index} />
              </span>
              <div className="flex items-center gap-3">
                <Ring value={m.s.index} color="#C9A227" track="#F2F4F7" size={76} stroke={8}>
                  <span className="text-[22px] font-extrabold leading-none text-ink">
                    <CountUp value={m.s.index} />
                  </span>
                </Ring>
                <div>
                  <p className="text-[12px] text-ink-muted">{ui.kpi.rank}</p>
                  <p className="text-[24px] font-extrabold leading-none text-ink">
                    #{m.pos}
                    <span className="ms-1 text-[13px] font-medium text-ink-muted">
                      {ui.of} {ds.banks.length}
                    </span>
                  </p>
                </div>
              </div>
              <span className="mt-auto flex items-center gap-1.5">
                <Delta v={m.p ? m.s.index - m.p.index : null} />
                <span className="truncate text-[12px] text-ink-muted">{ui.vsPrev}</span>
              </span>
            </div>
          </Reveal>
          {METRICS.map((k, i) => {
            const v = m.s[k.key];
            const pv = m.p ? m.p[k.key] : null;
            const on = metric === k.key;
            return (
              <Reveal key={k.key} delay={(i + 1) * 70}>
                <div
                  {...pressable(() => setMetric(k.key))}
                  aria-pressed={on}
                  className={`group flex h-full flex-col gap-2 rounded-2xl border bg-white p-4 text-start shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop ${on ? "ring-2" : "border-line"}`}
                  style={on ? { borderColor: k.color, ["--tw-ring-color" as string]: `${k.color}33` } : undefined}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110" style={{ background: `${k.color}17`, color: k.color }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={k.icon} />
                        </svg>
                      </span>
                      {ui.kpi[k.k]}
                    </span>
                    <InfoTip text={ui.help[k.k]} />
                  </span>
                  <span className="text-[30px] font-extrabold leading-none text-ink">
                    <CountUp value={v} />
                    <span className="text-[17px] font-bold text-ink-muted">%</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Delta v={pv !== null ? v - pv : null} />
                    <span className="truncate text-[12px] text-ink-muted">{ui.vsPrev}</span>
                  </span>
                  <span className="mt-auto">
                    <Sparkline data={m.spark(k.key)} color={k.color} w={220} h={32} />
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <Panel className="lg:col-span-8" accent={GOLD} title={ui.overview.race} sub={ui.overview.rankSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
            <Insight tone={m.pos === 1 ? "good" : "gold"}>
              {ar ? (
                <>
                  الذكاء الاصطناعي يذكرنا في <b>{m.s.reach}%</b> من إجاباته، وترتيبنا <b>#{m.pos}</b> من {ds.banks.length} بنوك.
                </>
              ) : (
                <>
                  AI mentions us in <b>{m.s.reach}%</b> of its answers. We rank <b>#{m.pos}</b> of {ds.banks.length} banks.
                </>
              )}
            </Insight>
            <RaceTrack ds={ds} ui={ui} rank={m.rank} lang={lang} onPick={(b) => setSel({ kind: "bank", b })} />
          </Panel>
          <Panel className="flex flex-col lg:col-span-4" accent={GOLD} title={ui.kpi.reach} sub={ui.term.reach}>
            <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-4 text-center">
              <Waffle value={m.s.reach} empty="#EEF0F3" size={16} gap={6} />
              <p className="text-[16px] font-bold leading-snug text-ink">
                {ar ? "من كل 100 إجابة، " : "Out of every 100 answers, "}
                <span className="text-[26px] font-extrabold text-gold-600">
                  <CountUp value={Math.round(m.s.reach)} />
                </span>
                {ar ? " تذكرنا" : " mention us"}
              </p>
            </div>
          </Panel>
        </div>
      </Chapter>

      {/* 2. WHO'S AHEAD */}
      <Chapter id="rivals" n={2} title={ui.story.s2}>
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel
            className="lg:col-span-8"
            accent={metricDef?.color ?? GOLD}
            title={`${ui.overview.trend} · ${metricDef ? ui.kpi[metricDef.k] : ui.kpi.index}`}
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
            <Insight tone={leadGap > 0 ? "bad" : "good"}>{leadGap > 0 ? fill(ui.ins.lead, { bank: bankLabel(ds, ui, m.leader.b), gap: leadGap }) : ui.ins.weLead}</Insight>
            <TrendLines
              height={290}
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
              <ClickHint>{ar ? "اضغط على أي أسبوع لتفاصيله" : "Tap any week for its details"}</ClickHint>
            </div>
          </Panel>
          <Panel className="lg:col-span-4" accent="#EB5E3A" title={ui.kpi.sov} sub={ui.term.sov}>
            <Insight>{fill(ui.ins.sov, { n: Math.max(0, Math.round(m.s.sov / 10)) || "<1" })}</Insight>
            <Donut
              size={176}
              thickness={26}
              onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
              data={sov.map((r) => ({ key: String(r.b), label: bankLabel(ds, ui, r.b), value: r.sov, color: bankColor(ds, r.b) }))}
              center={
                <>
                  <BankBadge color={GOLD} short={ds.bankShort[BRAND_IDX]} size={30} brand />
                  <span className="mt-1.5 font-display text-[26px] font-bold leading-none text-ink">
                    <CountUp value={m.s.sov} />%
                  </span>
                </>
              }
            />
            <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-1">
              {sov.map((r) => (
                <li key={r.b}>
                  <button onClick={() => setSel({ kind: "bank", b: r.b })} className={`group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-start text-[12px] transition hover:bg-paper ${r.isBrand ? "bg-gold-50" : ""}`}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-150" style={{ background: bankColor(ds, r.b) }} />
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
      </Chapter>

      {/* 3. WHERE WE WIN AND LOSE */}
      <Chapter id="where" n={3} title={ui.story.s3}>
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel className="lg:col-span-7" accent="#1F86E0" title={ui.overview.channels} sub={ui.overview.channelsSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
            {chSorted.length > 1 && <Insight>{fill(ui.ins.channels, { best: engLabel(chSorted[0].key), bv: chSorted[0].reach, worst: engLabel(chSorted[chSorted.length - 1].key), wv: chSorted[chSorted.length - 1].reach })}</Insight>}
            <ChannelColumns ds={ds} ui={ui} m={m} onPick={(id, label) => setSel({ kind: "seg", kicker: ui.drawer.channel, title: label, f: { ch: id } })} />
          </Panel>
          <Panel className="lg:col-span-5" accent="#0F9F94" title={ui.overview.markets} sub={ui.overview.marketsSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
            {gap !== null && <Insight tone={gap > 10 ? "bad" : "good"}>{gap > 5 ? fill(ui.ins.lang, { gap }) : ui.ins.langOk}</Insight>}
            <div className="flex items-start justify-around gap-3">
              {(["ar", "en"] as const).map((k) => {
                const v = m.markets.find((x) => x.key === k);
                return (
                  <button key={k} disabled={!v} onClick={() => setSel({ kind: "seg", kicker: ui.drawer.market, title: ui.markets[k], f: { mk: k } })} className="group flex flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-slate-50">
                    <Ring value={v?.reach ?? 0} size={136} stroke={14} color={MARKET_COLOR[k]} track="#F2F4F7">
                      <span className="font-display text-[32px] font-bold leading-none" style={{ color: MARKET_COLOR[k] }}>
                        {v ? <CountUp value={v.reach} /> : "–"}
                        {v ? "%" : ""}
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
          </Panel>
          <Panel className="lg:col-span-12" accent="#0F9F94" title={ui.overview.products} sub={ui.overview.productsSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
            {prodSorted.length > 1 && <Insight>{fill(ui.ins.products, { best: pName(prodSorted[0].key), bv: prodSorted[0].reach, worst: pName(prodSorted[prodSorted.length - 1].key), wv: prodSorted[prodSorted.length - 1].reach })}</Insight>}
            <Heatmap
              rows={m.heat}
              rowWidth="10rem"
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
                  <b>{pName(r)}</b> · {engLabel(c)}
                  <br />
                  {ui.kpi.reach}: {v}%
                </span>
              )}
              onSelect={(r, c) => setSel({ kind: "seg", kicker: ui.drawer.cell, title: `${pName(r)} · ${engLabel(c)}`, f: { pl: r, ch: c } })}
            />
          </Panel>
        </div>
      </Chapter>

      {/* 4. THROUGH THE CUSTOMER'S EYES */}
      <Chapter id="eyes" n={4} title={ui.story.s4}>
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel className="lg:col-span-8" accent="#7A4FE0" title={ar ? "اسأل مثل العميل، وشوف الرد" : "Ask like a customer, see the reply"} sub={ar ? "إجابات حقيقية من آخر أسبوع. غيّر المساعد من الأزرار." : "Real answers from the latest week. Switch assistants with the buttons."}>
            <AnswerPreview ds={ds} ui={ui} rows={m.cur} />
          </Panel>
          <Panel className="lg:col-span-4" accent="#16A34A" title={ui.overview.sentiment} sub={ui.overview.sentimentSub}>
            <Donut
              thickness={20}
              data={sentData}
              center={
                <>
                  <span className="font-display text-[34px] font-bold leading-none text-good">
                    <CountUp value={m.s.pos} />%
                  </span>
                  <span className="mt-1 text-[11.5px] text-ink-muted">{ui.sent.pos}</span>
                </>
              }
            />
            <Legend className="mt-4 justify-center" items={sentData.map((d) => ({ label: d.label, color: d.color, value: `${d.value}%` }))} />
            {ds.openAlerts > 0 && (
              <Link href="/accuracy" className="group mt-5 flex items-center gap-3 rounded-xl border border-bad/20 bg-bad-soft p-3.5 transition hover:shadow-card">
                <span className="font-display text-[26px] font-bold leading-none text-bad">{ds.openAlerts}</span>
                <span className="text-[12.5px] font-medium text-ink">
                  {ui.kpi.alerts} <span className="inline-block transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">{arrow}</span>
                </span>
              </Link>
            )}
          </Panel>
        </div>
      </Chapter>

      {/* 5. WHERE AI GETS ITS INFO */}
      <Chapter id="sources" n={5} title={ui.story.s5}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            accent="#1F86E0"
            title={ui.overview.media}
            sub={ui.overview.mediaSub}
            action={
              <Link href="/sources" className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-bold text-ink transition hover:bg-slate-50">
                {ui.nav.sources} {arrow}
              </Link>
            }
          >
            {m.media.domains[0] && <Insight>{fill(ui.ins.sources, { site: m.media.domains[0].d })}</Insight>}
            {m.media.total ? (
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <Donut
                  size={156}
                  thickness={22}
                  data={m.media.kinds.map((k) => ({ key: k.k, label: ui.media[k.k], value: k.n, color: KIND_COLOR[k.k] }))}
                  center={
                    <>
                      <span className="font-display text-[26px] font-bold leading-none text-gold-700">
                        <CountUp value={m.media.ownRate} />%
                      </span>
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
          <Panel accent="#DB2B39" title={ui.overview.lost} sub={ui.overview.lostSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
            {m.lost.banks[0] && <Insight tone="bad">{fill(ui.ins.lost, { bank: bankLabel(ds, ui, m.lost.banks[0].b) })}</Insight>}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-slate-50 p-3.5">
              <span className="font-display text-[30px] font-bold leading-none text-bad">
                <CountUp value={Math.round((1000 * m.lost.missed) / m.n) / 10} />%
              </span>
              <span className="text-[12.5px] leading-snug text-ink-muted">{ui.overview.missing}</span>
            </div>
            <BarList
              labelWidth="w-44"
              onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
              items={m.lost.banks.slice(0, 6).map((b) => ({ key: String(b.b), label: <BankName ds={ds} ui={ui} b={b.b} />, value: b.share, color: bankColor(ds, b.b) }))}
            />
          </Panel>
        </div>
      </Chapter>

      {/* 6. WHAT'S NEXT */}
      {plan && (
        <Chapter id="next" n={6} title={ui.story.s6}>
          <Panel
            tone="gold"
            title={ui.overview.plan}
            sub={ui.overview.planSub}
            action={
              <Link href="/plan" className="group rounded-lg bg-navy px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-navy-700">
                {ui.overview.openPlan} <span className="inline-block transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">{arrow}</span>
              </Link>
            }
          >
            {dIdx !== null && <Insight tone={dIdx >= 0 ? "good" : "bad"}>{dIdx > 0.5 ? fill(ui.ins.up, { d: dIdx }) : dIdx < -0.5 ? fill(ui.ins.down, { d: Math.abs(dIdx) }) : ui.ins.flat}</Insight>}
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-5 lg:col-span-4">
                <div className="rounded-xl border border-line p-5">
                  <p className="text-[12px] text-ink-muted">{ui.plan.progress}</p>
                  <p className="mt-1 text-[32px] font-extrabold leading-none text-ink">
                    <CountUp value={plan.done} />
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
                <div className="rounded-xl border border-gold-100 bg-gold-50 p-5">
                  <p className="text-[13px] font-bold text-gold-700">{ui.overview.forecastTo}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-[22px] font-bold text-ink-muted">{plan.current}%</span>
                    <span className="text-ink-soft">{arrow}</span>
                    <span className="text-[38px] font-extrabold leading-none text-gold-700">
                      <CountUp value={plan.target} />%
                    </span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-muted">{ui.term.reach}</p>
                </div>
              </div>
              <div className="rounded-xl border border-line p-4 lg:col-span-8">
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
        </Chapter>
      )}

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} onFocus={(nf) => { set(nf); setSel(null); }} />
    </div>
  );
}
