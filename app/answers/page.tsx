import Link from "next/link";
import { getT } from "@/lib/i18n";
import { all, parseJSON } from "@/lib/db";
import { getRuns, domainOf } from "@/lib/metrics";
import { BRAND, COMPETITORS, ENGINES, engineLabel } from "@/lib/config";
import { UI } from "@/lib/ui-text";
import { Badge, Empty, PageHeader } from "@/components/ui";
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

// every bank alias -> its colour tag, longest first so "Sohar Islamic" wins over "Sohar"
const BANKS = [{ name: BRAND.name, short: BRAND.short, color: BRAND.color, aliases: [BRAND.name, BRAND.nameAr, ...BRAND.aliases], brand: true }, ...COMPETITORS.map((c) => ({ name: c.name, short: c.short, color: c.color, aliases: [c.name, ...c.aliases], brand: false }))];
const ALIASES = BANKS.flatMap((b) => b.aliases.filter((a) => a.length > 2).map((a) => ({ a, b }))).sort((x, y) => y.a.length - x.a.length);
const ALIAS_RE = new RegExp(`(${ALIASES.map((x) => x.a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");

function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(ALIAS_RE).map((part, i) => {
        const hit = ALIASES.find((x) => x.a.toLowerCase() === part.toLowerCase());
        if (!hit) return <span key={i}>{part}</span>;
        return (
          <mark key={i} className="mx-0.5 whitespace-nowrap rounded-[3px] px-1 py-px font-bold" style={{ background: hit.b.color, color: hit.b.brand ? "#1a1608" : "#fff" }}>
            {part}
          </mark>
        );
      })}
    </>
  );
}

type SP = Promise<{ engine?: string; lang?: string; named?: string; page?: string; q?: string; product?: string; persona?: string; run?: string; prompt?: string }>;

export default async function AnswersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const runs = await getRuns();
  const last = runs[runs.length - 1];
  const ui = UI[lang];
  if (!last) return (<><PageHeader kicker={ui.kick.answers} title={t.answers.title} lead={t.answers.lead} /><Empty>{t.noData}</Empty></>);

  const runId = runs.some((r) => Number(r.id) === Number(sp.run)) ? Number(sp.run) : Number(last.id);
  const where = ["a.run_id = ?"];
  const args: (string | number)[] = [runId];
  if (sp.product) { where.push("p.product = ?"); args.push(sp.product); }
  if (sp.persona) { where.push("p.persona = ?"); args.push(sp.persona); }
  if (sp.prompt) { where.push("p.id = ?"); args.push(Number(sp.prompt)); }
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
  const chip = (active: boolean) => `whitespace-nowrap border-e border-line px-3 py-1.5 text-[13px] font-medium transition last:border-e-0 ${active ? "bg-navy font-bold text-white" : "bg-white text-ink-2 hover:bg-slate-100"}`;
  const seg = "inline-flex overflow-hidden rounded-[4px] border border-line-2";
  const fmtDate = (d: string) => new Date(d.slice(0, 10) + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-OM" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const runDate = runs.find((r) => Number(r.id) === runId)?.started_at ?? last.started_at;

  return (
    <>
      <PageHeader kicker={ui.kick.answers} title={t.answers.title} lead={`${total} · ${t.answers.lead}`} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[4px] border border-line bg-white p-3">
        <form action="/answers" className="relative min-w-[220px] flex-1">
          {sp.engine && <input type="hidden" name="engine" value={sp.engine} />}
          {sp.lang && <input type="hidden" name="lang" value={sp.lang} />}
          {sp.named && <input type="hidden" name="named" value={sp.named} />}
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-soft"><Icon name="search" size={17} /></span>
          <input id="answers-search" name="q" defaultValue={term} dir="auto" placeholder={t.searchAnswers} className="field !h-10 ps-10" />
        </form>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-muted">{t.answers.filterLang}</span>
          <div className={seg}>
            <Link href={q({ lang: undefined })} className={chip(!sp.lang)}>{t.answers.all}</Link>
            <Link href={q({ lang: "ar" })} className={chip(sp.lang === "ar")}>AR</Link>
            <Link href={q({ lang: "en" })} className={chip(sp.lang === "en")}>EN</Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-muted">{t.answers.filterNamed}</span>
          <div className={seg}>
            <Link href={q({ named: undefined })} className={chip(!sp.named)}>{t.answers.all}</Link>
            <Link href={q({ named: "1" })} className={chip(sp.named === "1")}>{lang === "ar" ? "نعم" : "Yes"}</Link>
            <Link href={q({ named: "0" })} className={chip(sp.named === "0")}>{lang === "ar" ? "لا" : "No"}</Link>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-1.5">
          <span className="me-1 text-[12.5px] text-ink-muted">{t.answers.filterEngine}</span>
          <Link href={q({ engine: undefined })} className={`rounded-[4px] border px-3 py-1.5 text-[13px] font-medium transition ${!sp.engine ? "border-navy bg-navy text-white" : "border-line text-ink-2 hover:bg-slate-100"}`}>{t.answers.all}</Link>
          {ENGINES.map((e) => (
            <Link key={e.id} href={q({ engine: e.id })} className={`flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[13px] font-medium transition ${sp.engine === e.id ? "border-navy bg-navy text-white" : "border-line text-ink-2 hover:bg-slate-100"}`}>
              {e.label}
              <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
            </Link>
          ))}
        </div>
      </div>

      {(sp.product || sp.persona || sp.run || sp.prompt) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          {sp.product && <Badge tone="brand">{t.products[sp.product as keyof typeof t.products] ?? sp.product}</Badge>}
          {sp.persona && <Badge tone="brand">{t.personas[sp.persona as keyof typeof t.personas] ?? sp.persona}</Badge>}
          {sp.run && <Badge tone="brand">{runs.find((r) => Number(r.id) === runId)?.started_at.slice(0, 10)}</Badge>}
          <Link href={q({ product: undefined, persona: undefined, run: undefined, prompt: undefined })} className="font-bold text-bad hover:underline">
            {lang === "ar" ? "إزالة" : "Clear"}
          </Link>
        </div>
      )}

      <p className="mb-3 text-sm text-ink-muted">
        {t.answers.showing} <span className="num">{rows.length ? (page - 1) * PER + 1 : 0}–{(page - 1) * PER + rows.length}</span> {t.answers.of} <span className="num">{total}</span>
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const comps = parseJSON<string[]>(r.competitors, []);
          const facts = parseJSON<ExtractedFact[]>(r.facts, []);
          const cites = parseJSON<Citation[]>(r.citations, []);
          const eng = ENGINES.find((e) => e.id === r.engine);
          const tags = [...(Number(r.mentioned) ? [BANKS[0]] : []), ...comps.map((c) => BANKS.find((b) => b.name === c)).filter((b): b is (typeof BANKS)[number] => !!b)];
          return (
            <article key={r.id} className="rise lift flex min-w-0 flex-col gap-3 rounded-[4px] border border-line bg-white p-5">
              <header className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: eng?.color }} />
                  <b className="text-[13px] text-ink">{engineLabel(r.engine)}</b>
                  <span className="rounded-[3px] bg-slate-200 px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">{r.lang.toUpperCase()}</span>
                  {Number(r.simulated) === 1 && <Badge tone="gold">{t.hybrid.badge}</Badge>}
                </span>
                <span className="text-ink-soft">{fmtDate(runDate)}{r.repeat > 1 ? ` · #${r.repeat}` : ""}</span>
              </header>
              <p dir="auto" className="text-[15px] font-bold leading-snug text-ink">{r.prompt_text}</p>
              <div dir="auto" className="max-h-44 overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-[1.9] text-ink-2">
                {r.error ? <span className="text-bad">{r.error}</span> : <Marked text={r.text} />}
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="flex flex-wrap items-center gap-1.5">
                  {r.error ? <Badge tone="bad">{t.answers.error}</Badge> : Number(r.mentioned) ? <Badge tone="gold">#{r.rank}</Badge> : <Badge>{t.answers.notNamed}</Badge>}
                  {!r.error && Number(r.mentioned) === 1 && <Badge tone={r.sentiment === "positive" ? "good" : r.sentiment === "negative" ? "bad" : "muted"}>{t.answers.sentiment[r.sentiment]}</Badge>}
                  {facts.slice(0, 2).map((f, i) => (<Badge key={i} tone="brand">{f.value}</Badge>))}
                </span>
                <span className="flex flex-wrap gap-1" dir="ltr">
                  {tags.slice(0, 5).map((b) => (
                    <span key={b.short} title={b.name} className="rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: b.color, color: b.brand ? "#1a1608" : "#fff" }}>
                      {b.short}
                    </span>
                  ))}
                </span>
              </div>
              {cites.length > 0 && (
                <p className="flex items-center gap-1.5 truncate text-[12px] text-ink-muted" dir="ltr">
                  <Icon name="link" size={12} />
                  {cites.slice(0, 3).map((c, i) => (
                    <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className={`hover:underline ${domainOf(c.url).endsWith("ahlibank.om") ? "font-bold text-gold-700" : ""}`}>
                      {i > 0 ? " · " : ""}
                      {domainOf(c.url)}
                    </a>
                  ))}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {total > PER && (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && <Link href={`${q({})}${q({}).includes("?") ? "&" : "?"}page=${page - 1}`} className="rounded-[4px] border border-line bg-white px-4 py-2 text-[13px] font-bold text-ink transition hover:bg-slate-100">{lang === "ar" ? "السابق" : "Previous"}</Link>}
          <span className="num text-sm text-ink-muted">{page} / {Math.ceil(total / PER)}</span>
          {page * PER < total && <Link href={`${q({})}${q({}).includes("?") ? "&" : "?"}page=${page + 1}`} className="rounded-[4px] border border-line bg-white px-4 py-2 text-[13px] font-bold text-ink transition hover:bg-slate-100">{lang === "ar" ? "التالي" : "Next"}</Link>}
        </div>
      )}
    </>
  );
}
