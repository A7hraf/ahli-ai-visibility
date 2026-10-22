"use client";

import { useState } from "react";
import { Icon } from "./Icon";

type Result = {
  engine: string;
  ok: boolean;
  simulated?: boolean;
  text?: string;
  error?: string;
  citations?: { url: string; title?: string }[];
  mentioned?: boolean;
  rank?: number | null;
  competitors?: string[];
};

type T = Record<string, string>;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap bank names in coloured marks: Ahli Bank in gold, competitors in blue. */
function Highlight({ text, brand, comps }: { text: string; brand: string[]; comps: string[] }) {
  const terms = [...brand.map((b) => ({ b, k: "brand" })), ...comps.map((b) => ({ b, k: "comp" }))].sort((a, b) => b.b.length - a.b.length);
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((x) => escapeRe(x.b)).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => {
        const hit = terms.find((x) => x.b.toLowerCase() === p.toLowerCase());
        if (!hit) return <span key={i}>{p}</span>;
        return (
          <mark key={i} className={`rounded-[3px] px-1 font-bold ${hit.k === "brand" ? "bg-gold text-navy" : "bg-navy-50 text-navy"}`}>
            {p}
          </mark>
        );
      })}
    </>
  );
}

function domain(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

function guessProduct(q: string) {
  if (/home|mortgage|سكني|منزل|بيت/i.test(q)) return "home_finance";
  if (/loan|financ|قرض|تمويل/i.test(q)) return "personal_finance";
  if (/card|بطاقة/i.test(q)) return "cards";
  if (/islamic|إسلامي|اسلامي/i.test(q)) return "islamic";
  if (/account|حساب/i.test(q)) return "accounts";
  return "brand";
}

export default function AskClient({
  t,
  lang,
  demo,
  engines,
  examples,
  brandAliases,
  competitorAliases,
  head,
  canSave = true,
}: {
  t: T;
  lang: string;
  demo: boolean;
  engines: { id: string; label: string; color: string; simulated: boolean }[];
  examples: string[];
  brandAliases: string[];
  competitorAliases: string[];
  head: { kicker: string; title: string; lead: string; empty: string };
  canSave?: boolean;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>(engines.map((e) => e.id));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [asked, setAsked] = useState("");
  const [saved, setSaved] = useState(false);

  async function ask(question = q) {
    if (question.trim().length < 5) return;
    setBusy(true);
    setErr("");
    setResults(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, engines: selected }) });
      const j = await res.json();
      if (res.status === 429) throw new Error(t.limit);
      if (!res.ok) throw new Error(j.error);
      setResults(j.results);
      setAsked(question);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const lang2 = /[؀-ۿ]/.test(asked) ? "ar" : "en";
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: asked, lang: lang2, product: guessProduct(asked), persona: "general" }),
    });
    if (res.ok) setSaved(true);
  }

  const okAll = results?.filter((r) => r.ok) ?? [];
  const okReal = okAll.filter((r) => !r.simulated);
  const ok = okReal.length ? okReal : okAll;
  const namedCount = ok.filter((r) => r.mentioned).length;

  return (
    <div className="flex flex-col gap-6">
      {/* search box */}
      <div className="rise mt-3 rounded-[4px] bg-navy px-5 py-8 text-white sm:px-10">
        <div className="mx-auto mb-6 flex max-w-2xl flex-col items-center gap-2 text-center">
          <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-gold-400">
            <Icon name="sparkle" size={14} />
            {head.kicker}
          </p>
          <h1 className="font-display text-[32px] leading-tight sm:text-[40px]">{head.title}</h1>
          <p className="text-[14.5px] text-white/75">{head.lead}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="mx-auto flex max-w-3xl flex-col gap-2 rounded-[4px] bg-white p-1.5 sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-ink-soft">
              <Icon name="search" size={20} />
            </span>
            <input
              id="ask-question"
              dir="auto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.placeholder}
              className="w-full rounded-[3px] border-0 bg-white py-3.5 pe-4 ps-12 text-[16px] text-ink outline-none"
            />
          </div>
          <button disabled={busy || q.trim().length < 5} className="inline-flex items-center justify-center gap-2 rounded-[3px] bg-navy px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-navy-700 active:scale-[0.98] disabled:opacity-60">
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="sparkle" size={17} />}
            {busy ? t.asking : t.ask}
          </button>
        </form>
        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          <span className="text-[12.5px] text-white/60">{t.examples}</span>
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQ(ex);
                ask(ex);
              }}
              dir="auto"
              className="rounded-[4px] border border-white/25 px-3 py-1.5 text-start text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-4">
          <span className="text-[12.5px] text-white/60">{t.engines}</span>
          {engines.map((e) => {
            const on = selected.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => setSelected(on ? selected.filter((x) => x !== e.id) : [...selected, e.id])}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition ${on ? "bg-white text-ink" : "border border-white/20 text-white/60 hover:text-white"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                {e.label}
                {e.simulated && <span className="text-[10px] opacity-70">({t.simShort})</span>}
              </button>
            );
          })}
        </div>
        <p className="mx-auto mt-4 flex max-w-3xl items-start justify-center gap-2 text-xs text-white/55">
          <Icon name="shield" size={14} className="mt-0.5 shrink-0" />
          {t.privacy}
        </p>
      </div>

      {demo && <p className="rounded-[4px] bg-gold-50 px-4 py-3 text-sm text-gold-700">{t.demoNote}</p>}
      {!busy && !results && !err && (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-ink-muted">
          <span className="text-ink-soft">
            <Icon name="chat" size={34} />
          </span>
          <p className="text-[14px]">{head.empty}</p>
        </div>
      )}
      {err && <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{err}</p>}

      {busy && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selected.map((id) => (
            <div key={id} className="h-64 animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
      )}

      {results && (
        <>
          <div className="rise flex flex-col gap-4 rounded-[4px] border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${namedCount ? "bg-gold-50 text-gold-700" : "bg-bad-soft text-bad"}`}>
                <span className="num font-display text-2xl font-bold">{namedCount}/{ok.length}</span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t.summary}</p>
                <p className="font-display text-lg font-semibold text-navy">
                  {t.namedIn} {namedCount} {lang === "ar" ? "من" : "of"} {ok.length} {t.enginesWord}
                </p>
                <p dir="auto" className="text-sm text-ink-muted">“{asked}”</p>
              </div>
            </div>
            {canSave && (
              <button onClick={save} disabled={saved} className="inline-flex items-center gap-2 self-start rounded-[4px] border border-navy px-4 py-2.5 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:border-good disabled:text-good sm:self-auto">
                <Icon name={saved ? "check" : "plus"} size={15} />
                {saved ? t.saved : t.save}
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => {
              const eng = engines.find((e) => e.id === r.engine);
              return (
                <article key={r.engine} className="rise lift flex min-w-0 flex-col gap-3 rounded-[4px] border border-line bg-white p-5">
                  <header className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-display font-semibold text-navy">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: eng?.color }} />
                      {eng?.label}
                      {r.simulated ? (
                        <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-medium text-gold-700">{t.simShort}</span>
                      ) : (
                        <span className="rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-medium text-good">{t.realShort}</span>
                      )}
                    </span>
                    {r.ok &&
                      (r.mentioned ? (
                        <span className="rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                          {t.named} · {t.position} {r.rank}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-ink-muted">{t.notNamed}</span>
                      ))}
                  </header>
                  {r.ok ? (
                    <div dir="auto" className="max-h-80 overflow-y-auto whitespace-pre-wrap text-[14px] leading-relaxed text-ink-muted">
                      <Highlight text={r.text ?? ""} brand={brandAliases} comps={competitorAliases} />
                    </div>
                  ) : (
                    <p className="text-sm text-bad">{r.error}</p>
                  )}
                  {r.citations && r.citations.length > 0 && (
                    <footer className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                      <span className="text-xs text-ink-muted">{t.sources}:</span>
                      {r.citations.slice(0, 6).map((c) => (
                        <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" dir="ltr" className={`rounded-md px-2 py-0.5 text-xs hover:underline ${domain(c.url).endsWith("ahlibank.om") ? "bg-gold-50 font-semibold text-gold-700" : "bg-brand-50 text-brand"}`}>
                          {domain(c.url)}
                        </a>
                      ))}
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
