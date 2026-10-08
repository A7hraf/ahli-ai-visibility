"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- shared hover tooltip ---------- */

type TipState = { x: number; y: number; content: ReactNode } | null;
const TipCtx = createContext<(s: TipState) => void>(() => {});

export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);
  return (
    <TipCtx.Provider value={setTip}>
      {children}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[70] max-w-[260px] rounded-xl bg-ink-900 px-3 py-2 text-[12.5px] leading-snug text-white shadow-pop"
          style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 9999) - 270), top: tip.y + 14 }}
        >
          {tip.content}
        </div>
      )}
    </TipCtx.Provider>
  );
}

/** Spread on any element to give it a hover / focus tooltip. */
export function useTip() {
  const set = useContext(TipCtx);
  return useCallback(
    (content: ReactNode) => ({
      onPointerMove: (e: React.PointerEvent) => set({ x: e.clientX, y: e.clientY, content }),
      onPointerLeave: () => set(null),
      onFocus: (e: React.FocusEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        set({ x: r.left + r.width / 2, y: r.bottom, content });
      },
      onBlur: () => set(null),
    }),
    [set],
  );
}

export function TipRow({ color, label, value, line = false }: { color?: string; label: ReactNode; value: ReactNode; line?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {color && <span className={line ? "h-0.5 w-3 rounded-full" : "h-2 w-2 rounded-[3px]"} style={{ background: color }} />}
      <b className="num font-semibold">{value}</b>
      <span className="text-white/70">{label}</span>
    </span>
  );
}

/* ---------- small pieces ---------- */

export function Delta({ v, unit = "", invert = false, size = "sm" }: { v: number | null | undefined; unit?: string; invert?: boolean; size?: "sm" | "xs" }) {
  if (v === null || v === undefined) return null;
  const r = Math.round(v * 10) / 10;
  if (r === 0) return <span className={`num inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-ink-muted ${size === "xs" ? "text-[10.5px]" : "text-[11.5px]"}`}>±0</span>;
  const good = invert ? r < 0 : r > 0;
  return (
    <span className={`num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${good ? "bg-good-soft text-good" : "bg-bad-soft text-bad"} ${size === "xs" ? "text-[10.5px]" : "text-[11.5px]"}`}>
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className={r > 0 ? "" : "rotate-180"}>
        <path d="M5 1.5 9 7.5H1z" fill="currentColor" />
      </svg>
      {Math.abs(r)}
      {unit}
    </span>
  );
}

