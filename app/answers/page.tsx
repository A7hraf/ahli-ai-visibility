import Link from "next/link";
import { getT } from "@/lib/i18n";
import { all, parseJSON } from "@/lib/db";
import { getRuns, domainOf } from "@/lib/metrics";
import { ENGINES, engineLabel } from "@/lib/config";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import type { Citation, ExtractedFact } from "@/lib/types";

type Row = {
  id: number;
  engine: string;
  repeat: number;
  text: string;
  mentioned: number;
  rank: number | null;
  sentiment: "positive" | "neutral" | "negative";
  competitors: string;
  facts: string;
  citations: string;
  error: string | null;
  simulated: number;
  prompt_text: string;
  lang: string;
};

type SP = Promise<{ engine?: string; lang?: string; named?: string; page?: string; q?: string }>;

export default async function AnswersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const runs = await getRuns();
  const last = runs[runs.length - 1];
  if (!last) return (<><PageHeader title={t.answers.title} lead={t.answers.lead} /><Empty>{t.noData}</Empty></>);

  const where = ["a.run_id = ?"];
  const args: (string | number)[] = [Number(last.id)];
  if (sp.engine) { where.push("a.engine = ?"); args.push(sp.engine); }
  if (sp.lang === "en" || sp.lang === "ar") { where.push("p.lang = ?"); args.push(sp.lang); }
  if (sp.named === "1") where.push("a.mentioned = 1");
  if (sp.named === "0") where.push("a.mentioned = 0 AND a.error IS NULL");
  const term = (sp.q ?? "").trim().slice(0, 100);
  if (term) {
    where.push("(a.text LIKE ? OR p.text LIKE ? OR a.competitors LIKE ? OR a.citations LIKE ?)");
    const like = `%${term}%`;
    args.push(like, like, like, like);
  }
  const page = Math.max(1, Number(sp.page) || 1);
  const PER = 30;

  const countRows = await all<{ n: number }>(`SELECT COUNT(*) AS n FROM answers a JOIN prompts p ON p.id = a.prompt_id WHERE ${where.join(" AND ")}`, args);
  const total = Number(countRows[0]?.n ?? 0);
  const rows = await all<Row>(
    `SELECT a.*, p.text AS prompt_text, p.lang FROM answers a JOIN prompts p ON p.id = a.prompt_id
     WHERE ${where.join(" AND ")} ORDER BY p.id, a.engine, a.repeat LIMIT ? OFFSET ?`,
    [...args, PER, (page - 1) * PER],
  );

  const q = (patch: Record<string, string | undefined>) => {
    const next = { ...sp, page: undefined, ...patch } as Record<string, string | undefined>;
    const s = Object.entries(next).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
    return s ? `/answers?${s}` : "/answers";
  };
  const chip = (active: boolean) => `rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-navy text-white" : "bg-white text-ink-muted border border-line hover:border-brand hover:text-brand"}`;

  return (
    <>
      <PageHeader title={t.answers.title} lead={t.answers.lead} />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <form action="/answers" className="relative">
          {sp.engine && <input type="hidden" name="engine" value={sp.engine} />}
          {sp.lang && <input type="hidden" name="lang" value={sp.lang} />}
          {sp.named && <input type="hidden" name="named" value={sp.named} />}
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-soft"><Icon name="search" size={18} /></span>
          <input id="answers-search" name="q" defaultValue={term} dir="auto" placeholder={t.searchAnswers} className="w-full rounded-xl border border-line bg-canvas py-2.5 pe-3 ps-10 text-sm outline-none focus:border-brand focus:bg-white" />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs font-medium uppercase tracking-wide text-ink-muted">{t.answers.filterEngine}</span>
          <Link href={q({ engine: undefined })} className={chip(!sp.engine)}>{t.answers.all}</Link>
          {ENGINES.map((e) => (<Link key={e.id} href={q({ engine: e.id })} className={chip(sp.engine === e.id)}>{e.label}</Link>))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs font-medium uppercase tracking-wide text-ink-muted">{t.answers.filterLang}</span>
          <Link href={q({ lang: undefined })} className={chip(!sp.lang)}>{t.answers.all}</Link>
          <Link href={q({ lang: "ar" })} className={chip(sp.lang === "ar")}>{t.langs.ar}</Link>
          <Link href={q({ lang: "en" })} className={chip(sp.lang === "en")}>{t.langs.en}</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs font-medium uppercase tracking-wide text-ink-muted">{t.answers.filterNamed}</span>
          <Link href={q({ named: undefined })} className={chip(!sp.named)}>{t.answers.all}</Link>
          <Link href={q({ named: "1" })} className={chip(sp.named === "1")}>{t.answers.named}</Link>
          <Link href={q({ named: "0" })} className={chip(sp.named === "0")}>{t.answers.notNamed}</Link>
        </div>
      </div>

      <p className="mb-3 text-sm text-ink-muted">
        {t.answers.showing} <span className="num">{rows.length ? (page - 1) * PER + 1 : 0}–{(page - 1) * PER + rows.length}</span> {t.answers.of} <span className="num">{total}</span>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => {
          const comps = parseJSON<string[]>(r.competitors, []);
          const facts = parseJSON<ExtractedFact[]>(r.facts, []);
          const cites = parseJSON<Citation[]>(r.citations, []);
          return (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{engineLabel(r.engine)}</Badge>
                {Number(r.simulated) === 1 && <Badge tone="gold">{t.hybrid.badge}</Badge>}
                {r.error ? <Badge tone="bad">{t.answers.error}</Badge> : Number(r.mentioned) ? <Badge tone={r.rank && Number(r.rank) <= 3 ? "good" : "warn"}>{t.answers.named} · #{r.rank}</Badge> : <Badge>{t.answers.notNamed}</Badge>}
                {!r.error && Number(r.mentioned) === 1 && <Badge tone={r.sentiment === "positive" ? "good" : r.sentiment === "negative" ? "bad" : "muted"}>{t.answers.sentiment[r.sentiment]}</Badge>}
                {r.repeat > 1 && <span className="text-xs text-ink-soft">#{r.repeat}</span>}
              </div>
              <p dir="auto" className={`font-semibold text-navy ${r.lang === "ar" ? "font-arabic" : ""}`}>{r.prompt_text}</p>
              <div dir="auto" className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-canvas p-3 text-[13.5px] leading-relaxed text-ink-muted">
                {r.error ? r.error : r.text}
              </div>
              {(comps.length > 0 || facts.length > 0) && (
                <div className="flex flex-col gap-2 text-sm">
                  {comps.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-ink-muted">{t.answers.competitors}:</span>
                      {comps.map((c) => (<Badge key={c}>{c}</Badge>))}
                    </div>
                  )}
                  {facts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-ink-muted">{t.answers.facts}:</span>
                      {facts.map((f, i) => (<Badge key={i} tone="gold">{f.value}</Badge>))}
                    </div>
                  )}
                </div>
              )}
              {cites.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                  <span className="text-xs text-ink-muted">{t.answers.cited}:</span>
                  {cites.slice(0, 6).map((c) => (
                    <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" dir="ltr" className={`rounded-md px-2 py-0.5 text-xs hover:underline ${domainOf(c.url).endsWith("ahlibank.om") ? "bg-gold-50 font-semibold text-gold-700" : "bg-brand-50 text-brand"}`}>
                      {domainOf(c.url)}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {total > PER && (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && <Link href={`${q({})}${q({}).includes("?") ? "&" : "?"}page=${page - 1}`} className={chip(false)}>{lang === "ar" ? "السابق" : "Previous"}</Link>}
          <span className="num text-sm text-ink-muted">{page} / {Math.ceil(total / PER)}</span>
          {page * PER < total && <Link href={`${q({})}${q({}).includes("?") ? "&" : "?"}page=${page + 1}`} className={chip(false)}>{lang === "ar" ? "التالي" : "Next"}</Link>}
        </div>
      )}
    </>
  );
}
