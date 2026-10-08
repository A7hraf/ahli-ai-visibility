import { getT } from "@/lib/i18n";
import { all, parseJSON } from "@/lib/db";
import { AUDIT_FINDINGS, type SiteReport } from "@/lib/sitecheck";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import SiteCheckButton from "@/components/SiteCheckButton";

export default async function SitePage() {
  const { lang, t } = await getT();
  const last = (await all<{ results: string }>("SELECT results FROM site_checks ORDER BY id DESC LIMIT 1"))[0];
  const report = last ? parseJSON<SiteReport | null>(last.results, null) : null;
  const sevTone = { high: "bad", medium: "warn", verify: "muted" } as const;

  return (
    <>
      <PageHeader title={t.site.title} lead={t.site.lead}>
        <SiteCheckButton labels={{ run: t.site.runCheck, running: t.site.checking }} />
      </PageHeader>

      <Card title={t.site.audit} note={t.site.auditNote} className="mb-6">
        <ul className="flex flex-col divide-y divide-line">
          {AUDIT_FINDINGS.map((f) => {
            const tx = t.site.findings[f.id];
            return (
              <li key={f.id} className="grid gap-3 py-4 md:grid-cols-12 md:gap-6">
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
