"use client";

import { useMemo, useState } from "react";
import type { ActionView, Category } from "@/lib/actions";
import { fill, type UIText } from "@/lib/ui-text";
import { PageHeader } from "@/components/ui";
import { CountUp } from "@/components/viz/motion";
import type { Dict } from "@/lib/i18n";
import { Drawer, Insight, Legend, Panel, TipProvider, TipRow, useTip } from "@/components/viz/core";
import TrendLines from "@/components/viz/TrendLines";
import { GOLD, GREY, useFmtDate } from "@/components/viz/Details";
import StatusControl from "@/components/StatusControl";
import { Icon } from "@/components/Icon";

type Props = {
  actions: ActionView[];
  colors: Record<Category, string>;
  tints: Record<Category, string>;
  ui: UIText;
  t: Pick<Dict, "plan" | "cats" | "catsHint" | "status" | "effort" | "products" | "home">;
  lang: "en" | "ar";
  proj: { current: number; target: number; points: { date: string; actual?: number; noAction?: number; withPlan?: number }[] } | null;
};

const CATS: Category[] = ["content", "technical", "partners", "accuracy"];
const EFFORT = { low: 0, medium: 1, high: 2 } as const;

export default function PlanBoard(props: Props) {
  return (
    <TipProvider>
      <Inner {...props} />
    </TipProvider>
  );
}

