"use client";

import { useState } from "react";
import { Icon } from "./Icon";

type Result = {
  engine: string;
  ok: boolean;
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
          <mark key={i} className={`rounded px-0.5 ${hit.k === "brand" ? "bg-gold-100 font-semibold text-gold-700" : "bg-brand-50 text-brand"}`}>
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
}: {
  t: T;
  lang: string;
  demo: boolean;
  engines: { id: string; label: string; color: string }[];
  examples: string[];
  brandAliases: string[];
  competitorAliases: string[];
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
    let token = "";
    try {
      token = window.localStorage.getItem("adminToken") ?? "";
    } catch {}
    const lang2 = /[؀-ۿ]/.test(asked) ? "ar" : "en";
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ text: asked, lang: lang2, product: guessProduct(asked), persona: "general" }),
    });
    if (res.ok) setSaved(true);
  }

  const ok = results?.filter((r) => r.ok) ?? [];
  const namedCount = ok.filter((r) => r.mentioned).length;

  return (
    <div className="flex flex-col gap-6">
      {/* search box */}
      <div className="hero-pattern rounded-2xl bg-navy p-5 shadow-card sm:p-7">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-brand-300">
              <Icon name="search" size={20} />
            </span>
            <input
              id="ask-question"
              dir="auto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.placeholder}
              className="w-full rounded-xl border-0 bg-white py-4 pe-4 ps-12 text-[16px] text-navy shadow-card outline-none ring-gold focus:ring-2"
            />
          </div>
          <button disabled={busy || q.trim().length < 5} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-7 py-4 text-[16px] font-semibold text-navy transition hover:bg-gold-400 disabled:opacity-60">
            <Icon name="sparkle" size={18} />
            {busy ? t.asking : t.ask}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-brand-100/80">{t.examples}:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQ(ex);
                ask(ex);
              }}
              dir="auto"
              className="rounded-full border border-white/20 px-3 py-1.5 text-start text-sm text-white hover:bg-white/10"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="text-sm text-brand-100/80">{t.engines}:</span>
          {engines.map((e) => {
            const on = selected.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => setSelected(on ? selected.filter((x) => x !== e.id) : [...selected, e.id])}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-white text-navy" : "border border-white/20 text-brand-100/70"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                {e.label}
              </button>
            );
          })}
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-brand-100/70">
          <Icon name="shield" size={14} className="mt-0.5 shrink-0" />
          {t.privacy}
        </p>
      </div>

      {demo && <p className="rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-700">{t.demoNote}</p>}
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
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
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
            <button onClick={save} disabled={saved} className="inline-flex items-center gap-2 self-start rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50 disabled:border-good disabled:text-good sm:self-auto">
              <Icon name={saved ? "check" : "plus"} size={15} />
              {saved ? t.saved : t.save}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => {
              const eng = engines.find((e) => e.id === r.engine);
              return (
                <article key={r.engine} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card">
                  <header className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-display font-semibold text-navy">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: eng?.color }} />
                      {eng?.label}
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
