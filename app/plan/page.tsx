import Link from "next/link";
import { getT } from "@/lib/i18n";
import { actionViews, CATEGORY_COLOR, type Category } from "@/lib/actions";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import StatusControl from "@/components/StatusControl";

const CATS: Category[] = ["content", "technical", "partners", "accuracy"];

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const ar = lang === "ar";
  const all = await actionViews();
  const cat = CATS.includes(sp.cat as Category) ? (sp.cat as Category) : null;
  const list = cat ? all.filter((a) => a.category === cat) : all;
  const done = all.filter((a) => a.status === "done").length;
  const doing = all.filter((a) => a.status === "doing").length;
  const remainingGain = all.filter((a) => a.status !== "done").reduce((s, a) => s + a.impact, 0);
  const prio = { 1: t.plan.p1, 2: t.plan.p2, 3: t.plan.p3 } as const;
  const effortTone = { low: "text-good", medium: "text-gold-700", high: "text-bad" };
  const scopeText = (a: (typeof all)[number]) =>
    a.scope.lang === "ar" ? t.plan.arabicQuestions : a.scope.lang === "en" ? t.plan.englishQuestions : a.scope.product ? `${t.plan.productQuestions} ${t.products[a.scope.product as keyof typeof t.products]}` : t.plan.allQuestions;
  const chip = (active: boolean) => `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-navy text-white" : "border border-line bg-white text-ink-muted hover:border-brand hover:text-brand"}`;

  return (
    <>
      <PageHeader title={t.plan.title} lead={t.plan.lead} />

      {/* summary */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="hero-pattern flex flex-col gap-3 rounded-2xl bg-navy p-6 text-white shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-gold-400">{t.home.progress}</span>
          <p className="font-display text-[36px] font-bold leading-none">
            <span className="num">{done}</span>
            <span className="text-lg font-normal text-brand-100/70"> / {all.length}</span>
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            <div className="bg-emerald-400" style={{ width: `${(done / all.length) * 100}%` }} />
            <div className="bg-gold-400" style={{ width: `${(doing / all.length) * 100}%` }} />
          </div>
          <p className="text-sm text-brand-100/80">
            {done} {t.plan.summaryDone} · {doing} {t.plan.summaryDoing} · {all.length - done - doing} {t.plan.summaryTodo}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {CATS.map((c) => {
            const items = all.filter((a) => a.category === c);
            const d = items.filter((a) => a.status === "done").length;
            return (
              <Link key={c} href={cat === c ? "/plan" : `/plan?cat=${c}`} className={`flex flex-col gap-1.5 rounded-2xl border bg-white p-4 shadow-card transition hover:border-brand ${cat === c ? "border-brand ring-2 ring-brand-100" : "border-line"}`}>
                <span className="flex items-center gap-2 font-semibold text-navy">
                  <span className="h-3 w-3 rounded-full" style={{ background: CATEGORY_COLOR[c] }} />
                  {t.cats[c]}
                  <span className="num ms-auto text-sm font-normal text-ink-muted">{d}/{items.length}</span>
                </span>
                <span className="text-[12.5px] leading-snug text-ink-muted">{t.catsHint[c]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href="/plan" className={chip(!cat)}>{t.plan.all} <span className="num opacity-70">{all.length}</span></Link>
        {CATS.map((c) => (
          <Link key={c} href={`/plan?cat=${c}`} className={chip(cat === c)}>
            <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[c] }} />
            {t.cats[c]}
          </Link>
        ))}
        <span className="ms-auto text-sm text-ink-muted">
          {t.plan.expectedTotal}: <b className="num text-good">+{remainingGain}</b> {t.plan.points}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {list.map((a) => (
          <article id={a.key} key={a.key} className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-card ${a.status === "done" ? "border-good/40" : "border-line"}`}>
            <div className="h-1.5" style={{ background: CATEGORY_COLOR[a.category] }} />
            <div className="grid gap-6 p-6 lg:grid-cols-12">
              <div className="flex flex-col gap-4 lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: CATEGORY_COLOR[a.category] }}>{t.cats[a.category]}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${a.priority === 1 ? "bg-bad-soft text-bad" : a.priority === 2 ? "bg-warn-soft text-warn" : "bg-slate-100 text-ink-muted"}`}>
                    {t.plan.priority}: {prio[a.priority]}
                  </span>
                  {a.status === "done" && <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-1 text-xs font-semibold text-good"><Icon name="check" size={12} /> {t.status.done}</span>}
                </div>
                <h2 className="font-display text-[20px] font-bold leading-snug text-navy">{a.title[lang]}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-bad-soft/50 p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-bad"><Icon name="alert" size={13} /> {t.plan.whatsWrong}</p>
                    <p className="text-[14px] leading-relaxed text-navy">{a.problem[lang]}</p>
                  </div>
                  <div className="rounded-xl bg-brand-50 p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand"><Icon name="sparkle" size={13} /> {t.plan.whyMatters}</p>
                    <p className="text-[14px] leading-relaxed text-navy">{a.why[lang]}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t.plan.howTo}</p>
                  <ol className="flex flex-col gap-2">
                    {a.steps[lang].map((s, i) => (
                      <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-navy">
                        <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-gold-400">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
                {a.evidence && (
                  <a href={a.evidence} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex max-w-full items-center gap-1.5 self-start truncate text-xs text-brand hover:underline">
                    <Icon name="external" size={12} /> {t.plan.evidence}: {a.evidence.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}
                  </a>
                )}
              </div>

              <aside className="flex flex-col gap-4 rounded-2xl bg-canvas p-5 lg:col-span-4">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-[13px]">
                  <dt className="text-ink-muted">{t.plan.owner}</dt>
                  <dd className="font-medium text-navy">{a.owner[lang]}</dd>
                  <dt className="text-ink-muted">{t.plan.expected}</dt>
                  <dd className="num font-semibold text-good">+{a.impact} {t.plan.points}</dd>
                  <dt className="text-ink-muted">{t.plan.affects}</dt>
                  <dd className="font-medium text-navy">{scopeText(a)}</dd>
                  <dt className="text-ink-muted">{ar ? "الجهد" : "Effort"}</dt>
                  <dd className={`font-medium ${effortTone[a.effort]}`}>{t.effort[a.effort]}</dd>
                </dl>
                <StatusControl actionKey={a.key} status={a.status} labels={{ ...t.status, error: ar ? "يلزم رمز المسؤول من الإعدادات" : "Admin token required (Settings)" }} />
                {a.status === "done" && (
                  <div className="rounded-xl bg-white p-4 ring-1 ring-line">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">{t.plan.result}</p>
                    {a.measured ? (
                      <>
                        <div className="flex items-end gap-3" dir="ltr">
                          {[{ l: t.plan.before, v: a.measured.before, c: "#C9D6E3" }, { l: t.plan.after, v: a.measured.after, c: a.measured.delta >= 0 ? "#1D7A47" : "#B23A2E" }].map((b) => (
                            <div key={b.l} className="flex flex-1 flex-col items-center gap-1">
                              <span className="num text-sm font-semibold text-navy">{b.v}%</span>
                              <div className="flex h-20 w-full items-end rounded-md bg-slate-50">
                                <div className="w-full rounded-md" style={{ height: `${Math.max(4, b.v)}%`, background: b.c }} />
                              </div>
                              <span className="text-xs text-ink-muted">{b.l}</span>
                            </div>
                          ))}
                        </div>
                        <p className={`mt-3 text-center text-sm font-semibold ${a.measured.delta >= 0 ? "text-good" : "text-bad"}`}>
                          {a.measured.delta >= 0 ? "▲" : "▼"} {Math.abs(a.measured.delta)} {t.plan.points} · {scopeText(a)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">{t.home.waiting}</p>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
