import { getT } from "@/lib/i18n";
import { all, parseJSON } from "@/lib/db";
import { AUDIT_FINDINGS, type SiteReport } from "@/lib/sitecheck";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import SiteCheckButton from "@/components/SiteCheckButton";
import { Donut } from "@/components/viz/core";

export default async function SitePage() {
  const { lang, t } = await getT();
  const last = (await all<{ results: string }>("SELECT results FROM site_checks ORDER BY id DESC LIMIT 1"))[0];
  const report = last ? parseJSON<SiteReport | null>(last.results, null) : null;
  const sevTone = { high: "bad", medium: "warn", verify: "muted" } as const;
  const checks = report ? report.pages.flatMap((p) => p.items) : [];

  return (
    <>
      <PageHeader title={t.site.title} lead={t.site.lead}>
        <SiteCheckButton labels={{ run: t.site.runCheck, running: t.site.checking }} />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {report ? (
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
            <Donut
              size={92}
              thickness={11}
              data={[
                { key: "ok", label: "✓", value: checks.filter((c) => c.ok).length, color: "#1D7A47" },
                { key: "no", label: "✗", value: checks.filter((c) => c.ok === false).length, color: "#d03b3b" },
                { key: "na", label: "?", value: checks.filter((c) => c.ok !== true && c.ok !== false).length, color: "#CBD5E1" },
              ]}
              center={<span className="text-[18px] font-semibold text-ink">{checks.length ? Math.round((100 * checks.filter((c) => c.ok).length) / checks.length) : 0}%</span>}
            />
            <div>
              <p className="text-[12.5px] font-medium text-ink-muted">{lang === "ar" ? "الفحوصات الناجحة" : "Checks passed"}</p>
              <p className="mt-1 text-[24px] font-semibold text-ink">
                {checks.filter((c) => c.ok).length}
                <span className="text-[14px] font-normal text-ink-muted">/{checks.length}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center rounded-2xl border border-dashed border-line bg-white p-5 text-[13px] text-ink-muted">{t.site.runCheck} →</div>
        )}
        {(["high", "medium", "verify"] as const).map((sv) => {
          const n = AUDIT_FINDINGS.filter((f) => f.severity === sv).length;
          const tone = sv === "high" ? "text-bad bg-bad-soft/50 border-bad/20" : sv === "medium" ? "text-warn bg-warn-soft/50 border-warn/20" : "text-ink-muted bg-white border-line";
          return (
            <div key={sv} className={`flex flex-col rounded-2xl border p-5 shadow-card ${tone}`}>
              <p className="text-[12.5px] font-medium text-ink-muted">{lang === "ar" ? "أولوية" : "Priority"}: {t.site.severity[sv]}</p>
              <p className="mt-2 text-[38px] font-semibold leading-none">{n}</p>
              <div className="mt-auto flex gap-1 pt-3">
                {Array.from({ length: AUDIT_FINDINGS.length }).map((_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? "bg-current" : "bg-slate-200"}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card title={t.site.audit} note={t.site.auditNote} className="mb-6">
        <ul className="flex flex-col divide-y divide-line">
          {AUDIT_FINDINGS.map((f) => {
            const tx = t.site.findings[f.id];
            return (
              <li key={f.id} className="grid gap-3 py-4 md:grid-cols-12 md:gap-6 [&>*]:min-w-0">
                <div className="md:col-span-1">
                  <Badge tone={sevTone[f.severity]}>{t.site.severity[f.severity]}</Badge>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-6">
                  <p className="font-semibold text-navy">{tx.t}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">{tx.d}</p>
                  {f.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {f.evidence.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-brand hover:underline">
                          <Icon name="external" size={12} /> {u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 md:col-span-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.site.fix}</span>
                  <p className="text-sm leading-relaxed">{tx.f}</p>
                </div>
                <div className="md:col-span-1">
                  <span className="text-xs text-ink-muted">{f.owner}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {report && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title={t.site.robots} note={report.robots.note}>
            {report.robots.reachable ? (
              <div className="flex flex-col gap-3">
                {report.robots.blocked.map((b) => (
                  <div key={b} className="flex items-center justify-between text-sm"><span dir="ltr">{b}</span><Badge tone="bad">{t.site.blocked}</Badge></div>
                ))}
                {report.robots.allowed.map((b) => (
                  <div key={b} className="flex items-center justify-between text-sm"><span dir="ltr">{b}</span><Badge tone="good">{t.site.allowed}</Badge></div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-warn">{report.robots.note}</p>
            )}
            <p className="mt-4 text-xs text-ink-soft">{new Date(report.checkedAt).toLocaleString(lang === "ar" ? "ar-OM" : "en-GB")}</p>
          </Card>
          <Card title={t.site.pages} className="lg:col-span-2">
            <div className="flex flex-col gap-5">
              {report.pages.map((p) => (
                <div key={p.url} className="flex flex-col gap-2">
                  <a dir="ltr" href={p.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-semibold text-brand hover:underline">{p.url.replace(/^https?:\/\//, "")}</a>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {p.items.map((it) => (
                      <div key={it.id} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 shrink-0 rounded-full p-0.5 ${it.ok ? "bg-good-soft text-good" : it.ok === false ? "bg-bad-soft text-bad" : "bg-slate-100 text-ink-soft"}`}>
                          <Icon name={it.ok ? "check" : "x"} size={12} />
                        </span>
                        <span>
                          {t.site.items[it.id as keyof typeof t.site.items] ?? it.id}
                          <span className="block text-xs text-ink-soft" dir="auto">{it.detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
