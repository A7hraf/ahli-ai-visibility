"use client";

import { useMemo, useState } from "react";
import { domainStats, lostTo, matches, periodRuns, slice, type Dataset, type DomainKind } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { BankBadge, BarList, ClickHint, Delta, Insight, Legend, Panel, TipProvider, TipRow, useTip } from "@/components/viz/core";
import { PageHeader } from "@/components/ui";
import { useFilters } from "@/components/viz/filters";
import Details, { DomainName, bankColor, bankLabel, domainColor, GOLD, KIND_COLOR, useFmtDate, type Sel } from "@/components/viz/Details";
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
    return { s, p, trend, byChannel, lost: lostTo(ds, cur) };
  }, [ds, f]);

  const list = m.s.domains.filter((d) => !kind || d.k === kind).slice(0, 14);
  const risky = m.s.domains.filter((d) => d.k === "lookalike").reduce((a, d) => a + d.n, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker={ui.kick.sources}
        title={ui.sources.title}
        lead={m.s.kinds[0] ? fill(ui.leads.sources, { kind: ui.media[m.s.kinds[0].k], share: m.s.kinds[0].share, own: m.s.kinds.find((k) => k.k === "own")?.share ?? 0 }) : ui.sources.sub}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ui.sources.owned}</p>
          <p className="font-display text-[36px] leading-none text-gold-700">{m.s.ownRate}%</p>
          <p className="flex items-center gap-2 text-[12px] text-ink-muted">
            <Delta v={m.p ? m.s.ownRate - m.p.ownRate : null} /> Owned-media citation rate
          </p>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{lang === "ar" ? "إجمالي الروابط" : "Total citations"}</p>
          <p className="num font-display text-[36px] leading-none text-navy">{m.s.total.toLocaleString("en")}</p>
          <p className="text-[12px] text-ink-muted">
            {m.s.withCites} {ui.answers}
          </p>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{lang === "ar" ? "مواقع مختلفة" : "Unique websites"}</p>
          <p className="num font-display text-[36px] leading-none text-navy">{m.s.domains.length}</p>
          <p className="text-[12px] text-ink-muted">{lang === "ar" ? "يقرأها الذكاء الاصطناعي" : "read by AI"}</p>
        </div>
        <button onClick={() => setKind(kind === "lookalike" ? null : "lookalike")} className={`rise lift flex flex-col gap-2 rounded-[4px] border p-5 text-start ${risky ? "border-[#FBD3E0] bg-bad-soft" : "border-line bg-white"}`}>
          <p className={`text-[14px] font-bold ${risky ? "text-bad" : "text-ink"}`}>{lang === "ar" ? "خطر الأسماء المشابهة" : "Look-alike risk"}</p>
          <p className={`font-display text-[36px] leading-none ${risky ? "text-bad" : "text-navy"}`}>{risky}</p>
          <p className="text-[12px] text-ink-muted">{lang === "ar" ? "استشهاد قد يسبب خلطاً بالعلامة" : "citations that risk brand confusion"}</p>
        </button>
      </div>

      <Panel title={ui.sources.mix} term="Media mix" action={<ClickHint>{ui.clickHint}</ClickHint>}>
        <MediaMix kinds={m.s.kinds} ui={ui} active={kind} onPick={(k) => setKind(kind === k ? null : k)} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title={ui.sources.top}
          term={kind ? ui.media[kind] : "Top domains"}
          action={
            kind ? (
              <button onClick={() => setKind(null)} className="rounded-[4px] px-2.5 py-1 text-[12.5px] font-bold text-bad hover:bg-bad-soft">
                {ui.f.clear}
              </button>
            ) : (
              <ClickHint>{ui.clickHint}</ClickHint>
            )
          }
        >
          {list[0] && <Insight>{fill(ui.ins.sources, { site: list[0].d })}</Insight>}
          <BarList
            labelWidth="w-48"
            unit=""
            onSelect={(k) => setSel({ kind: "domain", i: Number(k) })}
            items={list.map((d) => ({ key: String(d.i), label: <DomainName ds={ds} d={d} />, sub: ui.media[d.k], value: d.n, color: domainColor(ds, d), strong: d.k === "own" }))}
          />
        </Panel>
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Panel title={ui.overview.lost} term="Substitution rate">
            {m.lost.banks[0] && <Insight>{fill(ui.ins.lost, { bank: bankLabel(ds, ui, m.lost.banks[0].b) })}</Insight>}
            <BarList
              labelWidth="w-14"
              onSelect={(k) => setSel({ kind: "bank", b: Number(k) })}
              items={m.lost.banks.slice(0, 5).map((b) => ({ key: String(b.b), label: <BankBadge color={bankColor(ds, b.b)} short={ds.bankShort[b.b]} size={24} />, tip: bankLabel(ds, ui, b.b), value: b.share, color: bankColor(ds, b.b) }))}
            />
          </Panel>
          <Panel title={ui.sources.pages} term="Owned citations">
            {ownPages.length ? (
              <ul className="flex flex-col gap-3">
                {ownPages.slice(0, 6).map((p) => (
                  <li key={p.url} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2 text-[12.5px]">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="min-w-0 flex-1 truncate font-medium text-ink hover:text-navy hover:underline">
                        {p.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                      {p.url.toLowerCase().endsWith(".pdf") && <span className="rounded-[3px] bg-bad-soft px-1.5 py-0.5 text-[10.5px] font-bold text-bad">PDF</span>}
                      <span className="num font-bold text-ink">{p.n}</span>
                    </span>
                    <span className="h-1.5 rounded-[2px] bg-slate-200">
                      <span className="block h-full rounded-[2px] bg-gold" style={{ width: `${(p.n / Math.max(...ownPages.map((x) => x.n))) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-ink-muted">{ui.sources.noPages}</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
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
        <Panel className="lg:col-span-5" title={ui.sources.byChannel} term={ui.sources.ownedSub}>
          <BarList items={m.byChannel.map((c) => ({ key: c.key, label: c.label, value: c.v, color: c.color }))} />
        </Panel>
      </div>

      <Details ds={ds} ui={ui} lang={lang} base={f} sel={sel} onClose={() => setSel(null)} onFocus={(nf) => { set(nf); setSel(null); }} />
    </div>
  );
}

/** One stacked bar: the share of each kind of website behind the answers. Click a part to filter the list. */
function MediaMix({ kinds, ui, active, onPick }: { kinds: { k: DomainKind; n: number; share: number }[]; ui: UIText; active: DomainKind | null; onPick: (k: DomainKind) => void }) {
  const tip = useTip();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-12 gap-[2px] overflow-hidden rounded-[3px]">
        {kinds.map((k) => {
          const dark = ["comparison", "news", "lookalike"].includes(k.k);
          return (
            <button
              key={k.k}
              onClick={() => onPick(k.k)}
              {...tip(<TipRow color={KIND_COLOR[k.k]} label={ui.media[k.k]} value={`${k.share}%`} />)}
              className={`num flex min-w-0 items-center justify-center text-[12.5px] font-bold transition-[flex-grow,opacity,filter] duration-500 hover:brightness-110 ${active && active !== k.k ? "opacity-35" : ""}`}
              style={{ flexGrow: Math.max(k.share, 0.5), background: KIND_COLOR[k.k], color: dark ? "#fff" : "#0F1B2D" }}
            >
              {k.share >= 4 ? `${k.share}%` : ""}
            </button>
          );
        })}
      </div>
      <Legend items={kinds.map((k) => ({ label: ui.media[k.k], color: KIND_COLOR[k.k], value: `${k.share}%` }))} />
    </div>
  );
}
