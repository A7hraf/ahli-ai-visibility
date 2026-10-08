import { getT } from "@/lib/i18n";
import { comparison, BANKS } from "@/lib/compare";
import { ENGINES } from "@/lib/config";
import { Card, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { BankTrendChart, CompareRadar, GapChart, BANK_COLORS } from "@/components/Charts";

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
  const gaps = c.ranking.filter((r) => !r.isBrand).map((r) => ({ name: r.bank, gap: Math.round(brand.mention - r.mention) })).sort((a, b) => a.gap - b.gap);
  const ratio = brand.mention ? Math.round((top.mention / brand.mention) * 10) / 10 : 0;
  const bp = c.byProduct.find((r) => r.bank === "Ahli Bank")!.cells.filter((x) => x.product !== "brand");
  const best = [...bp].sort((a, b) => b.v - a.v)[0];
  const worst = [...bp].sort((a, b) => a.v - b.v)[0];
  const pn = (p: string) => t.products[p as keyof typeof t.products];
  const ar = lang === "ar";
  const findings: { tone: "bad" | "good" | "warn"; text: string }[] = [
    top.isBrand
      ? { tone: "good", text: ar ? `البنك الأهلي هو الأكثر ذكراً (${brand.mention}%).` : `Ahli Bank is the most-mentioned bank (${brand.mention}%).` }
      : { tone: "bad", text: ar ? `${top.bank} يُذكر في ${top.mention}% من الإجابات، أي ${ratio}× البنك الأهلي (${brand.mention}%).` : `${top.bank} is mentioned in ${top.mention}% of answers, ${ratio}× Ahli Bank (${brand.mention}%).` },
    { tone: brand.en - brand.ar > 10 ? "bad" : "good", text: ar ? `بالعربي يُذكر البنك الأهلي في ${brand.ar}% فقط مقابل ${brand.en}% بالإنجليزي. المنافسون أقل تأثراً باللغة.` : `In Arabic Ahli Bank is mentioned in only ${brand.ar}% vs ${brand.en}% in English. Competitors depend less on language.` },
    { tone: "warn", text: ar ? `أقوى منتج للبنك في إجابات الذكاء الاصطناعي: ${pn(best.product)} (${Math.round(best.v)}%). الأضعف: ${pn(worst.product)} (${Math.round(worst.v)}%).` : `Ahli Bank's strongest product in AI answers: ${pn(best.product)} (${Math.round(best.v)}%). Weakest: ${pn(worst.product)} (${Math.round(worst.v)}%).` },
  ];

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

      {/* plain-language findings */}
      <Card title={lang === "ar" ? "ماذا تقول الأرقام" : "What the numbers say"} className="mb-6">
        <ul className="grid gap-4 md:grid-cols-3">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${f.tone === "bad" ? "bg-bad" : f.tone === "good" ? "bg-good" : "bg-gold"}`} />
              <p className="text-[14.5px] leading-relaxed text-navy">{f.text}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title={lang === "ar" ? "الفارق بين البنك الأهلي وكل منافس" : "Ahli Bank's gap to each competitor"} note={lang === "ar" ? "بالنقاط المئوية في نسبة الذكر. الأخضر = البنك الأهلي متقدم، الأحمر = متأخر." : "Percentage points of mention rate. Green = Ahli Bank ahead, red = behind."}>
          <GapChart data={gaps} />
        </Card>
        <Card title={lang === "ar" ? "عربي مقابل إنجليزي لكل بنك" : "Arabic vs English, each bank"} note={lang === "ar" ? "طول الخط = حجم الفجوة بين اللغتين." : "Line length = size of the gap between languages."}>
          <div className="flex flex-col gap-3" dir="ltr">
            {c.ranking.map((r) => {
              const lo = Math.min(r.ar, r.en), hi = Math.max(r.ar, r.en);
              return (
                <div key={r.bank} className="grid grid-cols-[150px_1fr_70px] items-center gap-3 text-sm">
                  <span className={`truncate text-end ${r.isBrand ? "font-bold text-gold-700" : "text-navy"}`} dir="auto">{show(r.bank)}</span>
                  <div className="relative h-6">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                    <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: r.isBrand ? "#ADA042" : "#C9D6E3" }} />
                    <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ADA042] shadow" style={{ left: `${r.ar}%` }} title={`AR ${r.ar}%`} />
                    <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow" style={{ left: `${r.en}%` }} title={`EN ${r.en}%`} />
                  </div>
                  <span className="num text-xs text-ink-muted"><span className="text-gold-700">{r.ar}</span> / <span className="text-brand">{r.en}</span></span>
                </div>
              );
            })}
            <div className="mt-1 flex justify-center gap-5 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" />{t.compare.metrics.en}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ADA042]" />{t.compare.metrics.ar}</span>
            </div>
          </div>
        </Card>
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
