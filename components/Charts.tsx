"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";

const AXIS = { fontSize: 12, fill: "#566578" };
const GRID = "#E8EDF3";
const tip = {
  contentStyle: { borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(11,58,91,0.08)", fontSize: 13 },
  labelStyle: { color: "#0B3A5B", fontWeight: 600 },
};

export function TrendChart({ data, labels }: { data: { date: string; en: number; ar: number; mention: number }[]; labels: { en: string; ar: string; overall: string } }) {
  return (
    <div dir="ltr" className="h-[280px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillAll" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B6298" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#0B6298" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} width={48} />
          <Tooltip {...tip} formatter={(v: number) => `${v}%`} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          <Area type="monotone" dataKey="mention" name={labels.overall} stroke="#0B6298" strokeWidth={2.5} fill="url(#fillAll)" dot={false} />
          <Line type="monotone" dataKey="en" name={labels.en} stroke="#7FB2D9" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="ar" name={labels.ar} stroke="#ADA042" strokeWidth={2.5} dot={{ r: 3.5, fill: "#ADA042" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EngineLangChart({ data, labels }: { data: { label: string; en: number; ar: number }[]; labels: { en: string; ar: string } }) {
  return (
    <div dir="ltr" className="h-[280px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} width={48} />
          <Tooltip {...tip} formatter={(v: number) => `${v}%`} cursor={{ fill: "#F1F5F9" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          <Bar dataKey="en" name={labels.en} fill="#0B6298" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="ar" name={labels.ar} fill="#ADA042" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SovChart({ data }: { data: { name: string; share: number; isBrand: boolean }[] }) {
  return (
    <div dir="ltr" className="w-full" style={{ height: Math.max(220, data.length * 38) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: "#0B3A5B" }} tickLine={false} axisLine={false} width={150} />
          <Tooltip {...tip} formatter={(v: number) => `${v}%`} cursor={{ fill: "#F1F5F9" }} />
          <Bar dataKey="share" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: "right", fontSize: 12, fill: "#566578", formatter: (v: number) => `${v}%` }}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.isBrand ? "#ADA042" : "#C9D6E3"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({ data, color = "#0B6298" }: { data: number[]; color?: string }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div dir="ltr" className="h-10 w-28">
      <ResponsiveContainer>
        <AreaChart data={d} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.12} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const BANK_COLORS: Record<string, string> = {
  "Ahli Bank": "#ADA042",
  "Bank Muscat": "#3D6BA8",
  "National Bank of Oman": "#8B5A9C",
  "Bank Dhofar": "#2F8A78",
  "Sohar International": "#C2703D",
  "Oman Arab Bank": "#6E7F91",
  "Bank Nizwa": "#5E9C4C",
  "HSBC Oman": "#B04A4A",
};

export function BankTrendChart({ data, banks, brandLabel }: { data: Record<string, number | string>[]; banks: string[]; brandLabel: string }) {
  return (
    <div dir="ltr" className="h-[320px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={48} />
          <Tooltip {...tip} formatter={(v: number) => `${v}%`} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {banks.map((b) => {
            const brand = b === "Ahli Bank";
            return (
              <Line
                key={b}
                type="monotone"
                dataKey={b}
                name={brand ? brandLabel : b}
                stroke={BANK_COLORS[b] ?? "#8494A7"}
                strokeWidth={brand ? 3.5 : 1.6}
                strokeOpacity={brand ? 1 : 0.75}
                dot={brand ? { r: 4, fill: "#ADA042" } : false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareRadar({ data, a, b, aLabel, bLabel }: { data: { metric: string; a: number; b: number }[]; a: string; b: string; aLabel: string; bLabel: string }) {
  return (
    <div dir="ltr" className="h-[300px] w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "#0B3A5B" }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          <Radar name={bLabel} dataKey="b" stroke={BANK_COLORS[b] ?? "#3D6BA8"} fill={BANK_COLORS[b] ?? "#3D6BA8"} fillOpacity={0.15} strokeWidth={2} />
          <Radar name={aLabel} dataKey="a" stroke={BANK_COLORS[a]} fill={BANK_COLORS[a]} fillOpacity={0.3} strokeWidth={2.5} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
          <Tooltip {...tip} formatter={(v: number) => `${v}%`} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SentimentDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div dir="ltr" className="relative h-[200px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip {...tip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-display text-2xl font-bold text-navy">{total ? Math.round((100 * data[0].value) / total) : 0}%</span>
        <span className="text-xs text-ink-muted">{data[0].name}</span>
      </div>
    </div>
  );
}

export function ProductBars({ data, labels }: { data: { product: string; label: string; v: number; leader: number }[]; labels: { brand: string; leader: string } }) {
  return (
    <div dir="ltr" className="h-[260px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ ...AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={44} />
          <Tooltip {...tip} formatter={(v: number) => `${v}%`} cursor={{ fill: "#F1F5F9" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          <Bar dataKey="v" name={labels.brand} fill="#ADA042" radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="leader" name={labels.leader} fill="#C9D6E3" radius={[6, 6, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
