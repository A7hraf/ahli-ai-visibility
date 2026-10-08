import { getT } from "@/lib/i18n";
import { comparison, BANKS } from "@/lib/compare";
import { ENGINES } from "@/lib/config";
import { Card, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { BankTrendChart, CompareRadar, BANK_COLORS } from "@/components/Charts";

function heat(v: number, max: number) {
  const a = max ? v / max : 0;
  return `rgba(11, 98, 152, ${0.06 + a * 0.84})`;
}

export default async function ComparePage() {
  const { lang, t } = await getT();
  const c = await comparison();
  if (!c) return (<><PageHeader title={t.compare.title} lead={t.compare.lead} /><Empty>{t.noData}</Empty></>);

  const brandName = lang === "ar" ? "البنك الأهلي" : "Ahli Bank";
  const show = (b: string) => (b === "Ahli Bank" ? brandName : b);
  const pos = c.ranking.findIndex((r) => r.isBrand) + 1;
  const brand = c.ranking.find((r) => r.isBrand)!;
  const leader = c.ranking.find((r) => !r.isBrand)!;
  const top = c.ranking[0];
  const gap = Math.round((top.mention - brand.mention) * 10) / 10;
  const radar = (["mention", "first", "top3", "en", "ar"] as const).map((k) => ({ metric: t.compare.metrics[k], a: brand[k], b: leader[k] }));
  const maxEngine = Math.max(...c.byEngine.flatMap((r) => r.cells.map((x) => x.v)), 1);
  const maxProduct = Math.max(...c.byProduct.flatMap((r) => r.cells.map((x) => x.v)), 1);
  const trendBanks = ["Ahli Bank", ...c.ranking.filter((r) => !r.isBrand).slice(0, 4).map((r) => r.bank)];

  return (
    <>
      <PageHeader title={t.compare.title} lead={t.compare.lead} />

      {/* headline strip */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="hero-pattern flex flex-col gap-2 rounded-2xl bg-navy p-6 text-white shadow-card">
          <span className="text-xs font-medium uppercase tracking-wide text-gold-400">{t.compare.position}</span>
          <div className="flex items-baseline gap-2">
            <span className="num font-display text-[56px] font-bold leading-none">#{pos}</span>
            <span className="text-brand-100/80">{t.compare.of} {BANKS.length}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-6 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t.compare.leader}</span>
          <span className="font-display text-2xl font-bold text-navy">{show(top.bank)}</span>
          <span className="num text-sm text-ink-muted">{t.compare.mention}: {top.mention}%</span>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-6 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t.compare.gapToLeader}</span>
          <span className={`num font-display text-[40px] font-bold leading-none ${gap > 0 ? "text-bad" : "text-good"}`}>{gap > 0 ? `−${gap}` : `+${Math.abs(gap)}`}</span>
          <span className="text-sm text-ink-muted">{lang === "ar" ? "نقطة مئوية في نسبة الذكر" : "percentage points in mention rate"}</span>
        </div>
      </div>

      {/* ranking table */}
      <Card title={t.compare.ranking} className="mb-6">
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-muted">
                <th className="w-10 px-5 py-3 text-start font-medium sm:px-6">#</th>
                <th className="px-2 py-3 text-start font-medium">{t.compare.bank}</th>
                <th className="w-[26%] px-2 py-3 text-start font-medium">{t.compare.mention}</th>
                <th className="px-2 py-3 text-center font-medium">{t.compare.first}</th>
                <th className="px-2 py-3 text-center font-medium">{t.compare.top3}</th>
                <th className="px-2 py-3 text-center font-medium">{t.compare.avgPos}</th>
                <th className="px-2 py-3 text-center font-medium">{t.compare.en}</th>
                <th className="px-2 py-3 text-center font-medium">{t.compare.ar}</th>
                <th className="px-5 py-3 text-center font-medium sm:px-6">{t.compare.change}</th>
              </tr>
            </thead>
            <tbody>
              {c.ranking.map((r, i) => (
                <tr key={r.bank} className={`border-b border-line last:border-0 ${r.isBrand ? "bg-gold-50" : ""}`}>
                  <td className="num px-5 py-3 font-semibold text-ink-muted sm:px-6">{i + 1}</td>
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-2 font-semibold text-navy">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: BANK_COLORS[r.bank] }} />
                      {show(r.bank)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${(r.mention / Math.max(top.mention, 1)) * 100}%`, background: r.isBrand ? "#ADA042" : "#0B6298", opacity: r.isBrand ? 1 : 0.55 }} />
                      </div>
                      <span className="num w-12 text-end font-semibold">{r.mention}%</span>
                    </div>
                  </td>
                  <td className="num px-2 py-3 text-center">{r.first}%</td>
                  <td className="num px-2 py-3 text-center">{r.top3}%</td>
                  <td className="num px-2 py-3 text-center">{r.avgPos ?? "–"}</td>
                  <td className="num px-2 py-3 text-center text-brand">{r.en}%</td>
                  <td className="num px-2 py-3 text-center text-gold-700">{r.ar}%</td>
                  <td className="px-5 py-3 text-center sm:px-6">
                    {r.delta === null || r.delta === 0 ? (
                      <span className="text-ink-soft">–</span>
                    ) : (
                      <span className={`num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-semibold ${r.delta > 0 ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                        <Icon name={r.delta > 0 ? "arrowUp" : "arrowDown"} size={11} />
                        {Math.abs(r.delta)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <Card title={t.compare.trend} className="lg:col-span-3">
          <BankTrendChart data={c.trend} banks={trendBanks} brandLabel={brandName} />
        </Card>
        <Card title={t.compare.radar} note={`${brandName} vs ${show(leader.bank)}`} className="lg:col-span-2">
          <CompareRadar data={radar} a="Ahli Bank" b={leader.bank} aLabel={brandName} bLabel={show(leader.bank)} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.compare.heatEngine} note={t.compare.heatNote}>
          <HeatTable rows={c.byEngine.map((r) => ({ bank: r.bank, cells: r.cells.map((x) => x.v) }))} cols={ENGINES.map((e) => e.label)} max={maxEngine} show={show} />
        </Card>
        <Card title={t.compare.heatProduct} note={t.compare.heatNote}>
          <HeatTable rows={c.byProduct.map((r) => ({ bank: r.bank, cells: r.cells.map((x) => x.v) }))} cols={c.byProduct[0].cells.map((x) => t.products[x.product as keyof typeof t.products])} max={maxProduct} show={show} />
        </Card>
      </div>
    </>
  );
}

function HeatTable({ rows, cols, max, show }: { rows: { bank: string; cells: number[] }[]; cols: string[]; max: number; show: (b: string) => string }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 px-4 text-[13px] sm:px-5">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (<th key={c} className="px-1 pb-1 text-center text-[11px] font-medium text-ink-muted">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const brand = r.bank === "Ahli Bank";
            return (
              <tr key={r.bank}>
                <td className={`whitespace-nowrap pe-2 text-[13px] ${brand ? "font-bold text-gold-700" : "text-navy"}`}>{show(r.bank)}</td>
                {r.cells.map((v, i) => (
                  <td
                    key={i}
                    className={`num rounded-md px-1 py-2 text-center font-medium ${brand ? "ring-2 ring-gold" : ""}`}
                    style={{ background: brand ? `rgba(173,160,66,${0.15 + (v / max) * 0.75})` : heat(v, max), color: v / max > 0.5 ? "#fff" : "#0B3A5B" }}
                  >
                    {Math.round(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
