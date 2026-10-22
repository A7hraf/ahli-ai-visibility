"use client";

import { useMemo, useState } from "react";
import { bankSummary, breakdown, ranking, slice, weekly, BRAND_IDX, type Dataset } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { Delta, Heatmap, Insight, Panel, RampLegend, TipProvider, TipRow, useTip } from "@/components/viz/core";
import { useFilters } from "@/components/viz/filters";
import { PageHeader } from "@/components/ui";
import { CountUp } from "@/components/viz/motion";
import Details, { BankName, GOLD, bankColor, bankLabel, useFmtDate, type Sel } from "@/components/viz/Details";
import BumpChart from "@/components/viz/BumpChart";

export default function Competitors(props: { ds: Dataset; ui: UIText; lang: "en" | "ar" }) {
  return (
    <TipProvider>
      <Inner {...props} />
    </TipProvider>
  );
}

function PositionMap({ data, ui, onPick, ds }: { data: ReturnType<typeof ranking>; ui: UIText; onPick: (b: number) => void; ds: Dataset }) {
  const tip = useTip();
  const W = 640, H = 360, P = { l: 58, r: 20, t: 16, b: 40 };
  const maxX = Math.min(100, Math.ceil((Math.max(...data.map((d) => d.reach), 10) + 6) / 20) * 20);
  const maxY = Math.min(100, Math.ceil((Math.max(...data.map((d) => d.first), 10) + 6) / 20) * 20);
  const x = (v: number) => P.l + (v / maxX) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / maxY) * (H - P.t - P.b);
  const avgX = data.reduce((s, d) => s + d.reach, 0) / data.length;
  const avgY = data.reduce((s, d) => s + d.first, 0) / data.length;
  const rad = (d: (typeof data)[number]) => 12 + (d.top3 / 100) * 16;
  // place labels in priority order (Ahli first, then the most visible) and skip any that would collide
  const labels = new Map<number, { y: number }>();
  const boxes: { x1: number; x2: number; y1: number; y2: number }[] = [];
  for (const d of [...data].sort((a, b) => Number(b.isBrand) - Number(a.isBrand) || b.reach - a.reach)) {
    const w = bankLabel(ds, ui, d.b).length * 6.6;
    const cx = x(d.reach);
    for (const yy of [y(d.first) - rad(d) - 7, y(d.first) + rad(d) + 15]) {
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
        {/* the leaders' corner, split at the market average */}
        <rect x={x(avgX)} y={P.t} width={W - P.r - x(avgX)} height={y(avgY) - P.t} fill="#FBF5DF" rx={14} />
        {ticks(maxY).map((v) => (
          <g key={`y${v}`}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#EEF0F3" />
            <text x={P.l - 8} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#667085">
              {v}%
            </text>
          </g>
        ))}
        {ticks(maxX).map((v) => (
          <text key={`x${v}`} x={x(v)} y={H - P.b + 18} fontSize="11" textAnchor="middle" fill="#667085">
            {v}%
          </text>
        ))}
        <line x1={x(avgX)} x2={x(avgX)} y1={P.t} y2={H - P.b} stroke="#D0D5DD" />
        <line x1={P.l} x2={W - P.r} y1={y(avgY)} y2={y(avgY)} stroke="#D0D5DD" />
        <text x={x(avgX) + 10} y={P.t + 18} fontSize="12.5" fill="#A6841A" fontWeight="700" fontFamily="IBM Plex Sans Arabic, sans-serif">
          ★ {ui.lang === "ar" ? "منطقة القادة" : "Leaders' corner"}
        </text>
        <text x={P.l + 8} y={H - P.b - 10} fontSize="11.5" fill="#98A2B3" fontWeight="600">
          {ui.lang === "ar" ? "منخفض الظهور" : "Low visibility"}
        </text>
        <text x={(P.l + W - P.r) / 2} y={H - 4} fontSize="12" textAnchor="middle" fill="#66717E">
          {ui.competitors.mapX} →
        </text>
        <text x={14} y={(P.t + H - P.b) / 2} fontSize="12" textAnchor="middle" fill="#66717E" transform={`rotate(-90 14 ${(P.t + H - P.b) / 2})`}>
          {ui.competitors.mapY} →
        </text>
        {[...data].sort((a, b) => Number(a.isBrand) - Number(b.isBrand)).map((d) => {
          const r = rad(d);
          const name = bankLabel(ds, ui, d.b);
          const lab = labels.get(d.b);
          const c = bankColor(ds, d.b);
          const short = ds.bankShort[d.b];
          return (
            <g
              key={d.b}
              tabIndex={0}
              role="button"
              aria-label={name}
              onClick={() => onPick(d.b)}
              onKeyDown={(e) => e.key === "Enter" && onPick(d.b)}
              className="cursor-pointer outline-none transition-transform hover:scale-[1.04]"
              style={{ transformOrigin: `${x(d.reach)}px ${y(d.first)}px`, transformBox: "view-box" }}
              {...tip(
                <span className="flex flex-col gap-1">
                  <b>{name}</b>
                  <TipRow color={c} label={ui.kpi.reach} value={`${d.reach}%`} />
                  <TipRow label={ui.kpi.topMind} value={`${d.first}%`} />
                  <TipRow label={ui.kpi.shortlist} value={`${d.top3}%`} />
                </span>,
              )}
            >
              {d.isBrand && <circle cx={x(d.reach)} cy={y(d.first)} r={r + 7} fill={c} opacity={0.22} />}
              <circle cx={x(d.reach)} cy={y(d.first)} r={r} fill={c} fillOpacity={0.92} stroke="#fff" strokeWidth={3} />
              <text x={x(d.reach)} y={y(d.first) + 4} fontSize={short.length > 3 ? 9 : short.length > 2 ? 10.5 : 12.5} fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="IBM Plex Sans Arabic, sans-serif">
                {short}
              </text>
              {lab && (
                <text x={x(d.reach)} y={lab.y} fontSize="12" textAnchor="middle" fill={d.isBrand ? "#7D6312" : "#3A4A5C"} fontWeight={d.isBrand ? 700 : 600} paintOrder="stroke" stroke="#fff" strokeWidth={3.5}>
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
  const fmt = useFmtDate(lang);
  const ar = lang === "ar";

  const m = useMemo(() => {
    const { base, cur, prev } = slice(ds, f);
    const rank = ranking(ds, cur, prev);
    const enRows = cur.filter((x) => ds.prompts[x.p].lang === "en");
    const arRows = cur.filter((x) => ds.prompts[x.p].lang === "ar");
    const board = rank.map((r) => ({ ...r, en: bankSummary(enRows, r.b).reach, ar: bankSummary(arRows, r.b).reach }));
    // weekly rank of every bank, for the bump chart
    const weeks = ds.banks.map((_, b) => weekly(ds, base, b));
    const weekRanks = ds.runs.map((_, i) => {
      const order = ds.banks.map((__, b) => ({ b, v: weeks[b][i].reach, f: weeks[b][i].first, n: weeks[b][i].n })).sort((a, c) => c.v - a.v || c.f - a.f);
      const rk = new Map(order.map((o, j) => [o.b, o.n ? j + 1 : null]));
      return rk;
    });
    const products = [...new Set(ds.prompts.map((p) => p.product))];
    const byEngine = rank.map((r) => ({ b: r.b, cells: ds.engines.map((e) => breakdown(ds, cur, "engine", [e.id], r.b)[0]?.reach ?? null) }));
    const byProduct = rank.map((r) => ({ b: r.b, cells: products.map((p) => breakdown(ds, cur, "product", [p], r.b)[0]?.reach ?? null) }));
    return { rank, board, weeks, weekRanks, products, byEngine, byProduct, n: cur.length };
  }, [ds, f]);

  if (!m.n)
    return (
      <>
        <PageHeader kicker={ui.kick.competitors} title={ui.competitors.title} lead={ui.competitors.sub} />
        <div className="rounded-[4px] border border-dashed border-line-2 bg-white p-12 text-center text-ink-muted">{ui.overview.noData}</div>
      </>
    );

  const brand = m.rank.find((r) => r.isBrand)!;
  const pos = m.rank.indexOf(brand) + 1;
  const top = m.rank[0];
  const leader = top.isBrand ? m.rank[1] : top;
  const gap = Math.round((brand.reach - leader.reach) * 10) / 10;
  const name = (b: number) => bankLabel(ds, ui, b);
  const lc = bankColor(ds, leader.b);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker={ui.kick.competitors}
        title={ui.competitors.title}
        lead={
          <>
            {fill(ui.leads.competitors, { lead: name(m.rank[0].b), lv: m.rank[0].reach, rank: pos, n: ds.banks.length, v: brand.reach })}{" "}
            {brand.delta !== null && (brand.delta > 0.5 ? fill(ui.ins.up, { d: brand.delta }) : brand.delta < -0.5 ? fill(ui.ins.down, { d: Math.abs(brand.delta) }) : "")}
          </>
        }
      />

      {/* headline tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ui.competitors.position}</p>
          <p className="font-display text-[36px] leading-none text-navy">#{pos}</p>
          <p className="text-[12px] text-ink-muted">
            {ui.of} {ds.banks.length}
          </p>
        </div>
        <button onClick={() => setSel({ kind: "bank", b: leader.b })} className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5 text-start">
          <p className="text-[14px] font-bold text-ink">{ui.competitors.leader}</p>
          <p className="font-display text-[26px] leading-none" style={{ color: lc }}>
            {name(leader.b)}
          </p>
          <p className="num text-[12px] text-ink-muted">{leader.reach}%</p>
        </button>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ui.competitors.gap}</p>
          <p dir="ltr" className={`font-display text-[36px] leading-none ${gap < 0 ? "text-bad" : "text-good"}`} style={{ textAlign: ar ? "right" : "left" }}>
            {gap > 0 ? "+" : gap < 0 ? "−" : ""}
            {Math.abs(gap)}
          </p>
          <p className="text-[12px] text-ink-muted">{ui.competitors.gapUnit}</p>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ui.kpi.sov}</p>
          <p className="font-display text-[36px] leading-none text-navy">
            <CountUp value={brand.sov} />%
          </p>
          <div className="mt-auto flex h-2 gap-[2px] overflow-hidden rounded-[2px]" dir="ltr">
            {m.rank.map((r) => (
              <span key={r.b} style={{ flex: r.sov, background: r.isBrand ? GOLD : "#E3E0DC" }} title={`${name(r.b)} ${r.sov}%`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {ds.runs.length > 1 && (
          <Panel className="lg:col-span-7" title={ui.leads.rankRace} term={ui.leads.rankTerm}>
            <Insight>{gap < 0 ? fill(ui.ins.lead, { bank: name(leader.b), gap: Math.abs(gap) }) : ui.ins.weLead}</Insight>
          <BumpChart
            weeks={ds.runs.map((r) => r.date)}
            fmtDate={fmt}
            valueLabel={ui.kpi.reach}
            onPick={(b) => setSel({ kind: "bank", b })}
            series={ds.banks.map((_, b) => ({
              b,
              name: name(b),
              short: ds.bankShort[b],
              color: bankColor(ds, b),
              brand: b === BRAND_IDX,
              ranks: m.weekRanks.map((w) => w.get(b) ?? null),
              values: m.weeks[b].map((w) => (w.n ? w.reach : null)),
            }))}
          />
          </Panel>
        )}
        <Panel className={ds.runs.length > 1 ? "lg:col-span-5" : "lg:col-span-12"} title={ui.competitors.map} term={ui.leads.mapTerm}>
          <Insight>{ui.competitors.mapSub}</Insight>
          <PositionMap data={m.rank} ui={ui} ds={ds} onPick={(b) => setSel({ kind: "bank", b })} />
        </Panel>
      </div>

      <Panel title={ui.leads.board} term={ui.leads.scoreTerm}>
        <Insight>{ui.competitors.boardSub}</Insight>
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] font-bold text-ink-2">
                <th className="w-12 px-6 py-3 text-start font-medium">#</th>
                <th className="px-2 py-3 text-start font-medium">{ui.competitors.bank}</th>
                <th className="px-2 py-3 text-center font-medium">{ui.kpi.reach}</th>
                <th className="px-2 py-3 text-center font-medium">{ui.kpi.topMind}</th>
                <th className="px-2 py-3 text-center font-medium">{ui.kpi.shortlist}</th>
                <th className="px-2 py-3 text-center font-medium">{ui.competitors.avgPos}</th>
                <th className="px-2 py-3 text-center font-medium">{ui.marketsShort.ar}</th>
                <th className="px-2 py-3 text-center font-medium">{ui.marketsShort.en}</th>
                <th className="px-6 py-3 text-center font-medium">{ui.competitors.change}</th>
              </tr>
            </thead>
            <tbody>
              {m.board.map((r, i) => (
                <tr key={r.b} onClick={() => setSel({ kind: "bank", b: r.b })} className={`cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-slate-100 ${r.isBrand ? "bg-gold-100" : ""}`}>
                  <td className="num px-6 py-3 font-semibold text-ink-soft">{i + 1}</td>
                  <td className="px-2 py-3">
                    <BankName ds={ds} ui={ui} b={r.b} />
                  </td>
                  <td className="px-2 py-3">
                    <span className="flex items-center justify-center gap-2">
                      <span className="relative h-1.5 w-20 rounded-[2px] bg-slate-200" dir="ltr">
                        <span className="absolute inset-y-0 left-0 rounded-[2px]" style={{ width: `${(r.reach / Math.max(top.reach, 1)) * 100}%`, background: bankColor(ds, r.b) }} />
                      </span>
                      <b className="num w-12 text-ink">{r.reach}%</b>
                    </span>
                  </td>
                  <td className="num px-2 py-3 text-center">{r.first}%</td>
                  <td className="num px-2 py-3 text-center">{r.top3}%</td>
                  <td className="num px-2 py-3 text-center">{r.avgPos ?? "–"}</td>
                  <td className="num px-2 py-3 text-center">{r.ar}%</td>
                  <td className="num px-2 py-3 text-center">{r.en}%</td>
                  <td className="px-6 py-3 text-center">
                    <Delta v={r.delta} size="xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={ui.competitors.byChannel} sub={ui.competitors.heatSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
          <Heatmap
            max={100}
            rowWidth="11rem"
            format={(v) => `${Math.round(v)}`}
            cols={ds.engines.map((e) => ({ key: e.id, label: e.label }))}
            rows={m.byEngine.map((r) => ({ key: String(r.b), label: <BankName ds={ds} ui={ui} b={r.b} size={22} />, strong: r.b === BRAND_IDX, cells: r.cells }))}
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
            rowWidth="11rem"
            format={(v) => `${Math.round(v)}`}
            cols={m.products.map((p) => ({ key: p, label: ui.products[p as keyof UIText["products"]] ?? p }))}
            rows={m.byProduct.map((r) => ({ key: String(r.b), label: <BankName ds={ds} ui={ui} b={r.b} size={22} />, strong: r.b === BRAND_IDX, cells: r.cells }))}
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