function Matrix({ actions, colors, ui, t, onPick, num }: { actions: ActionView[]; colors: Props["colors"]; ui: UIText; t: Props["t"]; onPick: (k: string) => void; num: (k: string) => number }) {
  const tip = useTip();
  const W = 560, H = 340, P = { l: 52, r: 14, t: 14, b: 40 };
  const maxI = Math.max(...actions.map((a) => a.impact), 10) + 2;
  const colW = (W - P.l - P.r) / 3;
  const y = (v: number) => H - P.b - (v / maxI) * (H - P.t - P.b);
  // spread actions that share an effort column so bubbles don't sit on top of each other
  const pos = new Map<string, { x: number; y: number }>();
  for (const e of ["low", "medium", "high"] as const) {
    const col = actions.filter((a) => a.effort === e).sort((a, b) => b.impact - a.impact);
    col.forEach((a, i) => pos.set(a.key, { x: P.l + colW * (EFFORT[e] + 0.5) + (col.length > 1 ? (i / (col.length - 1) - 0.5) * colW * 0.55 : 0), y: y(a.impact) }));
  }
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ui.plan.matrix}>
        <rect x={P.l} y={P.t} width={colW} height={(H - P.t - P.b) / 2} fill="#F7EFD6" rx={3} />
        <text x={P.l + 8} y={P.t + 16} fontSize="11.5" fill="#8A6D12" fontWeight="700">
          {ui.lang === "ar" ? "مكاسب سريعة" : "Quick wins"}
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={P.l} x2={W - P.r} y1={y(maxI * f)} y2={y(maxI * f)} stroke="#EFEDE6" />
            <text x={P.l - 8} y={y(maxI * f) + 4} fontSize="11" fill="#7A8A9C" textAnchor="end">
              +{Math.round(maxI * f)}
            </text>
          </g>
        ))}
        {(["low", "medium", "high"] as const).map((e, i) => (
          <text key={e} x={P.l + colW * (i + 0.5)} y={H - P.b + 18} fontSize="11.5" fill="#566578" textAnchor="middle">
            {t.effort[e]}
          </text>
        ))}
        <text x={(P.l + W - P.r) / 2} y={H - 4} fontSize="11" fill="#7A8A9C" textAnchor="middle">
          {ui.plan.effort}
        </text>
        <text x={14} y={(P.t + H - P.b) / 2} fontSize="11" fill="#7A8A9C" textAnchor="middle" transform={`rotate(-90 14 ${(P.t + H - P.b) / 2})`}>
          {ui.plan.impact} ({ui.pts})
        </text>
        {actions.map((a) => {
          const p = pos.get(a.key)!;
          const r = a.priority === 1 ? 15 : a.priority === 2 ? 12 : 9;
          return (
            <g
              key={a.key}
              role="button"
              tabIndex={0}
              aria-label={a.title[ui.lang]}
              onClick={() => onPick(a.key)}
              onKeyDown={(e) => e.key === "Enter" && onPick(a.key)}
              className="cursor-pointer outline-none"
              {...tip(
                <span className="flex flex-col gap-1">
                  <b>{a.title[ui.lang]}</b>
                  <TipRow color={colors[a.category]} label={t.cats[a.category]} value={`+${a.impact}`} />
                  <span className="text-white/70">{t.status[a.status]}</span>
                </span>,
              )}
            >
              <circle cx={p.x} cy={p.y} r={Math.max(r, 14)} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={13} fill={a.status === "done" ? "#C9A227" : a.status === "doing" ? "#0B3A5B" : "#fff"} stroke={a.status === "done" ? "#A8841A" : "#0B3A5B"} strokeWidth={1.5} className="transition-[r] duration-200 hover:[r:16]" />
              <text x={p.x} y={p.y + 4} fontSize="11" fontWeight="700" textAnchor="middle" fill={a.status === "doing" ? "#fff" : "#0F1B2D"} pointerEvents="none">
                {num(a.key)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Inner({ actions, colors, tints, ui, t, lang, proj }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [cat, setCat] = useState<Category | null>(null);
  const fmt = useFmtDate(lang);
  const a = actions.find((x) => x.key === open) ?? null;
  const shown = cat ? actions.filter((x) => x.category === cat) : actions;
  const counts = useMemo(() => ({ todo: actions.filter((x) => x.status === "todo").length, doing: actions.filter((x) => x.status === "doing").length, done: actions.filter((x) => x.status === "done").length }), [actions]);
  const gain = actions.filter((x) => x.status !== "done").reduce((s, x) => s + x.impact, 0);
  const scope = (x: ActionView) => (x.scope.lang === "ar" ? t.plan.arabicQuestions : x.scope.lang === "en" ? t.plan.englishQuestions : x.scope.product ? `${t.plan.productQuestions} ${t.products[x.scope.product as keyof Props["t"]["products"]]}` : t.plan.allQuestions);
  const statusColor = { todo: "#A3A7AD", doing: "#0B3A5B", done: "#C9A227" };
  const num = (k: string) => actions.findIndex((x) => x.key === k) + 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader kicker={ui.kick.plan} title={ui.nav.plan} lead={fill(ui.leads.plan, { done: counts.done, all: actions.length, gain })} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ui.plan.progress}</p>
          <p className="font-display text-[36px] leading-none text-navy">
            <CountUp value={counts.done} /> / {actions.length}
          </p>
          <div className="mt-auto flex gap-1" dir="ltr">
            {[...actions]
              .sort((x, y) => ["done", "doing", "todo"].indexOf(x.status) - ["done", "doing", "todo"].indexOf(y.status))
              .map((x) => (
                <button key={x.key} onClick={() => setOpen(x.key)} title={x.title[lang]} className="h-2 flex-1 rounded-[1px] transition hover:scale-y-150" style={{ background: x.status === "done" ? "#C9A227" : x.status === "doing" ? "#0B3A5B" : "#E3E0DC" }} />
              ))}
          </div>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{t.plan.expected}</p>
          <p className="font-display text-[36px] leading-none text-good">+{gain}</p>
          <p className="text-[12px] text-ink-muted">{t.plan.expectedTotal}</p>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] bg-navy p-5 text-white">
          <p className="text-[14px] font-bold">{t.home.inWeeks}</p>
          <p className="font-display text-[36px] leading-none text-gold-400">{proj ? `${proj.target}%` : "–"}</p>
          <p className="text-[12px] text-white/70">{ui.term.reach}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {proj && (
          <Panel className="lg:col-span-7" title={ui.plan.forecast} term="Brand reach forecast" action={<Legend items={[{ label: t.home.actual, color: GOLD }, { label: t.home.withPlan, color: GOLD, line: true }, { label: t.home.noAction, color: GREY, line: true }]} />}>
            <Insight>{fill(ui.home.progTake, { d: counts.done, t: actions.length, to: proj.target })}</Insight>
            <TrendLines
              height={250}
              data={proj.points}
              fmtDate={fmt}
              domain={[0, 100]}
              forecastFrom={proj.points.find((p) => p.withPlan !== undefined)?.date}
              forecastLabel={t.home.forecast}
              todayLabel={t.home.today}
              series={[
                { key: "noAction", label: t.home.noAction, color: GREY, width: 1.5, dash: true },
                { key: "withPlan", label: t.home.withPlan, color: GOLD, width: 2.5, dash: true },
                { key: "actual", label: t.home.actual, color: GOLD, width: 3, area: true },
              ]}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">{t.home.projNote}</p>
          </Panel>
        )}
        <Panel className={proj ? "lg:col-span-5" : "lg:col-span-12"} title={ui.plan.matrix} term="Prioritisation matrix">
          <Insight>{ui.plan.matrixSub}</Insight>
          <Matrix actions={actions} colors={colors} ui={ui} t={t} onPick={setOpen} num={num} />
          <Legend className="mt-2" items={(["todo", "doing", "done"] as const).map((k) => ({ label: t.status[k], color: statusColor[k] }))} />
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="me-auto mt-4">
          <h2 className="font-display text-[26px] leading-tight text-ink">{ui.plan.board}</h2>
          <p className="mt-1 text-[11.5px] text-ink-soft">Action board</p>
        </div>
        <button onClick={() => setCat(null)} className={`rounded-[4px] px-3 py-1.5 text-[12.5px] font-bold transition ${!cat ? "bg-navy text-white" : "border border-line bg-white text-ink-2 hover:bg-slate-100"}`}>
          {t.plan.all} · {actions.length}
        </button>
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(cat === c ? null : c)} className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12.5px] font-bold transition ${cat === c ? "bg-navy text-white" : "border border-line text-ink-2 hover:brightness-95"}`} style={cat === c ? undefined : { background: tints[c], color: colors[c] }}>
            {t.cats[c]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(["todo", "doing", "done"] as const).map((s) => {
          const col = shown.filter((x) => x.status === s);
          return (
            <section key={s} className="flex flex-col gap-3 rounded-[10px] bg-slate-200/70 p-3">
              <header className="flex items-center gap-2 px-1 pt-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor[s] }} />
                <h3 className="flex-1 text-[15px] font-bold text-ink">{t.status[s]}</h3>
                <span className="num text-[12.5px] font-bold text-ink-muted">{col.length}</span>
              </header>
              {col.map((x) => (
                <button key={x.key} id={x.key} onClick={() => setOpen(x.key)} className="lift group flex flex-col gap-3 rounded-[4px] border border-line bg-white p-4 text-start">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="rounded-[3px] px-2 py-0.5 text-[11.5px] font-bold" style={{ background: tints[x.category], color: colors[x.category] }}>
                        {t.cats[x.category]}
                      </span>
                      {x.priority === 1 && x.status !== "done" && <span className="rounded-[3px] bg-bad-soft px-2 py-0.5 text-[10.5px] font-bold text-bad">{t.plan.p1}</span>}
                    </span>
                    <span className="num text-[12px] font-bold text-ink-soft">#{num(x.key)}</span>
                  </span>
                  <span className="text-[15px] font-bold leading-snug text-ink group-hover:text-navy">{x.title[lang]}</span>
                  <span className="flex items-end justify-between gap-3">
                    <span className="flex flex-col gap-1 text-[11.5px] text-ink-muted">
                      <span>{x.owner[lang]}</span>
                      <span className="flex gap-0.5" aria-label={t.effort[x.effort]} title={t.effort[x.effort]}>
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={`h-1.5 w-4 rounded-full ${i <= EFFORT[x.effort] ? "bg-ink-soft" : "bg-slate-200"}`} />
                        ))}
                      </span>
                    </span>
                    {x.measured ? (
                      <span className={`text-[18px] font-semibold ${x.measured.delta >= 0 ? "text-good" : "text-bad"}`}>
                        {x.measured.delta >= 0 ? "+" : ""}
                        {x.measured.delta}
                        <span className="ms-0.5 text-[11px] font-normal text-ink-muted">{ui.pts}</span>
                      </span>
                    ) : (
                      <span className="text-[18px] font-semibold text-ink">
                        +{x.impact}
                        <span className="ms-0.5 text-[11px] font-normal text-ink-muted">{ui.pts}</span>
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {!col.length && <p className="px-2 py-6 text-center text-[12.5px] text-ink-soft">–</p>}
            </section>
          );
        })}
      </div>

      <Drawer open={!!a} onClose={() => setOpen(null)} closeLabel={ui.drawer.close} kicker={a ? t.cats[a.category] : ""} title={a?.title[lang] ?? ""}>
        {a && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[11px] text-ink-muted">{t.plan.expected}</p>
                <p className="mt-1 text-[20px] font-semibold text-good">+{a.impact}</p>
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[11px] text-ink-muted">{ui.plan.effort}</p>
                <p className="mt-1 text-[14px] font-semibold text-ink">{t.effort[a.effort]}</p>
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[11px] text-ink-muted">{t.plan.priority}</p>
                <p className="mt-1 text-[14px] font-semibold text-ink">{t.plan[`p${a.priority}` as "p1" | "p2" | "p3"]}</p>
              </div>
            </div>
            <StatusControl actionKey={a.key} status={a.status} labels={{ ...t.status, error: lang === "ar" ? "ما قدرنا نحفظ. سجّل دخولك مرة ثانية وجرّب." : "Couldn't save. Sign in again and retry." }} />
            {a.measured && (
              <div className="rounded-xl border border-line bg-white p-4">
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted">{t.plan.result}</p>
                <div className="flex items-end gap-4" dir="ltr" style={{ height: 120 }}>
                  {[
                    { l: t.plan.before, v: a.measured.before, c: "#CBD5E1" },
                    { l: t.plan.after, v: a.measured.after, c: a.measured.delta >= 0 ? "#1D7A47" : "#B23A2E" },
                  ].map((b) => (
                    <div key={b.l} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[14px] font-semibold text-ink">{b.v}%</span>
                      <span className="w-full max-w-[80px] rounded-t-md" style={{ height: `${Math.max(4, b.v)}%`, background: b.c }} />
                      <span className="text-[11.5px] text-ink-muted">{b.l}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-[12px] text-ink-muted">
                  {ui.kpi.reach} · {scope(a)}
                </p>
              </div>
            )}
            <div className="grid gap-3">
              <div className="rounded-xl bg-bad-soft/60 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-bad">
                  <Icon name="alert" size={13} /> {t.plan.whatsWrong}
                </p>
                <p className="text-[13.5px] leading-relaxed text-ink">{a.problem[lang]}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-brand">
                  <Icon name="sparkle" size={13} /> {t.plan.whyMatters}
                </p>
                <p className="text-[13.5px] leading-relaxed text-ink">{a.why[lang]}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted">{t.plan.howTo}</p>
              <ol className="flex flex-col gap-2">
                {a.steps[lang].map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-white p-3 text-[13.5px] leading-relaxed text-ink ring-1 ring-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11.5px] font-semibold text-gold-400">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 text-[13px] ring-1 ring-line">
              <dt className="text-ink-muted">{t.plan.owner}</dt>
              <dd className="font-medium text-ink">{a.owner[lang]}</dd>
              <dt className="text-ink-muted">{t.plan.affects}</dt>
              <dd className="font-medium text-ink">{scope(a)}</dd>
            </dl>
            {a.evidence && (
              <a href={a.evidence} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1.5 truncate text-[12.5px] text-brand hover:underline">
                <Icon name="external" size={12} /> {a.evidence.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}
              </a>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
