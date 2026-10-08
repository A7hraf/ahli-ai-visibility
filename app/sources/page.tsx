import { getT } from "@/lib/i18n";
import { citationStats, getRuns } from "@/lib/metrics";
import { Badge, Bar, Card, Empty, PageHeader } from "@/components/ui";

export default async function SourcesPage() {
  const { t } = await getT();
  const runs = await getRuns();
  const last = runs[runs.length - 1];
  if (!last) return (<><PageHeader title={t.sources.title} lead={t.sources.lead} /><Empty>{t.noData}</Empty></>);
  const s = await citationStats(Number(last.id));
  const max = s.domains[0]?.n ?? 1;
  const tone = (k: string) => (k === "own" ? "gold" : k === "lookalike" ? "bad" : k === "competitor" ? "warn" : k === "comparison" ? "brand" : "muted") as "gold" | "bad" | "warn" | "brand" | "muted";

  return (
    <>
      <PageHeader title={t.sources.title} lead={t.sources.lead} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="hero-pattern flex flex-col gap-2 rounded-2xl bg-navy p-6 text-white shadow-card sm:col-span-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gold-400">{t.sources.ownRate}</span>
          <span className="num font-display text-[44px] font-bold leading-none">{s.ownCitationRate}%</span>
        </div>
        <Card className="sm:col-span-2" title={t.sources.ownPages}>
          {s.ownPages.length === 0 ? (
            <p className="text-sm text-ink-muted">{t.sources.none}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {s.ownPages.slice(0, 5).map((p) => (
                <li key={p.url} className="flex items-center gap-3 text-sm">
                  <a dir="ltr" href={p.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-brand hover:underline">{p.url.replace(/^https?:\/\//, "")}</a>
                  <span className="num text-ink-muted">×{p.n}</span>
                  {p.url.endsWith(".pdf") && <Badge tone="warn">PDF</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={t.sources.domains}>
        <ul className="flex flex-col divide-y divide-line">
          {s.domains.slice(0, 20).map((d) => (
            <li key={d.domain} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-12 md:items-center md:gap-4">
              <div className="flex min-w-0 items-center gap-2 md:col-span-4">
                <span dir="ltr" className="truncate font-medium">{d.domain}</span>
                <Badge tone={tone(d.kind)}>{t.sources.kinds[d.kind]}</Badge>
              </div>
              <div className="flex items-center gap-3 md:col-span-3">
                <Bar value={(d.n / max) * 100} color={d.kind === "own" ? "#ADA042" : d.kind === "lookalike" ? "#B23A2E" : "#0B6298"} />
                <span className="num w-12 shrink-0 text-end text-sm text-ink-muted">{d.share}%</span>
              </div>
              <p className="text-[13px] text-ink-muted md:col-span-5">{t.sources.actions[d.kind]}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
