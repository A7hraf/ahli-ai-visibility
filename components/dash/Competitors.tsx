"use client";

import { useMemo, useState } from "react";
import { bankSummary, breakdown, ranking, slice, weekly, BRAND_IDX, type Dataset } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { BankBadge, ClickHint, Delta, Heatmap, Insight, Panel, RampLegend, Star, TipProvider, TipRow, useTip } from "@/components/viz/core";
import { FilterBar, useFilters } from "@/components/viz/filters";
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
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#EFE8DB" />
            <text x={P.l - 8} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#8C8371">
              {v}%
            </text>
          </g>
        ))}
        {ticks(maxX).map((v) => (
          <text key={`x${v}`} x={x(v)} y={H - P.b + 18} fontSize="11" textAnchor="middle" fill="#8C8371">
            {v}%
          </text>
        ))}
        <line x1={x(avgX)} x2={x(avgX)} y1={P.t} y2={H - P.b} stroke="#D3C8B5" />
        <line x1={P.l} x2={W - P.r} y1={y(avgY)} y2={y(avgY)} stroke="#D3C8B5" />
        <text x={x(avgX) + 10} y={P.t + 18} fontSize="12.5" fill="#A6841A" fontWeight="700" fontFamily="Reem Kufi, sans-serif">
          ★ {ui.lang === "ar" ? "منطقة القادة" : "Leaders' corner"}
        </text>
        <text x={P.l + 8} y={H - P.b - 10} fontSize="11.5" fill="#B3A894" fontWeight="600">
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
              <text x={x(d.reach)} y={y(d.first) + 4} fontSize={short.length > 3 ? 9 : short.length > 2 ? 10.5 : 12.5} fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="Reem Kufi, sans-serif">
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
      <div className="flex flex-col gap-5">
        <FilterBar ds={ds} ui={ui} f={f} set={set} />
        <div className="rounded-4xl border border-dashed border-line bg-paper p-12 text-center text-ink-muted">{ui.overview.noData}</div>
      </div>
    );

  const brand = m.rank.find((r) => r.isBrand)!;
  const pos = m.rank.indexOf(brand) + 1;
  const top = m.rank[0];
  const leader = top.isBrand ? m.rank[1] : top;
  const gap = Math.round((brand.reach - leader.reach) * 10) / 10;
  const name = (b: number) => bankLabel(ds, ui, b);
  const lc = bankColor(ds, leader.b);

  return (
    <div className="flex flex-col gap-6">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />

      {/* headline tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="pattern-star hero-glow rise relative overflow-hidden rounded-4xl bg-navy p-6 text-white shadow-pop">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-gold-400">
            <Star size={12} /> {ui.competitors.position}
          </p>
          <p className="mt-3 font-display text-[56px] font-bold leading-none">
            #{pos}
            <span className="ms-1.5 text-[16px] font-normal text-white/55">
              {ui.of} {ds.banks.length}
            </span>
          </p>
        </div>
        <button
          onClick={() => setSel({ kind: "bank", b: leader.b })}
          className="rise relative flex flex-col overflow-hidden rounded-4xl p-6 text-start text-white shadow-card transition hover:-translate-y-0.5"
          style={{ background: `linear-gradient(135deg, ${lc}, ${lc}cc)` }}
        >
          <p className="text-[12.5px] font-medium text-white/80">{ui.competitors.leader}</p>
          <p className="mt-2 flex items-center gap-2.5 font-display text-[24px] font-bold leading-tight">
            <span className="rounded-full bg-white/20 p-0.5">
              <BankBadge color={lc} short={ds.bankShort[leader.b]} size={34} />
            </span>
            {name(leader.b)}
          </p>
          <p className="mt-auto pt-3 text-[12.5px] text-white/80">
            {ui.kpi.reach} <b className="text-white">{leader.reach}%</b>
          </p>
        </button>
        <div className="rise flex flex-col rounded-4xl bg-coral-50 p-6 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-2">{ui.competitors.gap}</p>
          <p className={`mt-2 font-display text-[48px] font-bold leading-none ${gap < 0 ? "text-coral" : "text-good"}`}>
            {gap > 0 ? "+" : gap < 0 ? "−" : ""}
            {Math.abs(gap)}
          </p>
          <p className="mt-auto pt-2 text-[12.5px] text-ink-muted">{ui.competitors.gapUnit}</p>
        </div>
        <div className="rise flex flex-col rounded-4xl bg-white p-6 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-2">{ui.kpi.sov}</p>
          <p className="mt-2 font-display text-[48px] font-bold leading-none text-gold-600">{brand.sov}%</p>
          <div className="mt-auto flex h-3 gap-[3px] overflow-hidden rounded-full pt-0" dir="ltr">
            {m.rank.map((r) => (
              <span key={r.b} className="rounded-full" style={{ flex: r.sov, background: bankColor(ds, r.b), opacity: r.isBrand ? 1 : 0.85 }} title={`${name(r.b)} ${r.sov}%`} />
            ))}
          </div>
        </div>
      </div>

      {/* rank race */}
      {ds.runs.length > 1 && (
        <Panel accent={GOLD} title={ar ? "سباق الترتيب أسبوعاً بأسبوع" : "The rank race, week by week"} sub={ar ? "ترتيب كل بنك حسب وصول العلامة. مرّر على بنك لإبرازه، واضغط لملفه." : "Each bank's rank by brand reach. Hover a bank to highlight it, click for its profile."}>
          <Insight tone={gap < 0 ? "bad" : "good"}>{gap < 0 ? fill(ui.ins.lead, { bank: name(leader.b), gap: Math.abs(gap) }) : ui.ins.weLead}</Insight>
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
          <ul className="mt-4 flex flex-wrap gap-2">
            {m.rank.map((r) => (
              <li key={r.b}>
                <button onClick={() => setSel({ kind: "bank", b: r.b })} className={`flex items-center gap-2 rounded-full py-1 pe-3 ps-1 text-[12.5px] transition hover:-translate-y-0.5 ${r.isBrand ? "bg-gold-50 font-semibold text-ink ring-1 ring-gold" : "bg-paper text-ink-2"}`}>
                  <BankBadge color={bankColor(ds, r.b)} short={ds.bankShort[r.b]} size={24} brand={r.isBrand} />
                  {name(r.b)}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-7" accent="#7A4FE0" title={ui.competitors.map} sub={ui.competitors.mapSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <PositionMap data={m.rank} ui={ui} ds={ds} onPick={(b) => setSel({ kind: "bank", b })} />
        </Panel>
        <Panel className="lg:col-span-5" accent="#0F9F94" title={ui.competitors.board} sub={ui.competitors.boardSub}>
          <ol className="flex flex-col gap-1.5">
            {m.board.map((r, i) => {
              const c = bankColor(ds, r.b);
              return (
                <li key={r.b}>
                  <button onClick={() => setSel({ kind: "bank", b: r.b })} className={`group flex w-full items-center gap-3 rounded-2xl p-2 text-start transition hover:bg-paper ${r.isBrand ? "bg-gold-50 ring-1 ring-gold-100" : ""}`}>
                    <span className="w-6 text-center font-display text-[15px] font-bold text-ink-soft">{i + 1}</span>
                    <BankBadge color={c} short={ds.bankShort[r.b]} size={34} brand={r.isBrand} />
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className={`block truncate text-[13.5px] ${r.isBrand ? "font-bold text-ink" : "font-medium text-ink-2"}`}>
                        {name(r.b)}
                      </span>
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${(r.reach / Math.max(top.reach, 1)) * 100}%`, background: c }} />
                      </span>
                    </span>
                    <span className="text-end">
                      <span className="block font-display text-[17px] font-bold leading-none" style={{ color: c }}>
                        {r.reach}%
                      </span>
                      <span className="mt-1 block">
                        <Delta v={r.delta} size="xs" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <Panel accent="#1F86E0" title={ar ? "التفاصيل الكاملة" : "Full scorecard"} sub={ui.competitors.boardSub}>
        <div className="-mx-6 overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-muted">
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
                <tr key={r.b} onClick={() => setSel({ kind: "bank", b: r.b })} className={`cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-paper ${r.isBrand ? "bg-gold-50/70" : ""}`}>
                  <td className="num px-6 py-3 font-semibold text-ink-soft">{i + 1}</td>
                  <td className="px-2 py-3">
                    <BankName ds={ds} ui={ui} b={r.b} />
                  </td>
                  <td className="num px-2 py-3 text-center font-bold" style={{ color: bankColor(ds, r.b) }}>
                    {r.reach}%
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
        <Panel accent="#0F9F94" title={ui.competitors.byChannel} sub={ui.competitors.heatSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
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
        <Panel accent="#0F9F94" title={ui.competitors.byProduct} sub={ui.competitors.heatSub} action={<RampLegend low={ui.overview.weak} high={ui.overview.strong} />}>
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
