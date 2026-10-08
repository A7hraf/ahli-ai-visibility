"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Series {
  key: string;
  label: string;
  color: string;
  width?: number;
  area?: boolean;
  dim?: boolean;
  dash?: boolean;
}

const AXIS = { fontSize: 11.5, fill: "#7A8A9C" };

function TipBox({ active, payload, label, series, fmtDate, unit }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; series: Series[]; fmtDate: (d: string) => string; unit: string }) {
  if (!active || !payload?.length) return null;
  const rows = series
    .map((s) => ({ s, v: payload.find((p) => p.dataKey === s.key)?.value }))
    .filter((r) => r.v !== undefined && r.v !== null)
    .sort((a, b) => (b.v as number) - (a.v as number));
  return (
    <div className="rounded-xl bg-ink-900 px-3 py-2.5 text-[12.5px] text-white shadow-pop">
      <p className="mb-1.5 text-[11.5px] font-medium text-white/60">{label ? fmtDate(label) : ""}</p>
      <div className="flex flex-col gap-1">
        {rows.map(({ s, v }) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            <b className="num w-10 font-semibold">
              {Math.round((v as number) * 10) / 10}
              {unit}
            </b>
            <span className="text-white/75">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TrendLines({
  data,
  series,
  height = 280,
  unit = "%",
  domain,
  fmtDate,
  onPick,
  forecastFrom,
  forecastLabel,
  todayLabel,
  marks = [],
}: {
  data: Record<string, number | string | undefined>[];
  series: Series[];
  height?: number;
  unit?: string;
  domain?: [number, number | "auto"];
  fmtDate: (d: string) => string;
  onPick?: (index: number) => void;
  forecastFrom?: string;
  forecastLabel?: string;
  todayLabel?: string;
  marks?: { date: string; label: string }[];
}) {
  const last = data[data.length - 1]?.date as string | undefined;
  return (
    <div dir="ltr" className="w-full select-none" style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 18, right: 14, left: -6, bottom: 0 }}
          onClick={(s: { activeTooltipIndex?: number } | null) => s && typeof s.activeTooltipIndex === "number" && onPick?.(s.activeTooltipIndex)}
          style={{ cursor: onPick ? "pointer" : "default" }}
        >
          <defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <linearGradient key={s.key} id={`g-${s.key.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
          </defs>
          <CartesianGrid stroke="#EDF1F5" vertical={false} />
          {forecastFrom && last && <ReferenceArea x1={forecastFrom} x2={last} fill="#F7F5E6" fillOpacity={0.75} label={{ value: forecastLabel, position: "insideTopRight", fill: "#8A7F2A", fontSize: 11.5 }} />}
          {forecastFrom && <ReferenceLine x={forecastFrom} stroke="#94A3B8" label={{ value: todayLabel, position: "top", fill: "#566578", fontSize: 11.5 }} />}
          {marks.map((m) => (
            <ReferenceLine key={m.date} x={m.date} stroke="#1D7A47" strokeWidth={1.5} label={{ value: m.label, position: "top", fill: "#1D7A47", fontSize: 11, fontWeight: 600 }} />
          ))}
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: "#DCE3EA" }} tickFormatter={fmtDate} minTickGap={22} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={domain ?? [0, "auto"]} tickFormatter={(v: number) => `${v}${unit}`} width={44} />
          <Tooltip content={<TipBox series={series} fmtDate={fmtDate} unit={unit} />} cursor={{ stroke: "#94A3B8", strokeWidth: 1 }} isAnimationActive={false} />
          {series.map((s) =>
            s.area ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.width ?? 2}
                strokeDasharray={s.dash ? "6 5" : undefined}
                fill={`url(#g-${s.key.replace(/\W/g, "")})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                connectNulls
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeOpacity={s.dim ? 0.35 : 1}
                strokeWidth={s.width ?? 2}
                strokeDasharray={s.dash ? "6 5" : undefined}
                dot={false}
                activeDot={s.dim ? false : { r: 4.5, strokeWidth: 2, stroke: "#fff" }}
                connectNulls
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
