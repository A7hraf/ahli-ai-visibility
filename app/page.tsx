import Link from "next/link";
import { getT } from "@/lib/i18n";
import { citationStats, engineLangMatrix, getRuns, openAlerts, overview, shareOfVoice, trend } from "@/lib/metrics";
import { comparison } from "@/lib/compare";
import { aiInsights, ruleInsights } from "@/lib/insights";
import { engineLabel, isDemoMode } from "@/lib/config";
import { Badge, Card, Empty, Kpi, PageHeader } from "@/components/ui";
import { EngineLangChart, ProductBars, SentimentDonut, SovChart, TrendChart } from "@/components/Charts";
import { Icon } from "@/components/Icon";
import Gauge from "@/components/Gauge";
import RunButton from "@/components/RunButton";

const TONE = {
  good: { c: "bg-good-soft text-good", i: "check" },
  warn: { c: "bg-warn-soft text-warn", i: "alert" },
  bad: { c: "bg-bad-soft text-bad", i: "alert" },
  info: { c: "bg-brand-50 text-brand", i: "sparkle" },
} as const;

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
  const [o, op, matrix, tr, sov, cites, alerts, cmp, aiIns] = await Promise.all([
    overview(Number(last.id)),
    prev ? overview(Number(prev.id)) : Promise.resolve(null),
    engineLangMatrix(Number(last.id)),
    trend(),
    shareOfVoice(Number(last.id)),
    citationStats(Number(last.id)),
    openAlerts(5),
    comparison(),
    aiInsights(lang),
  ]);
  const insights = aiIns ?? (await ruleInsights(lang));
  const d = (a: number, b?: number | null) => (b === undefined || b === null ? null : Math.round((a - b) * 10) / 10);
  const fmtDate = new Date(last.started_at).toLocaleDateString(lang === "ar" ? "ar-OM" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const latest = tr[tr.length - 1];
  const brandName = lang === "ar" ? "البنك الأهلي" : "Ahli Bank";
  const pos = cmp ? cmp.ranking.findIndex((r) => r.isBrand) + 1 : null;
  const leader = cmp?.ranking.find((r) => !r.isBrand);
  const brandProd = cmp?.byProduct.find((r) => r.bank === "Ahli Bank");
  const leaderProd = cmp?.byProduct.find((r) => r.bank === leader?.bank);
  const productData = brandProd
    ? brandProd.cells.map((c, i) => ({ product: c.product, label: t.products[c.product as keyof typeof t.products], v: Math.round(c.v), leader: Math.round(leaderProd?.cells[i].v ?? 0) }))
    : [];
  const neutral = Math.max(0, Math.round((100 - o.positive - o.negative) * 10) / 10);
  const sentiment = [
    { name: t.answers.sentiment.positive, value: o.positive, color: "#1D7A47" },
    { name: t.answers.sentiment.neutral, value: neutral, color: "#C9D6E3" },
    { name: t.answers.sentiment.negative, value: o.negative, color: "#B23A2E" },
  ];

  return (
    <>
      <PageHeader title={t.overview.title} lead={t.overview.lead}>
        <div className="text-end text-sm text-ink-muted">
          <div>{t.lastRun}</div>
          <div className="font-medium text-navy">{fmtDate}</div>
        </div>
        <RunButton labels={runLabels} disabled={demo} disabledHint={demo ? t.demoBanner.split(".")[0] : undefined} />
      </PageHeader>

      {/* hero + KPIs */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="hero-pattern relative overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-card lg:col-span-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="flex w-full max-w-[240px] flex-col items-center">
              <Gauge value={o.score} label={t.kpi.score} />
              <span className="-mt-1 text-xs font-medium uppercase tracking-wide text-gold-400">{t.kpi.score}</span>
            </div>
            <div className="flex w-full flex-col gap-4">
              {pos && (
                <div>
                  <p className="text-xs text-brand-100/70">{t.compare.position}</p>
                  <p className="font-display text-3xl font-bold">
                    #{pos} <span className="text-base font-normal text-brand-100/70">{t.compare.of} {cmp!.ranking.length}</span>
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-brand-100/70">{lang === "ar" ? "الفجوة بين اللغتين" : "Language gap"}</p>
                <p className="num font-display text-3xl font-bold text-gold-400">{Math.round((latest.en - latest.ar) * 10) / 10}</p>
                <p className="text-xs text-brand-100/70">EN {latest.en}% · AR {latest.ar}%</p>
              </div>
              {op && (
                <span className={`num inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${o.score >= op.score ? "bg-good/25 text-emerald-200" : "bg-bad/25 text-red-200"}`}>
                  <Icon name={o.score >= op.score ? "arrowUp" : "arrowDown"} size={12} />
                  {Math.abs(o.score - op.score)} {t.kpi.vsPrev}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-7">
          <Kpi label={t.kpi.mention} value={`${o.mentionRate}%`} hint={t.kpi.mentionHint} delta={op ? d(o.mentionRate, op.mentionRate) : null} />
          <Kpi label={t.kpi.top3} value={`${o.top3Rate}%`} hint={t.kpi.top3Hint} delta={op ? d(o.top3Rate, op.top3Rate) : null} />
          <Kpi label={t.kpi.sov} value={`${o.sov}%`} hint={t.kpi.sovHint} delta={op ? d(o.sov, op.sov) : null} />
          <Kpi tone={o.openAlerts ? "bad" : "default"} label={t.kpi.alerts} value={String(o.openAlerts)} hint={t.kpi.alertsHint} />
        </div>
      </div>

      {/* insights + trend */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={t.insights.title} note={aiIns ? t.insights.ai : t.insights.rules}>
          <ul className="flex flex-col gap-3">
            {insights.map((x, i) => (
              <li key={i} className="flex gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE[x.tone]?.c ?? TONE.info.c}`}>
                  <Icon name={TONE[x.tone]?.i ?? "sparkle"} size={15} />
                </span>
                <p className="text-[14px] leading-relaxed">{x.text}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.overview.trend} note={t.overview.trendNote} className="lg:col-span-2">
          <TrendChart data={tr} labels={{ en: t.overview.english, ar: t.overview.arabic, overall: t.overview.overall }} />
        </Card>
      </div>

      {/* engines + share of voice */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={t.overview.byEngine}>
          <EngineLangChart data={matrix} labels={{ en: t.overview.english, ar: t.overview.arabic }} />
        </Card>
        <Card title={t.overview.sov} action={<Link href="/compare" className="text-sm font-medium text-brand hover:underline">{t.overview.seeAll}</Link>}>
          <SovChart data={sov.map((s) => ({ ...s, name: s.isBrand ? brandName : s.name }))} />
        </Card>
      </div>

      {/* products + sentiment */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={t.compare.heatProduct} note={leader ? `${brandName} vs ${leader.bank}` : undefined} className="lg:col-span-2">
          <ProductBars data={productData} labels={{ brand: brandName, leader: leader?.bank ?? "" }} />
        </Card>
        <Card title={lang === "ar" ? "نبرة الإجابات عن البنك" : "How answers describe the Bank"}>
          <SentimentDonut data={sentiment} />
          <div className="mt-3 flex justify-center gap-4 text-xs">
            {sentiment.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name} <span className="num text-ink-muted">{s.value}%</span></span>
            ))}
          </div>
        </Card>
      </div>

      {/* sources + alerts */}
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