export function Sparkline({ data, color = "#0B6298", w = 96, h = 28, fill = true }: { data: number[]; color?: string; w?: number; h?: number; fill?: boolean }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const sx = (i: number) => (i / (data.length - 1)) * (w - 4) + 2;
  const sy = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const d = data.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className="overflow-visible" style={{ direction: "ltr", maxWidth: w }}>
      {fill && <path d={`${d}L${sx(data.length - 1)},${h}L${sx(0)},${h}Z`} fill={color} opacity={0.1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- horizontal bar list (clickable rows) ---------- */

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  color?: string;
  marker?: number | null; // e.g. previous period
  strong?: boolean;
  sub?: ReactNode;
  tip?: ReactNode;
  right?: ReactNode;
}

export function BarList({ items, max, unit = "%", onSelect, active, labelWidth = "w-36", dense = false }: { items: BarItem[]; max?: number; unit?: string; onSelect?: (key: string) => void; active?: string | null; labelWidth?: string; dense?: boolean }) {
  const tip = useTip();
  const top = max ?? Math.max(...items.map((i) => Math.max(i.value, i.marker ?? 0)), 1);
  return (
    <ul className={`flex flex-col ${dense ? "gap-1" : "gap-1.5"}`}>
      {items.map((it) => {
        const Tag = onSelect ? "button" : "div";
        return (
          <li key={it.key}>
            <Tag
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(it.key) } : {})}
              {...(it.tip ? tip(it.tip) : {})}
              className={`group flex w-full items-center gap-3 rounded-lg px-2 text-start transition ${dense ? "py-1" : "py-1.5"} ${onSelect ? "cursor-pointer hover:bg-canvas focus-visible:bg-canvas" : ""} ${active === it.key ? "bg-brand-50 ring-1 ring-brand-100" : ""}`}
            >
              <span className={`${labelWidth} min-w-0 shrink-0 truncate text-[13px] ${it.strong ? "font-semibold text-ink" : "text-ink-2"}`}>
                {it.label}
                {it.sub && <span className="block truncate text-[11px] font-normal text-ink-soft">{it.sub}</span>}
              </span>
              <span className="relative h-2.5 min-w-0 flex-1 rounded-full bg-slate-100">
                <span
                  className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-500 group-hover:brightness-110"
                  style={{ width: `${Math.max(1.5, (it.value / top) * 100)}%`, background: it.color ?? "#0B6298" }}
                />
                {it.marker !== undefined && it.marker !== null && (
                  <span className="absolute -inset-y-1 w-0.5 rounded-full bg-ink/60" style={{ insetInlineStart: `calc(${(it.marker / top) * 100}% - 1px)` }} />
                )}
              </span>
              <span className="num w-12 shrink-0 text-end text-[13px] font-semibold text-ink">
                {Math.round(it.value * 10) / 10}
                {unit}
              </span>
              {it.right}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- donut ---------- */

export function Donut({ data, size = 168, thickness = 22, center, onSelect }: { data: { key: string; label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: ReactNode; onSelect?: (key: string) => void }) {
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2 - 2;
  const C = 2 * Math.PI * r;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 2.5 : 0;
  let acc = 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ direction: "ltr" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F6" strokeWidth={thickness} />
        {data.map((d) => {
          const len = (d.value / total) * C;
          const off = acc;
          acc += len;
          if (d.value <= 0) return null;
          return (
            <circle
              key={d.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={hover === d.key ? thickness + 4 : thickness}
              strokeDasharray={`${Math.max(0.5, len - gap)} ${C}`}
              strokeDashoffset={-off}
              className={`transition-all ${onSelect ? "cursor-pointer" : ""}`}
              tabIndex={onSelect ? 0 : -1}
              onMouseEnter={() => setHover(d.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(d.key)}
              onKeyDown={(e) => e.key === "Enter" && onSelect?.(d.key)}
              {...tip(<TipRow color={d.color} label={d.label} value={`${Math.round((d.value / total) * 1000) / 10}%`} />)}
            />
          );
        })}
      </svg>
      {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

export function Legend({ items, className = "" }: { items: { label: ReactNode; color: string; line?: boolean; value?: ReactNode }[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-muted ${className}`}>
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className={it.line ? "h-[3px] w-4 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"} style={{ background: it.color }} />
          {it.label}
          {it.value !== undefined && <b className="num font-semibold text-ink">{it.value}</b>}
        </li>
      ))}
    </ul>
  );
}

/* ---------- heatmap ---------- */

const RAMP = ["#EEF5FC", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
export function rampColor(v: number, max: number) {
  const t = max ? Math.max(0, Math.min(1, v / max)) : 0;
  return RAMP[Math.round(t * (RAMP.length - 1))];
}

export function Heatmap({
  rows,
  cols,
  max,
  onSelect,
  rowWidth = "9.5rem",
  format = (v: number) => `${Math.round(v)}`,
  tipText,
}: {
  rows: { key: string; label: ReactNode; strong?: boolean; cells: (number | null)[] }[];
  cols: { key: string; label: ReactNode }[];
  max?: number;
  onSelect?: (row: string, col: string) => void;
  rowWidth?: string;
  format?: (v: number) => string;
  tipText?: (row: string, col: string, v: number) => ReactNode;
}) {
  const tip = useTip();
  const top = max ?? Math.max(1, ...rows.flatMap((r) => r.cells.map((c) => c ?? 0)));
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="grid min-w-[480px] gap-1" style={{ gridTemplateColumns: `${rowWidth} repeat(${cols.length}, minmax(52px, 1fr))` }}>
        <span />
        {cols.map((c) => (
          <span key={c.key} className="truncate px-1 pb-1 text-center text-[11.5px] font-medium text-ink-muted">
            {c.label}
          </span>
        ))}
        {rows.map((r) => (
          <div key={r.key} className="contents">
            <span className={`flex items-center truncate pe-2 text-[13px] ${r.strong ? "font-semibold text-ink" : "text-ink-2"}`}>{r.label}</span>
            {r.cells.map((v, i) => {
              const c = cols[i];
              if (v === null) return <span key={c.key} className="h-10 rounded-md bg-slate-50" />;
              const bg = rampColor(v, top);
              const dark = v / top > 0.5;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onSelect?.(r.key, c.key)}
                  {...tip(tipText ? tipText(r.key, c.key, v) : format(v))}
                  className={`num h-10 rounded-md text-[12.5px] font-semibold transition hover:scale-[1.04] hover:shadow-md focus-visible:scale-[1.04] ${r.strong ? "ring-2 ring-gold ring-offset-1" : ""} ${onSelect ? "cursor-pointer" : "cursor-default"}`}
                  style={{ background: bg, color: dark ? "#fff" : "#0B2540" }}
                >
                  {format(v)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RampLegend({ low, high }: { low: string; high: string }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] text-ink-muted">
      {low}
      <span className="flex h-2 w-28 overflow-hidden rounded-full" style={{ direction: "ltr" }}>
        {RAMP.map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </span>
      {high}
    </div>
  );
}

/* ---------- drawer ---------- */

export function Drawer({ open, onClose, title, kicker, children, closeLabel = "Close" }: { open: boolean; onClose: () => void; title: ReactNode; kicker?: ReactNode; children: ReactNode; closeLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${open ? "" : "pointer-events-none invisible"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-ink-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 end-0 flex w-full max-w-[560px] flex-col bg-canvas shadow-2xl outline-none transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-5">
          <div className="min-w-0">
            {kicker && <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand">{kicker}</p>}
            <h2 className="text-[19px] font-semibold leading-snug text-ink">{title}</h2>
          </div>
          <button onClick={onClose} aria-label={closeLabel} className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{open && children}</div>
      </div>
    </div>
  );
}

/* ---------- controls ---------- */

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-lg font-medium transition ${size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]"} ${value === o.value ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, sub, action, children, className = "", info }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; info?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                {title}
                {info}
              </h2>
            )}
            {sub && <p className="mt-0.5 text-[12.5px] text-ink-muted">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function ClickHint({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-soft">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 9l5 12 1.8-5.2L21 14 9 9z M7.2 2.2 8 5.1 M5.1 8 2.2 7.2 M14 4.1 12 6.2 M6.2 12l-2.1 2" />
      </svg>
      {children}
    </span>
  );
}
