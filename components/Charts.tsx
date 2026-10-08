"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";

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
