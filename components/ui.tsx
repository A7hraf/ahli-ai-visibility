import { Icon } from "./Icon";

export function PageHeader({ title, lead, kicker, children }: { title: React.ReactNode; lead?: React.ReactNode; kicker?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rise mb-6 mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-2">
        {kicker && <p className="text-[12.5px] font-bold text-gold-700">{kicker}</p>}
        <h1 className="font-display text-[32px] leading-[1.15] text-ink sm:text-[40px]">{title}</h1>
        {lead && <p className="text-[15px] leading-relaxed text-ink-2">{lead}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Card({ title, note, action, children, className = "" }: { title?: string; note?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[4px] border border-line bg-white p-5 shadow-card transition-shadow duration-300 hover:shadow-pop sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-[19px] leading-tight text-ink">{title}</h2>}
            {note && <p className="mt-1 text-[12px] text-ink-muted">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, delta, tone = "default" }: { label: string; value: string; hint: string; delta?: number | null; tone?: "default" | "bad" | "brand" }) {
  const up = (delta ?? 0) > 0;
  return (
    <div className={`lift flex min-w-0 flex-col gap-2 rounded-[4px] border p-5 shadow-card ${tone === "brand" ? "border-navy bg-navy text-white" : tone === "bad" ? "border-bad/20 bg-bad-soft" : "border-line bg-white"}`}>
      <span className={`text-[14px] font-bold ${tone === "brand" ? "text-white" : tone === "bad" ? "text-bad" : "text-ink"}`}>{label}</span>
      <span className={`font-display text-[32px] leading-none ${tone === "bad" ? "text-bad" : tone === "brand" ? "text-gold-400" : "text-navy"}`}>{value}</span>
      <div className="flex flex-wrap items-center gap-2">
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span className={`num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${up ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            <Icon name={up ? "arrowUp" : "arrowDown"} size={11} />
            {Math.abs(delta)}
          </span>
        )}
        <span className={`text-[12px] ${tone === "brand" ? "text-brand-100/80" : "text-ink-soft"}`}>{hint}</span>
      </div>
    </div>
  );
}

const TONES = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  brand: "bg-brand-50 text-brand",
  gold: "bg-gold-50 text-gold-700",
  muted: "bg-slate-100 text-ink-muted",
} as const;

export function Badge({ tone = "muted", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] px-2 py-0.5 text-[12px] font-bold ${TONES[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[4px] border border-dashed border-line-2 bg-white p-10 text-center text-ink-muted">{children}</div>;
}

export function Bar({ value, color = "#0B3A5B" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-[2px] bg-slate-200">
      <div className="h-full rounded-[2px] transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}
