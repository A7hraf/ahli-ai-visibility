"use client";

import { useMemo, useState } from "react";
import { domainStats, matches, periodRuns, slice, type Dataset, type DomainKind } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { BarList, ClickHint, Delta, Donut, Legend, Panel, TipProvider } from "@/components/viz/core";
import { FilterBar, useFilters } from "@/components/viz/filters";
import Details, { DomainName, domainColor, GOLD, KIND_COLOR, useFmtDate, type Sel } from "@/components/viz/Details";
import TrendLines from "@/components/viz/TrendLines";

export default function Sources(props: { ds: Dataset; ui: UIText; lang: "en" | "ar"; ownPages: { url: string; n: number }[] }) {
  return (
    <TipProvider>
      <Inner {...props} />
    </TipProvider>
  );
}

function Inner({ ds, ui, lang, ownPages }: { ds: Dataset; ui: UIText; lang: "en" | "ar"; ownPages: { url: string; n: number }[] }) {
  const { f, set } = useFilters();
  const [sel, setSel] = useState<Sel | null>(null);
  const [kind, setKind] = useState<DomainKind | null>(null);
  const fmt = useFmtDate(lang);

  const m = useMemo(() => {
    const { base, cur, prev } = slice(ds, f);
    const s = domainStats(ds, cur);
    const p = prev.length ? domainStats(ds, prev) : null;
    const trend = ds.runs.map((run, i) => {
      const d = domainStats(ds, base.filter((x) => x.r === i));
      const share = (k: DomainKind) => d.kinds.find((x) => x.k === k)?.share ?? 0;
      return { date: run.date, own: d.withCites ? d.ownRate : undefined, comparison: d.total ? share("comparison") : undefined, news: d.total ? share("news") : undefined, community: d.total ? share("community") : undefined };
    });
    const { cur: curRuns } = periodRuns(ds, f.pd);
    const byChannel = ds.engines
      .map((e) => {
        const rows = ds.rows.filter((x) => curRuns.has(x.r) && matches(ds, x, { ...f, ch: e.id }));
        const d = domainStats(ds, rows);
        return { key: e.id, label: e.label, color: e.color, v: d.ownRate, n: d.withCites };
      })
      .filter((x) => x.n > 0);
    return { s, p, trend, byChannel };
  }, [ds, f]);

  const list = m.s.domains.filter((d) => !kind || d.k === kind).slice(0, 14);
  const risky = m.s.domains.filter((d) => d.k === "lookalike").reduce((a, d) => a + d.n, 0);

  return (
    <div className="flex flex-col gap-5">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="pattern-star rise relative overflow-hidden rounded-4xl bg-navy p-6 text-white shadow-pop">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <p className="relative text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-400">{ui.sources.owned}</p>
          <p className="relative mt-3 font-display text-[48px] font-bold leading-none">{m.s.ownRate}%</p>
          <p className="relative mt-2 flex items-center gap-2 text-[12px] text-white/65">
            <Delta v={m.p ? m.s.ownRate - m.p.ownRate : null} /> {ui.vsPrev}
          </p>
        </div>
        <div className="flex flex-col rise rounded-4xl bg-white p-6 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-muted">{lang === "ar" ? "إجمالي الاستشهادات" : "Total citations"}</p>
          <p className="mt-2 font-display text-[44px] font-bold leading-none text-ink">{m.s.total}</p>
          <p className="mt-auto pt-2 text-[12.5px] text-ink-muted">
            {m.s.withCites} {ui.answers}
          </p>
        </div>
        <div className="flex flex-col rise rounded-4xl bg-white p-6 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-muted">{lang === "ar" ? "مواقع مختلفة" : "Unique websites"}</p>
          <p className="mt-2 font-display text-[44px] font-bold leading-none text-ink">{m.s.domains.length}</p>
          <p className="mt-auto pt-2 text-[12.5px] text-ink-muted">{lang === "ar" ? "يقرأها الذكاء الاصطناعي" : "read by AI"}</p>
        </div>
        <div className={`flex flex-col rise rounded-4xl border p-6 shadow-card ${risky ? "border-bad/30 bg-bad-soft/50" : "border-line bg-white"}`}>
          <p className="text-[12.5px] font-medium text-ink-muted">{ui.media.lookalike}</p>
          <p className={`mt-2 font-display text-[44px] font-bold leading-none ${risky ? "text-bad" : "text-ink"}`}>{risky}</p>
          <p className="mt-auto pt-2 text-[12.5px] text-ink-muted">{lang === "ar" ? "استشهاد قد يسبب خلطاً بالعلامة" : "citations that risk brand confusion"}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-5" title={ui.sources.mix} sub={ui.sources.mixSub} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <Donut
            size={190}
            thickness={24}
            onSelect={(k) => setKind(kind === k ? null : (k as DomainKind))}
            data={m.s.kinds.map((k) => ({ key: k.k, label: ui.media[k.k], value: k.n, color: KIND_COLOR[k.k] }))}
            center={
              <>
                <span className="text-[26px] font-semibold leading-none text-ink">{m.s.kinds.length}</span>
                <span className="mt-1 text-[11px] text-ink-muted">{lang === "ar" ? "أنواع مصادر" : "source types"}</span>
              </>
            }
          />
          <ul className="mt-5 grid grid-cols-2 gap-1.5">
            {m.s.kinds.map((k) => (
              <li key={k.k}>
                <button onClick={() => setKind(kind === k.k ? null : k.k)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[12.5px] transition ${kind === k.k ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-canvas"}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: KIND_COLOR[k.k] }} />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{ui.media[k.k]}</span>
                  <b className="num text-ink">{k.share}%</b>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          className="lg:col-span-7"
          title={ui.sources.top}
          sub={kind ? ui.media[kind] : ui.sources.topSub}
          action={
            kind ? (
              <button onClick={() => setKind(null)} className="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-brand hover:bg-brand-50">
                {ui.f.clear}
              </button>
            ) : (
              <ClickHint>{ui.clickHint}</ClickHint>
            )
          }
        >
          <BarList
            labelWidth="w-48"
            onSelect={(k) => setSel({ kind: "domain", i: Number(k) })}
            items={list.map((d) => ({ key: String(d.i), label: <DomainName ds={ds} d={d} />, sub: ui.media[d.k], value: d.share, color: domainColor(ds, d), strong: d.k === "own" }))}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title={lang === "ar" ? "المصادر عبر الوقت" : "Source influence over time"}
          sub={lang === "ar" ? "نسبة الإجابات التي تستشهد بالموقع، وحصة أهم أنواع المصادر" : "Owned-media citation rate and share of the main source types, week by week"}
          action={
            <Legend
              items={[
                { label: ui.media.own, color: GOLD, line: true },
                { label: ui.media.comparison, color: KIND_COLOR.comparison, line: true },
                { label: ui.media.news, color: KIND_COLOR.news, line: true },
                { label: ui.media.community, color: KIND_COLOR.community, line: true },
              ]}
            />
          }
        >
          <TrendLines
            data={m.trend}
            fmtDate={fmt}
            height={260}
            series={[
              { key: "community", label: ui.media.community, color: KIND_COLOR.community, width: 1.8 },
              { key: "news", label: ui.media.news, color: KIND_COLOR.news, width: 1.8 },
              { key: "comparison", label: ui.media.comparison, color: KIND_COLOR.comparison, width: 1.8 },
              { key: "own", label: ui.media.own, color: GOLD, width: 3, area: true },
            ]}
          />
        </Panel>
        <Panel className="lg:col-span-5" title={ui.sources.byChannel} sub={ui.sources.ownedSub}>
          <BarList items={m.byChannel.map((c) => ({ key: c.key, label: c.label, value: c.v, color: c.color }))} />
          <h3 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted">{ui.sources.pages}</h3>
          {ownPages.length ? (
            <ul className="flex flex-col gap-1.5">
              {ownPages.slice(0, 5).map((p) => (
                <li key={p.url} className="flex items-center gap-2 text-[12.5px]">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="min-w-0 flex-1 truncate text-brand hover:underline">
                    {p.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                  {p.url.endsWith(".pdf") && <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-bold text-warn">PDF</span>}
                  <span className="num text-ink-muted">×{p.n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-muted">{ui.sources.noPages}</p>
          )}
        </Panel>
      </div>

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} />
    </div>
  );
}
