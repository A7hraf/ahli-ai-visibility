import { Icon } from "./Icon";

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-3">
        <span className="accent-rule" />
        <h1 className="font-display text-[28px] font-bold leading-tight text-navy sm:text-[34px]">{title}</h1>
        {lead && <p className="text-[15px] leading-relaxed text-ink-muted">{lead}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Card({ title, note, action, children, className = "" }: { title?: string; note?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-[17px] font-semibold text-navy">{title}</h2>}
            {note && <p className="mt-1 text-[13px] text-ink-muted">{note}</p>}
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
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-2xl border p-5 shadow-card ${tone === "brand" ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>
      <span className={`text-[12px] font-medium uppercase tracking-wide ${tone === "brand" ? "text-gold-400" : "text-ink-muted"}`}>{label}</span>
      <span className={`num font-display text-[34px] font-bold leading-none ${tone === "bad" ? "text-bad" : tone === "brand" ? "text-white" : "text-navy"}`}>{value}</span>
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
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONES[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ink-muted">{children}</div>;
}

export function Bar({ value, color = "#0B6298" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}
