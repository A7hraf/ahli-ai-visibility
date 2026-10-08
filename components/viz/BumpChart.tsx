"use client";

import { useState } from "react";
import { TipRow, useTip } from "./core";

export interface BumpSeries {
  b: number;
  name: string;
  short: string;
  color: string;
  brand: boolean;
  ranks: (number | null)[]; // rank per week, 1 = most recommended
  values: (number | null)[]; // brand reach per week
}

/** Weekly rank of every bank: who overtakes whom. */
export default function BumpChart({ weeks, series, onPick, fmtDate, valueLabel }: { weeks: string[]; series: BumpSeries[]; onPick: (b: number) => void; fmtDate: (d: string) => string; valueLabel: string }) {
  const tip = useTip();
  const [hover, setHover] = useState<number | null>(null);
  const n = series.length;
  const W = 900;
  const rowH = 46;
  const P = { l: 64, r: 64, t: 18, b: 34 };
  const H = P.t + P.b + (n - 1) * rowH;
  const x = (i: number) => P.l + (weeks.length > 1 ? (i / (weeks.length - 1)) * (W - P.l - P.r) : (W - P.l - P.r) / 2);
  const y = (rank: number) => P.t + (rank - 1) * rowH;
  const path = (s: BumpSeries) => {
    let d = "";
    let prev: [number, number] | null = null;
    s.ranks.forEach((r, i) => {
      if (r === null) return (prev = null);
      const pt: [number, number] = [x(i), y(r)];
      if (!prev) d += `M${pt[0]},${pt[1]}`;
      else {
        const mx = (prev[0] + pt[0]) / 2;
        d += `C${mx},${prev[1]} ${mx},${pt[1]} ${pt[0]},${pt[1]}`;
      }
      prev = pt;
    });
    return d;
  };
  const focus = hover;
  // draw Ahli last so it sits on top, and the hovered bank above everything
  const order = [...series].sort((a, b) => Number(a.brand) - Number(b.brand) || Number(a.b === focus) - Number(b.b === focus));
  const last = weeks.length - 1;
  const tickEvery = Math.max(1, Math.ceil(weeks.length / 8));

  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label="rank over time" onMouseLeave={() => setHover(null)}>
        <defs>
          <filter id="bumpGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: n }).map((_, i) => (
          <g key={i}>
            <rect x={P.l - 14} y={y(i + 1) - rowH / 2} width={W - P.l - P.r + 28} height={rowH} fill={i % 2 ? "transparent" : "#F9FAFB"} rx={10} />
            <text x={18} y={y(i + 1) + 5} fontSize="14" fontWeight="700" fill="#98A2B3" fontFamily="Tajawal, sans-serif">
              #{i + 1}
            </text>
          </g>
        ))}
        {weeks.map((w, i) =>
          i % tickEvery === 0 || i === last ? (
            <text key={w} x={x(i)} y={H - 8} fontSize="11.5" textAnchor="middle" fill="#667085">
              {fmtDate(w)}
            </text>
          ) : null,
        )}
        {order.map((s) => {
          const dim = focus !== null && focus !== s.b;
          return (
            <g key={s.b} opacity={dim ? 0.18 : 1} style={{ transition: "opacity .2s" }} className="cursor-pointer" onMouseEnter={() => setHover(s.b)} onClick={() => onPick(s.b)}>
              <path d={path(s)} fill="none" stroke={s.color} strokeWidth={s.brand ? 7 : 4.5} strokeLinecap="round" filter={s.brand || focus === s.b ? "url(#bumpGlow)" : undefined} />
              <path d={path(s)} fill="none" stroke="transparent" strokeWidth={22} />
              {s.ranks.map((r, i) =>
                r === null ? null : (
                  <g key={i} {...tip(
                    <span className="flex flex-col gap-1">
                      <b>
                        {s.name} · {fmtDate(weeks[i])}
                      </b>
                      <TipRow color={s.color} label={valueLabel} value={`#${r} · ${s.values[i] ?? "–"}%`} />
                    </span>,
                  )}>
                    {i === 0 || i === last ? (
                      <>
                        <circle cx={x(i)} cy={y(r)} r={s.brand ? 17 : 15} fill={s.color} stroke="#fff" strokeWidth={3} />
                        <text x={x(i)} y={y(r) + 3.5} fontSize={s.short.length > 3 ? 8 : s.short.length > 2 ? 9.5 : 11} fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="Tajawal, sans-serif">
                          {s.short}
                        </text>
                      </>
                    ) : (
                      <circle cx={x(i)} cy={y(r)} r={s.brand ? 6 : 5} fill="#fff" stroke={s.color} strokeWidth={3} />
                    )}
                  </g>
                ),
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
