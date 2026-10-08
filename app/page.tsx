import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getRuns, overview, trend } from "@/lib/metrics";
import { comparison } from "@/lib/compare";
import { actionViews, CATEGORY_COLOR } from "@/lib/actions";
import { projection } from "@/lib/projection";
import { isDemoMode } from "@/lib/config";
import { Empty } from "@/components/ui";
import { Icon } from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import Gauge from "@/components/Gauge";
import RunButton from "@/components/RunButton";
import { AnnotatedTrend, ProjectionChart } from "@/components/Charts";

function SectionTitle({ n, title, lead }: { n: number; title: string; lead?: string }) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <span className="num font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-lg font-bold text-gold-400">{n}</span>
      <div>
        <h2 className="font-display text-[22px] font-bold text-navy sm:text-[26px]">{title}</h2>
        {lead && <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-muted">{lead}</p>}
      </div>
    </div>
  );
}

export default async function Home() {
  const { lang, t } = await getT();
  const ar = lang === "ar";
  const runs = await getRuns();
  const demo = isDemoMode();
  const runLabels = { run: t.runNow, running: t.running, done: t.runDone, failed: t.runFailed };
  if (!runs.length)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-bold text-navy">{t.home.title}</h1>
        <Empty>{t.noData}</Empty>
        <RunButton labels={runLabels} disabled={demo} />
      </div>
    );

  const last = runs[runs.length - 1];
  const [o, tr, cmp, actions] = await Promise.all([overview(Number(last.id)), trend(), comparison(), actionViews()]);
  const proj = await projection(actions);
  const latest = tr[tr.length - 1];
  const brandName = ar ? "البنك الأهلي" : "Ahli Bank";
  const pos = cmp ? cmp.ranking.findIndex((r) => r.isBrand) + 1 : 0;
  const leader = cmp?.ranking.find((r) => !r.isBrand);
  const outOf10 = (v: number) => Math.round(v / 10);
  const done = actions.filter((a) => a.status === "done");
  const doing = actions.filter((a) => a.status === "doing");
  const problems = actions.filter((a) => a.status !== "done").sort((a, b) => a.priority - b.priority || b.impact - a.impact).slice(0, 3);
  const gap = Math.round(latest.en - latest.ar);
  const fmt = (d: string) => new Date(d).toLocaleDateString(ar ? "ar-OM" : "en-GB", { day: "numeric", month: "short" });

  const stand = [
    {
      label: t.kpi.mention,
      value: `${o.mentionRate}%`,
      help: t.help.mention,
      say: ar ? `تقريباً ${outOf10(o.mentionRate)} من كل 10 إجابات تذكر البنك` : `About ${outOf10(o.mentionRate)} in every 10 answers mention the Bank`,
      tone: o.mentionRate >= 50 ? "good" : "warn",
    },
    {
      label: t.kpi.top3,
      value: `${o.top3Rate}%`,
      help: t.help.top3,
      say: ar ? `في ${outOf10(o.top3Rate)} من كل 10 إجابات يكون البنك ضمن أول 3` : `In ${outOf10(o.top3Rate)} of 10 answers the Bank is in the top 3`,
      tone: o.top3Rate >= 40 ? "good" : "warn",
    },
    {
      label: ar ? "الفجوة بين اللغتين" : "Arabic vs English gap",
      value: `${gap}`,
      help: t.help.gap,
      say: ar ? `العميل الذي يسأل بالعربي يرى البنك أقل بـ${gap} نقطة (${latest.ar}% مقابل ${latest.en}%)` : `Customers asking in Arabic see the Bank ${gap} points less (${latest.ar}% vs ${latest.en}%)`,
      tone: gap > 10 ? "bad" : "good",
    },
    {
      label: t.kpi.alerts,
      value: String(o.openAlerts),
      help: t.kpi.alertsHint,
      say: o.openAlerts ? (ar ? "الذكاء الاصطناعي يذكر أرقاماً قديمة أو خاطئة عن البنك" : "AI is quoting outdated or wrong figures about the Bank") : ar ? "كل الأرقام المذكورة صحيحة" : "All figures quoted are correct",
      tone: o.openAlerts ? "bad" : "good",
    },
  ] as const;
  const toneCls = { good: "bg-good", warn: "bg-gold", bad: "bg-bad" };

  return (
    <div className="flex flex-col gap-12">
      {/* HERO */}
      <section className="hero-pattern relative overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-card sm:p-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">{t.home.eyebrow}</span>
            <h1 className="font-display text-[28px] font-bold leading-tight sm:text-[38px]">{t.home.title}</h1>
            <p className="max-w-2xl text-[15.5px] leading-relaxed text-brand-100/90">{t.home.lead}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link href="/plan" className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-navy hover:bg-gold-400">
                <Icon name="check" size={17} /> {t.home.openPlan}
              </Link>
              <Link href="/how" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 font-medium text-white hover:bg-white/10">
                {t.nav2.how}
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 lg:col-span-5">
            <div className="flex items-center gap-4">
              <div className="w-40 shrink-0">
                <Gauge value={o.score} label={t.kpi.score} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gold-400">
                  {t.kpi.score} <InfoTip text={t.help.score} light />
                </span>
                <span className="font-display text-[34px] font-bold leading-none">
                  #{pos} <span className="text-base font-normal text-brand-100/70">{t.compare.of} {cmp?.ranking.length}</span>
                </span>
                <span className="flex items-center gap-2 text-sm text-brand-100/80">
                  {t.compare.position} <InfoTip text={t.help.position} light />
                </span>
              </div>
            </div>
            {leader && cmp && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                {[{ n: leader.bank, v: leader.mention, brand: false }, { n: brandName, v: cmp.ranking.find((r) => r.isBrand)!.mention, brand: true }].map((r) => (
                  <div key={r.n} className="flex items-center gap-3 text-sm">
                    <span className={`w-36 shrink-0 truncate ${r.brand ? "font-semibold text-gold-400" : "text-brand-100/90"}`}>{r.n}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${r.v}%`, background: r.brand ? "#CDBE5E" : "#7FB2D9" }} />
                    </div>
                    <span className="num w-10 text-end font-semibold">{r.v}%</span>
                  </div>
                ))}
                <p className="text-xs text-brand-100/70">{ar ? "نسبة الإجابات التي تذكر البنك" : "Share of answers that mention the bank"}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 1. WHERE WE STAND */}
      <section>
        <SectionTitle n={1} title={t.home.standTitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stand.map((s) => (
            <div key={s.label} className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className={`absolute inset-y-0 start-0 w-1 ${toneCls[s.tone]}`} />
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
                {s.label} <InfoTip text={s.help} />
              </span>
              <span className={`num font-display text-[36px] font-bold leading-none ${s.tone === "bad" ? "text-bad" : "text-navy"}`}>{s.value}</span>
              <p className="text-[14px] leading-relaxed text-navy">{s.say}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. PROBLEMS */}
      <section>
        <SectionTitle n={2} title={t.home.problemsTitle} lead={t.home.problemsLead} />
        <div className="grid gap-4 lg:grid-cols-3">
          {problems.map((a, i) => (
            <Link key={a.key} href={`/plan#${a.key}`} className="group flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand">
              <div className="flex items-center justify-between gap-2">
                <span className="num font-display text-[40px] font-bold leading-none text-gold">{i + 1}</span>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: CATEGORY_COLOR[a.category] }}>
                  {t.cats[a.category]}
                </span>
              </div>
              <h3 className="font-display text-[18px] font-semibold leading-snug text-navy">{a.title[lang]}</h3>
              <p className="text-[14px] leading-relaxed text-ink-muted">{a.problem[lang]}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand group-hover:underline">
                {t.plan.howTo} <span aria-hidden="true">{ar ? "←" : "→"}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. PLAN + RESULTS */}
      <section>
        <SectionTitle n={3} title={t.home.resultTitle} lead={t.home.resultLead} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-card">
            <div>
              <p className="text-[13px] font-medium text-ink-muted">{t.home.progress}</p>
              <p className="font-display mt-1 text-[30px] font-bold text-navy">
                <span className="num">{done.length}</span>
                <span className="text-lg font-normal text-ink-muted"> / {actions.length} {t.home.actionsDone}</span>
              </p>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-good" style={{ width: `${(done.length / actions.length) * 100}%` }} />
                <div className="bg-gold" style={{ width: `${(doing.length / actions.length) * 100}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good" />{t.status.done}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" />{t.status.doing}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-200" />{t.status.todo}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-3 border-t border-line pt-4">
              {done.map((a) => (
                <li key={a.key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good-soft text-good"><Icon name="check" size={13} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium leading-snug text-navy">{a.title[lang]}</p>
                    {a.measured ? (
                      <p className="mt-0.5 text-[13px] text-ink-muted">
                        {a.measured.before}% → <b className="text-navy">{a.measured.after}%</b>{" "}
                        <span className={`num font-semibold ${a.measured.delta >= 0 ? "text-good" : "text-bad"}`}>({a.measured.delta >= 0 ? "+" : ""}{a.measured.delta})</span> · {t.home.measuredAfter}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-ink-soft">{t.home.waiting}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/plan" className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700">{t.home.openPlan}</Link>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card lg:col-span-2">
            <AnnotatedTrend
              data={tr}
              marks={done.filter((a) => a.doneAt).map((a) => ({ date: a.doneAt!, label: a.title[lang].split(" ").slice(0, 4).join(" ") }))}
              labels={{ overall: t.overview.overall, ar: t.overview.arabic, en: t.overview.english, fixes: ar ? "إصلاحات" : "fixes" }}
            />
            {done.length > 0 && (
              <p className="mt-3 text-[13px] text-ink-muted">
                {done.length} {ar ? "إصلاحات تمت في" : "fixes completed on"} {fmt(done[0].doneAt!)}.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 4. PROJECTION */}
      {proj && (
        <section>
          <SectionTitle n={4} title={t.home.projTitle} lead={t.home.projLead} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-b from-gold-50 to-white p-6 ring-1 ring-gold-100">
              <p className="text-[13px] font-medium text-gold-700">{t.home.withPlan}</p>
              <p className="font-display text-navy">
                <span className="text-lg text-ink-muted">{t.home.fromTo} </span>
                <span className="num text-[34px] font-bold">{proj.current}%</span>
                <span className="text-lg text-ink-muted"> {t.home.to} </span>
                <span className="num text-[44px] font-bold text-gold-700">{proj.target}%</span>
              </p>
              <p className="text-[14px] text-navy">
                {t.home.inWeeks} · <b className="num text-good">+{proj.expectedLift}</b> {t.plan.points}
              </p>
              <p className="mt-auto rounded-xl bg-white/70 p-3 text-[12.5px] leading-relaxed text-ink-muted">{t.home.projNote}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card lg:col-span-2">
              <ProjectionChart data={proj.points} labels={{ actual: t.home.actual, noAction: t.home.noAction, withPlan: t.home.withPlan, today: t.home.today, forecast: t.home.forecast }} />
            </div>
          </div>
        </section>
      )}

      {/* 5. HOW IT WORKS */}
      <section>
        <SectionTitle n={5} title={t.home.howTitle} />
        <div className="grid gap-4 md:grid-cols-3">
          {t.home.howSteps.map((s, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <Icon name={(["chat", "list", "check"] as const)[i]} size={20} />
              </span>
              <p className="text-[14.5px] leading-relaxed text-navy">{s}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/how" className="text-sm font-semibold text-brand hover:underline">{t.home.readMore} {ar ? "←" : "→"}</Link>
          <RunButton labels={runLabels} disabled={demo} disabledHint={demo ? t.demoBanner.split(".")[0] : undefined} />
        </div>
      </section>
    </div>
  );
}
