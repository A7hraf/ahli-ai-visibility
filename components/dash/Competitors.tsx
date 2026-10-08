"use client";

import { useMemo, useState } from "react";
import { bankSummary, breakdown, ranking, slice, weekly, BRAND_IDX, type Dataset } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { ClickHint, Delta, Heatmap, Legend, Panel, RampLegend, TipProvider, TipRow, useTip } from "@/components/viz/core";
import { FilterBar, useFilters } from "@/components/viz/filters";
import Details, { GOLD, NAVY, bankLabel, useFmtDate, type Sel } from "@/components/viz/Details";
import TrendLines from "@/components/viz/TrendLines";

const OTHER = "#7E93A9";

export default function Competitors(props: { ds: Dataset; ui: UIText; lang: "en" | "ar" }) {
  return (
    <TipProvider>
      <Inner {...props} />
    </TipProvider>
  );
}

function PositionMap({ data, ui, onPick, ds }: { data: ReturnType<typeof ranking>; ui: UIText; onPick: (b: number) => void; ds: Dataset }) {
  const tip = useTip();
  const W = 640, H = 340, P = { l: 58, r: 20, t: 16, b: 38 };
  const maxX = Math.min(100, Math.ceil((Math.max(...data.map((d) => d.reach), 10) + 6) / 20) * 20);
  const maxY = Math.min(100, Math.ceil((Math.max(...data.map((d) => d.first), 10) + 6) / 20) * 20);
  const x = (v: number) => P.l + (v / maxX) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / maxY) * (H - P.t - P.b);
  const avgX = data.reduce((s, d) => s + d.reach, 0) / data.length;
  const avgY = data.reduce((s, d) => s + d.first, 0) / data.length;
  const rad = (d: (typeof data)[number]) => 7 + (d.top3 / 100) * 18;
  // place labels in priority order (Ahli first, then the most visible) and skip any that would collide
  const labels = new Map<number, { y: number }>();
  const boxes: { x1: number; x2: number; y1: number; y2: number }[] = [];
  for (const d of [...data].sort((a, b) => Number(b.isBrand) - Number(a.isBrand) || b.reach - a.reach)) {
    const w = bankLabel(ds, ui, d.b).length * 6.4;
    const cx = x(d.reach);
    for (const yy of [y(d.first) - rad(d) - 6, y(d.first) + rad(d) + 14]) {
      const box = { x1: cx - w / 2, x2: cx + w / 2, y1: yy - 11, y2: yy + 2 };
      const hitsLabel = boxes.some((o) => box.x1 < o.x2 && box.x2 > o.x1 && box.y1 < o.y2 && box.y2 > o.y1);
      const hitsBubble = data.some((o) => o.b !== d.b && Math.abs(x(o.reach) - cx) < w / 2 + rad(o) && yy - 11 < y(o.first) + rad(o) && yy + 2 > y(o.first) - rad(o));
      if (!hitsLabel && !hitsBubble && box.y1 > P.t - 4 && box.y2 < H - P.b) {
        labels.set(d.b, { y: yy });
        boxes.push(box);
        break;
      }
    }
  }
  const ticks = (max: number) => [0, max / 4, max / 2, (3 * max) / 4, max].map((v) => Math.round(v));
  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ui.competitors.map}>
        {/* quadrants split at the market average */}
        <rect x={x(avgX)} y={P.t} width={W - P.r - x(avgX)} height={y(avgY) - P.t} fill="#F7F5E6" opacity={0.7} />
        {ticks(maxY).map((v) => (
          <g key={`y${v}`}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#EDF1F5" />
            <text x={P.l - 8} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#7A8A9C">
              {v}%
            </text>
          </g>
        ))}
        {ticks(maxX).map((v) => (
          <text key={`x${v}`} x={x(v)} y={H - P.b + 18} fontSize="11" textAnchor="middle" fill="#7A8A9C">
            {v}%
          </text>
        ))}
        <line x1={x(avgX)} x2={x(avgX)} y1={P.t} y2={H - P.b} stroke="#CBD5E1" />
        <line x1={P.l} x2={W - P.r} y1={y(avgY)} y2={y(avgY)} stroke="#CBD5E1" />
        <text x={x(avgX) + 8} y={P.t + 14} fontSize="11" fill="#8A7F2A" fontWeight="600">
          {ui.lang === "ar" ? "القادة" : "Leaders"}
        </text>
        <text x={P.l + 6} y={H - P.b - 8} fontSize="11" fill="#94A3B8" fontWeight="600">
          {ui.lang === "ar" ? "منخفض الظهور" : "Low visibility"}
        </text>
        <text x={(P.l + W - P.r) / 2} y={H - 4} fontSize="11.5" textAnchor="middle" fill="#566578">
          {ui.competitors.mapX}
        </text>
        <text x={14} y={(P.t + H - P.b) / 2} fontSize="11.5" textAnchor="middle" fill="#566578" transform={`rotate(-90 14 ${(P.t + H - P.b) / 2})`}>
          {ui.competitors.mapY}
        </text>
        {[...data].sort((a, b) => Number(a.isBrand) - Number(b.isBrand)).map((d) => {
          const r = rad(d);
          const name = bankLabel(ds, ui, d.b);
          const lab = labels.get(d.b);
          return (
            <g
              key={d.b}
              tabIndex={0}
              role="button"
              aria-label={name}
              onClick={() => onPick(d.b)}
              onKeyDown={(e) => e.key === "Enter" && onPick(d.b)}
              className="cursor-pointer outline-none [&:focus>circle]:stroke-brand [&:hover>circle]:opacity-100"
              {...tip(
                <span className="flex flex-col gap-1">
                  <b>{name}</b>
                  <TipRow label={ui.kpi.reach} value={`${d.reach}%`} />
                  <TipRow label={ui.kpi.topMind} value={`${d.first}%`} />
                  <TipRow label={ui.kpi.shortlist} value={`${d.top3}%`} />
                </span>,
              )}
            >
              <circle cx={x(d.reach)} cy={y(d.first)} r={Math.max(r, 12)} fill="transparent" />
              <circle cx={x(d.reach)} cy={y(d.first)} r={r} fill={d.isBrand ? GOLD : NAVY} opacity={d.isBrand ? 0.95 : 0.55} stroke="#fff" strokeWidth={2} />
              {lab && (
                <text x={x(d.reach)} y={lab.y} fontSize="11.5" textAnchor="middle" fill={d.isBrand ? "#6E6520" : "#33475C"} fontWeight={d.isBrand ? 700 : 500} paintOrder="stroke" stroke="#fff" strokeWidth={3}>
                  {name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Inner({ ds, ui, lang }: { ds: Dataset; ui: UIText; lang: "en" | "ar" }) {
  const { f, set } = useFilters();
  const [sel, setSel] = useState<Sel | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const fmt = useFmtDate(lang);

  const m = useMemo(() => {
    const { base, cur, prev } = slice(ds, f);
    const rank = ranking(ds, cur, prev);
    const enRows = cur.filter((x) => ds.prompts[x.p].lang === "en");
    const arRows = cur.filter((x) => ds.prompts[x.p].lang === "ar");
    const board = rank.map((r) => ({ ...r, en: bankSummary(enRows, r.b).reach, ar: bankSummary(arRows, r.b).reach }));
    const weeks = ds.banks.map((_, b) => weekly(ds, base, b));
    const trend = ds.runs.map((run, i) => {
      const o: Record<string, number | string | undefined> = { date: run.date };
      ds.banks.forEach((_, b) => (o[`b${b}`] = weeks[b][i].n ? weeks[b][i].reach : undefined));
      return o;
    });
    const products = [...new Set(ds.prompts.map((p) => p.product))];
    const byEngine = rank.map((r) => ({ b: r.b, cells: ds.engines.map((e) => breakdown(ds, cur, "engine", [e.id], r.b)[0]?.reach ?? null) }));
    const byProduct = rank.map((r) => ({ b: r.b, cells: products.map((p) => breakdown(ds, cur, "product", [p], r.b)[0]?.reach ?? null) }));
    return { rank, board, trend, products, byEngine, byProduct, n: cur.length };
  }, [ds, f]);

  if (!m.n)
    return (
      <div className="flex flex-col gap-5">
        <FilterBar ds={ds} ui={ui} f={f} set={set} />
        <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center text-ink-muted">{ui.overview.noData}</div>
      </div>
    );

  const brand = m.rank.find((r) => r.isBrand)!;
  const pos = m.rank.indexOf(brand) + 1;
  const top = m.rank[0];
  const leader = top.isBrand ? m.rank[1] : top;
  const gap = Math.round((brand.reach - leader.reach) * 10) / 10;
  const hi = focus ?? leader.b;
  const name = (b: number) => bankLabel(ds, ui, b);

  return (
    <div className="flex flex-col gap-5">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-card">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <p className="relative text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-400">{ui.competitors.position}</p>
          <p className="relative mt-3 text-[44px] font-semibold leading-none">
            #{pos}
            <span className="ms-1 text-[15px] font-normal text-white/60">
              {ui.of} {ds.banks.length}
            </span>
          </p>
        </div>
        <button onClick={() => setSel({ kind: "bank", b: leader.b })} className="flex flex-col rounded-2xl border border-line bg-white p-5 text-start shadow-card transition hover:-translate-y-0.5 hover:border-brand-300">
          <p className="text-[12.5px] font-medium text-ink-muted">{ui.competitors.leader}</p>
          <p className="mt-2 text-[22px] font-semibold leading-tight text-ink">{name(leader.b)}</p>
          <p className="mt-auto pt-2 text-[12.5px] text-ink-muted">
            {ui.kpi.reach} <b className="text-ink">{leader.reach}%</b>
          </p>
        </button>
        <div className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-muted">{ui.competitors.gap}</p>
          <p className={`mt-2 text-[38px] font-semibold leading-none ${gap < 0 ? "text-bad" : "text-good"}`}>
            {gap > 0 ? "+" : gap < 0 ? "−" : ""}
            {Math.abs(gap)}
          </p>
          <p className="mt-auto pt-2 text-[12.5px] text-ink-muted">{ui.competitors.gapUnit}</p>
        </div>
        <div className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-muted">{ui.kpi.sov}</p>
          <p className="mt-2 flex items-baseline gap-2 text-[38px] font-semibold leading-none text-ink">
            {brand.sov}%
          </p>
          <div className="mt-auto flex h-2 gap-0.5 overflow-hidden rounded-full pt-0" dir="ltr">
            {m.rank.map((r) => (
              <span key={r.b} style={{ flex: r.sov, background: r.isBrand ? GOLD : r.b === leader.b ? NAVY : "#D4DCE5" }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-7" title={ui.competitors.map} sub={ui.competitors.mapSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <PositionMap data={m.rank} ui={ui} ds={ds} onPick={(b) => setSel({ kind: "bank", b })} />
        </Panel>
        <Panel className="lg:col-span-5" title={ui.competitors.trend} sub={ui.competitors.trendSub}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {m.rank
              .filter((r) => !r.isBrand)
              .map((r) => (
                <button
                  key={r.b}
                  onClick={() => setFocus(r.b)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${hi === r.b ? "bg-navy text-white" : "bg-slate-100 text-ink-muted hover:bg-slate-200"}`}
                >
                  {name(r.b)}
                </button>
              ))}
          </div>
          <TrendLines
            height={250}
            data={m.trend}
            fmtDate={fmt}
            series={[
              ...m.rank.filter((r) => !r.isBrand && r.b !== hi).map((r) => ({ key: `b${r.b}`, label: name(r.b), color: OTHER, width: 1.2, dim: true })),
              { key: `b${hi}`, label: name(hi), color: NAVY, width: 2.5 },
              { key: `b${BRAND_IDX}`, label: name(BRAND_IDX), color: GOLD, width: 3 },
            ]}
          />
          <Legend
            className="mt-2"
            items={[
              { label: name(BRAND_IDX), color: GOLD, line: true },
              { label: name(hi), color: NAVY, line: true },
              { label: lang === "ar" ? "بنوك أخرى" : "Other banks", color: "#C3CDD8", line: true },
            ]}
          />
        </Panel>
      </div>

      <Panel title={ui.competitors.board} sub={ui.competitors.boardSub}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wide text-ink-muted">
                <th className="w-12 px-5 py-2.5 text-start font-medium">#</th>
                <th className="px-2 py-2.5 text-start font-medium">{ui.competitors.bank}</th>
                <th className="w-[24%] px-2 py-2.5 text-start font-medium">{ui.kpi.reach}</th>
                <th className="px-2 py-2.5 text-center font-medium">{ui.kpi.topMind}</th>
                <th className="px-2 py-2.5 text-center font-medium">{ui.kpi.shortlist}</th>
                <th className="px-2 py-2.5 text-center font-medium">{ui.competitors.avgPos}</th>
                <th className="px-2 py-2.5 text-center font-medium">{ui.marketsShort.ar}</th>
                <th className="px-2 py-2.5 text-center font-medium">{ui.marketsShort.en}</th>
                <th className="px-5 py-2.5 text-center font-medium">{ui.competitors.change}</th>
              </tr>
            </thead>
            <tbody>
              {m.board.map((r, i) => (
                <tr key={r.b} onClick={() => setSel({ kind: "bank", b: r.b })} className={`cursor-pointer border-b border-line transition last:border-0 hover:bg-canvas ${r.isBrand ? "bg-gold-50/70" : ""}`}>
                  <td className="num px-5 py-3 font-semibold text-ink-soft">{i + 1}</td>
                  <td className="px-2 py-3">
                    <span className={`flex items-center gap-2 ${r.isBrand ? "font-semibold text-ink" : "text-ink-2"}`}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.isBrand ? GOLD : r.b === leader.b ? NAVY : "#C3CDD8" }} />
                      {name(r.b)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-3">
                      <span className="relative h-2 flex-1 rounded-full bg-slate-100">
                        <span className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${(r.reach / Math.max(top.reach, 1)) * 100}%`, background: r.isBrand ? GOLD : r.b === leader.b ? NAVY : "#9AA8B8" }} />
                      </span>
                      <b className="num w-12 text-end font-semibold text-ink">{r.reach}%</b>
                    </span>
                  </td>
                  <td className="num px-2 py-3 text-center">{r.first}%</td>
                  <td className="num px-2 py-3 text-center">{r.top3}%</td>
                  <td className="num px-2 py-3 text-center">{r.avgPos ?? "–"}</td>
                  <td className="num px-2 py-3 text-center">{r.ar}%</td>
                  <td className="num px-2 py-3 text-center">{r.en}%</td>
                  <td className="px-5 py-3 text-center">
                    <Delta v={r.delta} size="xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={ui.competitors.byChannel} sub={ui.competitors.heatSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
          <Heatmap
            max={100}
            format={(v) => `${Math.round(v)}`}
            cols={ds.engines.map((e) => ({ key: e.id, label: e.label }))}
            rows={m.byEngine.map((r) => ({ key: String(r.b), label: name(r.b), strong: r.b === BRAND_IDX, cells: r.cells }))}
            tipText={(rk, c, v) => (
              <span>
                <b>{name(Number(rk))}</b> · {ds.engines.find((e) => e.id === c)?.label}
                <br />
                {ui.kpi.reach}: {v}%
              </span>
            )}
            onSelect={(rk, c) => setSel({ kind: "bank", b: Number(rk), f: { ch: c }, kicker: `${ui.drawer.bank} · ${ds.engines.find((e) => e.id === c)?.label}` })}
          />
        </Panel>
        <Panel title={ui.competitors.byProduct} sub={ui.competitors.heatSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
          <Heatmap
            max={100}
            format={(v) => `${Math.round(v)}`}
            cols={m.products.map((p) => ({ key: p, label: ui.products[p as keyof UIText["products"]] ?? p }))}
            rows={m.byProduct.map((r) => ({ key: String(r.b), label: name(r.b), strong: r.b === BRAND_IDX, cells: r.cells }))}
            tipText={(rk, c, v) => (
              <span>
                <b>{name(Number(rk))}</b> · {ui.products[c as keyof UIText["products"]]}
                <br />
                {ui.kpi.reach}: {v}%
              </span>
            )}
            onSelect={(rk, c) => setSel({ kind: "bank", b: Number(rk), f: { pl: c }, kicker: `${ui.drawer.bank} · ${ui.products[c as keyof UIText["products"]]}` })}
          />
        </Panel>
      </div>

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} onFocus={(nf) => { set(nf); setSel(null); }} />
    </div>
  );
}
