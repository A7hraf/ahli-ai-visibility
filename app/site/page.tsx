import { getT } from "@/lib/i18n";
import { all, parseJSON } from "@/lib/db";
import { AUDIT_FINDINGS, type SiteReport } from "@/lib/sitecheck";
import { Badge, Card } from "@/components/ui";
import { UI } from "@/lib/ui-text";
import { Icon } from "@/components/Icon";
import SiteCheckButton from "@/components/SiteCheckButton";

export default async function SitePage() {
  const { lang, t } = await getT();
  const last = (await all<{ results: string }>("SELECT results FROM site_checks ORDER BY id DESC LIMIT 1"))[0];
  const report = last ? parseJSON<SiteReport | null>(last.results, null) : null;
  const sevTone = { high: "bad", medium: "warn", verify: "muted" } as const;
  const checks = report ? report.pages.flatMap((p) => p.items) : [];
  const score = checks.length ? Math.round((100 * checks.filter((c) => c.ok).length) / checks.length) : null;
  const ui = UI[lang];

  return (
    <>
      {/* hero: one readiness score */}
      <section className="rise relative mb-5 mt-3 overflow-hidden rounded-[4px] bg-navy px-6 py-7 text-white sm:px-9">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative h-[130px] w-[130px] shrink-0">
            <svg viewBox="0 0 130 130" className="-rotate-90" aria-hidden="true">
              <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="11" />
              <circle cx="65" cy="65" r="56" fill="none" stroke="#C9A227" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(score ?? 0) * 3.52} 352`} style={{ transition: "stroke-dasharray 1.2s" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[38px] leading-none">{score ?? "–"}</span>
              <span className="mt-1 text-[11px] text-white/65">{lang === "ar" ? "درجة الجاهزية" : "Readiness"}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-[12.5px] font-bold text-gold-400">{ui.kick.site}</p>
            <h1 className="font-display text-[28px] leading-tight sm:text-[34px]">{t.site.title}</h1>
            <p className="max-w-2xl text-[14.5px] leading-relaxed text-white/80">{t.site.lead}</p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <SiteCheckButton labels={{ run: t.site.runCheck, running: t.site.checking }} />
            {report && <span className="text-[12px] text-white/60">{new Date(report.checkedAt).toLocaleString(lang === "ar" ? "ar-OM" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>}
          </div>
        </div>
      </section>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{lang === "ar" ? "الفحوصات الناجحة" : "Checks passed"}</p>
          <p className="font-display text-[34px] leading-none text-good">
            {checks.filter((c) => c.ok).length}
            <span className="text-[16px] text-ink-muted">/{checks.length}</span>
          </p>
        </div>
        {(["high", "medium", "verify"] as const).map((sv) => {
          const n = AUDIT_FINDINGS.filter((f) => f.severity === sv).length;
          const tone = sv === "high" ? "text-bad" : sv === "medium" ? "text-warn" : "text-navy";
          return (
            <div key={sv} className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
              <p className="text-[14px] font-bold text-ink">
                {lang === "ar" ? "أولوية" : "Priority"}: {t.site.severity[sv]}
              </p>
              <p className={`font-display text-[34px] leading-none ${tone}`}>{n}</p>
              <div className="mt-auto flex gap-1">
                {Array.from({ length: AUDIT_FINDINGS.length }).map((_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-[1px] ${i < n ? "bg-current " + tone : "bg-slate-200"}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card title={t.site.audit} note="Prioritised fixes" className="mb-5">
        <p className="mb-4 text-[14px] text-ink-2">{t.site.auditNote}</p>
        <ul className="flex flex-col gap-3">
          {AUDIT_FINDINGS.map((f) => {
            const tx = t.site.findings[f.id];
            return (
              <li key={f.id} className="lift grid gap-3 rounded-[4px] border border-line p-4 md:grid-cols-12 md:gap-6 [&>*]:min-w-0">
                <div className="md:col-span-1">
                  <Badge tone={sevTone[f.severity]}>{t.site.severity[f.severity]}</Badge>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-6">
                  <p className="text-[15px] font-bold text-ink">{tx.t}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">{tx.d}</p>
                  {f.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {f.evidence.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-navy hover:underline">
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
        <div className="grid gap-5 lg:grid-cols-3">
          <Card title={t.site.robots} note={report.robots.note}>
            {report.robots.reachable ? (
              <div className="flex flex-col gap-3">
                {report.robots.blocked.map((b) => (
                  <div key={b} className="flex items-center justify-between border-b border-line pb-2.5 text-sm last:border-0"><b dir="ltr">{b}</b><Badge tone="bad">⊘ {t.site.blocked}</Badge></div>
                ))}
                {report.robots.allowed.map((b) => (
                  <div key={b} className="flex items-center justify-between border-b border-line pb-2.5 text-sm last:border-0"><b dir="ltr">{b}</b><Badge tone="good">✓ {t.site.allowed}</Badge></div>
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
                  <a dir="ltr" href={p.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-bold text-navy hover:underline">{p.url.replace(/^https?:\/\//, "")}</a>
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
