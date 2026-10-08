"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bankSummary, breakdown, slice, type Dataset } from "@/lib/analytics";
import type { UIText } from "@/lib/ui-text";
import { BarList, ClickHint, Donut, Heatmap, Insight, Panel, RampLegend, TipProvider } from "@/components/viz/core";
import { FilterBar, useFilters } from "@/components/viz/filters";
import Details, { GOLD, type Sel } from "@/components/viz/Details";

export default function Queries(props: { ds: Dataset; ui: UIText; lang: "en" | "ar" }) {
  return (
    <TipProvider>
      <Inner {...props} />
    </TipProvider>
  );
}

function Inner({ ds, ui, lang }: { ds: Dataset; ui: UIText; lang: "en" | "ar" }) {
  const { f, set } = useFilters();
  const [sel, setSel] = useState<Sel | null>(null);
  const [sort, setSort] = useState<"weak" | "strong">("weak");

  const m = useMemo(() => {
    const { cur } = slice(ds, f);
    const qs = ds.prompts
      .map((p, i) => {
        const rows = cur.filter((x) => x.p === i);
        const s = bankSummary(rows);
        const cells = ds.engines.map((e) => {
          const rr = rows.filter((x) => ds.engines[x.e].id === e.id);
          return rr.length ? bankSummary(rr).reach : null;
        });
        return { i, p, n: rows.length, reach: s.reach, top3: s.top3, cells };
      })
      .filter((q) => q.n > 0);
    const won = qs.filter((q) => q.reach > 0).length;
    const blind = qs.filter((q) => q.reach === 0);
    const personas = [...new Set(ds.prompts.map((p) => p.persona))];
    const seg = breakdown(ds, cur, "persona", personas).sort((a, b) => b.reach - a.reach);
    return { qs, won, blind, seg, avg: bankSummary(cur).reach };
  }, [ds, f]);

  const sorted = [...m.qs].sort((a, b) => (sort === "weak" ? a.reach - b.reach : b.reach - a.reach));
  const qLabel = (q: (typeof m.qs)[number]) => (
    <span className="flex min-w-0 items-center gap-2">
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${q.p.lang === "ar" ? "bg-brand-50 text-brand" : "bg-slate-100 text-ink-muted"}`}>{q.p.lang.toUpperCase()}</span>
      <span dir="auto" className="truncate" title={q.p.text}>
        {q.p.text}
      </span>
    </span>
  );
  const openQuery = (i: number, ch?: string) => {
    const p = ds.prompts[i];
    setSel({ kind: "seg", kicker: `${ui.drawer.query}${ch ? ` · ${ds.engines.find((e) => e.id === ch)?.label}` : ""}`, title: <span dir="auto">{p.text}</span>, prompt: i, f: ch ? { ch } : undefined });
  };

  return (
    <div className="flex flex-col gap-5">
      <FilterBar ds={ds} ui={ui} f={f} set={set} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-4" title={ui.queries.winRate}>
          <Donut
            data={[
              { key: "won", label: ui.queries.winRate, value: m.won, color: GOLD },
              { key: "blind", label: ui.queries.blind, value: m.qs.length - m.won, color: "#E2E8F0" },
            ]}
            center={
              <>
                <span className="font-display text-[36px] font-bold leading-none text-ink">
                  {m.won}
                  <span className="text-[16px] font-normal text-ink-muted">/{m.qs.length}</span>
                </span>
                <span className="mt-1 text-[11.5px] text-ink-muted">{lang === "ar" ? "استفسار" : "queries"}</span>
              </>
            }
          />
          <p className="mt-4 text-center text-[12.5px] text-ink-muted">
            {ui.kpi.reach}: <b className="text-ink">{m.avg}%</b>
          </p>
        </Panel>
        <Panel className="lg:col-span-4" title={`${ui.queries.blind} (${m.blind.length})`} sub={ui.queries.blindSub}>
          {m.blind.length ? (
            <ul className="flex max-h-[230px] flex-col gap-1 overflow-y-auto">
              {m.blind.map((q) => (
                <li key={q.i}>
                  <button onClick={() => openQuery(q.i)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-[13px] text-ink-2 hover:bg-bad-soft/60">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-bad" />
                    <span className="min-w-0 flex-1">{qLabel(q)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-good-soft p-4 text-[13px] text-good">✓</p>
          )}
        </Panel>
        <Panel className="lg:col-span-4" title={ui.f.segment} sub={ui.kpi.reach} action={<ClickHint>{ui.clickHint}</ClickHint>}>
          <BarList
            dense
            labelWidth="w-40"
            onSelect={(k) => setSel({ kind: "seg", kicker: ui.drawer.segment, title: ui.personas[k as keyof UIText["personas"]], f: { seg: k } })}
            items={m.seg.map((s) => ({ key: s.key, label: ui.personas[s.key as keyof UIText["personas"]] ?? s.key, value: s.reach, color: "#0B6298" }))}
          />
        </Panel>
      </div>

      <Panel
        title={ui.queries.grid}
        sub={ui.queries.gridSub}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <RampLegend low="0%" high="100%" />
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[12px]">
              {(["weak", "strong"] as const).map((k) => (
                <button key={k} onClick={() => setSort(k)} className={`rounded-md px-2.5 py-1 font-medium ${sort === k ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}>
                  {k === "weak" ? (lang === "ar" ? "الأضعف أولاً" : "Weakest first") : lang === "ar" ? "الأقوى أولاً" : "Strongest first"}
                </button>
              ))}
            </div>
            <Link href="/prompts" className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-brand hover:text-brand">
              {ui.queries.manage}
            </Link>
          </div>
        }
      >
        <Insight tone={m.blind.length ? "bad" : "good"}>
          {lang === "ar"
            ? m.blind.length
              ? `في ${m.blind.length} ${m.blind.length === 1 ? "سؤال" : "أسئلة"} ما يذكرنا ولا مساعد. ابدأ منها: هي أسرع فرصة.`
              : "نظهر في كل الأسئلة مع مساعد واحد على الأقل. ممتاز!"
            : m.blind.length
              ? `For ${m.blind.length} question${m.blind.length === 1 ? "" : "s"}, no assistant mentions us. Start there: it's the quickest win.`
              : "We show up for every question on at least one assistant. Great!"}
        </Insight>
        <Heatmap
          rowWidth="minmax(220px, 2.6fr)"
          max={100}
          format={(v) => `${Math.round(v)}%`}
          cols={ds.engines.map((e) => ({ key: e.id, label: e.label }))}
          rows={sorted.map((q) => ({ key: String(q.i), label: qLabel(q), cells: q.cells }))}
          tipText={(r, c, v) => (
            <span>
              {ds.engines.find((e) => e.id === c)?.label}: <b>{v}%</b>
              <br />
              <span className="text-white/70">{ui.products[ds.prompts[Number(r)].product as keyof UIText["products"]]}</span>
            </span>
          )}
          onSelect={(r, c) => openQuery(Number(r), c)}
        />
      </Panel>

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} onFocus={(nf) => { set(nf); setSel(null); }} />
    </div>
  );
}
