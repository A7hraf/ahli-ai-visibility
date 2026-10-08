import Link from "next/link";
import { getT } from "@/lib/i18n";
import { citationStats, engineLangMatrix, getRuns, openAlerts, overview, shareOfVoice, trend } from "@/lib/metrics";
import { engineLabel, isDemoMode } from "@/lib/config";
import { Badge, Card, Empty, Kpi, PageHeader, Bar } from "@/components/ui";
import { EngineLangChart, SovChart, TrendChart } from "@/components/Charts";
import RunButton from "@/components/RunButton";

export default async function Overview() {
  const { lang, t } = await getT();
  const runs = await getRuns();
  const demo = isDemoMode();
  const runLabels = { run: t.runNow, running: t.running, done: t.runDone, failed: t.runFailed };

  if (!runs.length) {
    return (
      <>
        <PageHeader title={t.overview.title} lead={t.overview.lead}>
          <RunButton labels={runLabels} disabled={demo} />
        </PageHeader>
        <Empty>{t.noData}</Empty>
      </>
    );
  }

  const last = runs[runs.length - 1];
  const prev = runs.length > 1 ? runs[runs.length - 2] : null;
  const [o, op, matrix, tr, sov, cites, alerts] = await Promise.all([
    overview(Number(last.id)),
    prev ? overview(Number(prev.id)) : Promise.resolve(null),
    engineLangMatrix(Number(last.id)),
    trend(),
    shareOfVoice(Number(last.id)),
    citationStats(Number(last.id)),
    openAlerts(5),
  ]);
  const d = (a: number, b?: number | null) => (b === undefined || b === null ? null : Math.round((a - b) * 10) / 10);
  const fmtDate = new Date(last.started_at).toLocaleDateString(lang === "ar" ? "ar-OM" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const enAvg = tr.length ? tr[tr.length - 1].en : 0;
  const arAvg = tr.length ? tr[tr.length - 1].ar : 0;

  return (
    <>
      <PageHeader title={t.overview.title} lead={t.overview.lead}>
        <div className="text-end text-sm text-ink-muted">
          <div>{t.lastRun}</div>
          <div className="font-medium text-navy">{fmtDate}</div>
        </div>
        <RunButton labels={runLabels} disabled={demo} disabledHint={demo ? t.demoBanner.split(".")[0] : undefined} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi tone="brand" label={t.kpi.score} value={String(o.score)} hint={t.kpi.scoreHint} delta={op ? d(o.score, op.score) : null} />
        <Kpi label={t.kpi.mention} value={`${o.mentionRate}%`} hint={t.kpi.mentionHint} delta={op ? d(o.mentionRate, op.mentionRate) : null} />
        <Kpi label={t.kpi.top3} value={`${o.top3Rate}%`} hint={t.kpi.top3Hint} delta={op ? d(o.top3Rate, op.top3Rate) : null} />
        <Kpi label={t.kpi.sov} value={`${o.sov}%`} hint={t.kpi.sovHint} delta={op ? d(o.sov, op.sov) : null} />
        <Kpi tone={o.openAlerts ? "bad" : "default"} label={t.kpi.alerts} value={String(o.openAlerts)} hint={t.kpi.alertsHint} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={t.overview.trend} note={t.overview.trendNote} className="lg:col-span-2">
          <TrendChart data={tr} labels={{ en: t.overview.english, ar: t.overview.arabic, overall: t.overview.overall }} />
        </Card>
        <Card title={t.overview.arabic + " / " + t.overview.english}>
          <div className="flex flex-col gap-5">
            <div className="hero-pattern rounded-xl bg-navy p-5 text-white">
              <p className="text-sm text-brand-100/80">{lang === "ar" ? "الفجوة بين اللغتين" : "Language gap"}</p>
              <p className="num font-display mt-1 text-[40px] font-bold leading-none text-gold-400">{Math.round((enAvg - arAvg) * 10) / 10}</p>
              <p className="mt-2 text-sm text-brand-100/90">
                {lang === "ar" ? "نقطة مئوية: العملاء الذين يسألون بالعربي يرون البنك أقل." : "percentage points: customers asking in Arabic see the Bank less often."}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm"><span>{t.overview.english}</span><span className="num font-semibold">{enAvg}%</span></div>
              <Bar value={enAvg} />
              <div className="flex items-center justify-between text-sm"><span>{t.overview.arabic}</span><span className="num font-semibold">{arAvg}%</span></div>
              <Bar value={arAvg} color="#ADA042" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={t.overview.byEngine}>
          <EngineLangChart data={matrix} labels={{ en: t.overview.english, ar: t.overview.arabic }} />
        </Card>
        <Card title={t.overview.sov}>
          <SovChart data={sov.map((s) => ({ ...s, name: s.isBrand ? (lang === "ar" ? "البنك الأهلي" : "Ahli Bank") : s.name }))} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={t.overview.topSources} action={<Link href="/sources" className="text-sm font-medium text-brand hover:underline">{t.overview.seeAll}</Link>}>
          <ul className="flex flex-col divide-y divide-line">
            {cites.domains.slice(0, 6).map((dm) => (
              <li key={dm.domain} className="flex items-center gap-3 py-2.5">
                <span dir="ltr" className="min-w-0 flex-1 truncate text-sm font-medium">{dm.domain}</span>
                <Badge tone={dm.kind === "own" ? "gold" : dm.kind === "lookalike" ? "bad" : dm.kind === "competitor" ? "warn" : "muted"}>{t.sources.kinds[dm.kind]}</Badge>
                <span className="num w-12 text-end text-sm text-ink-muted">{dm.share}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.overview.alerts} action={<Link href="/accuracy" className="text-sm font-medium text-brand hover:underline">{t.overview.seeAll}</Link>}>
          {alerts.filter((a) => a.status === "open").length === 0 ? (
            <p className="text-sm text-ink-muted">{t.accuracy.none}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {alerts.filter((a) => a.status === "open").map((a) => (
                <li key={a.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="bad">{engineLabel(a.engine)}</Badge>
                    <span className="truncate text-sm text-ink-muted" dir="auto">{a.prompt_text}</span>
                  </div>
                  <p className="text-sm">
                    {t.accuracy.said}: <b className="text-bad">{a.said}</b> · {t.accuracy.expected}: <b className="text-good">{a.expected}</b>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
