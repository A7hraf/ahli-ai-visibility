import { getT } from "@/lib/i18n";
import { CATEGORY_COLOR } from "@/lib/actions";
import { PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";

export default async function HowPage() {
  const { lang, t } = await getT();
  const ar = lang === "ar";
  const icons: IconName[] = ["chat", "sparkle", "list", "alert", "bars"];
  const qa = [
    { q: t.how.q1, a: t.how.a1 },
    { q: t.how.q2, a: t.how.a2 },
    { q: t.how.q3, a: t.how.a3 },
    { q: t.how.q4, a: t.how.a4 },
    { q: t.how.q5, a: t.how.a5 },
  ];
  const glossary = [
    { k: t.kpi.score, v: t.help.score },
    { k: t.kpi.mention, v: t.help.mention },
    { k: t.kpi.top3, v: t.help.top3 },
    { k: t.kpi.sov, v: t.help.sov },
    { k: ar ? "الفجوة بين اللغتين" : "Language gap", v: t.help.gap },
    { k: "GEO", v: ar ? "تحسين الظهور في محركات الذكاء الاصطناعي: مثل تحسين محركات البحث (SEO)، لكن لإجابات ChatGPT وGemini وغيرهما." : "Generative Engine Optimisation: like SEO, but for the answers of ChatGPT, Gemini and other AI assistants." },
  ];

  return (
    <>
      <PageHeader title={t.how.title} lead={t.how.lead} />

      {/* flow */}
      <div className="mb-8 rounded-3xl bg-navy p-6 shadow-card sm:p-8">
        <ol className="grid gap-3 md:grid-cols-5">
          {t.how.flow.map((f, i) => (
            <li key={f} className="relative flex flex-col items-center gap-3 rounded-2xl bg-white/[0.07] p-5 text-center ring-1 ring-white/10">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-navy">
                <Icon name={icons[i]} size={22} />
              </span>
              <span className="num text-xs font-semibold text-gold-400">{i + 1}</span>
              <span className="text-[15px] font-semibold text-white">{f}</span>
              {i < t.how.flow.length - 1 && (
                <span aria-hidden="true" className="absolute -end-3 top-1/2 z-10 hidden -translate-y-1/2 text-xl text-gold-400 md:block">
                  {ar ? "←" : "→"}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Q&A */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        {qa.map((x, i) => (
          <section key={i} className={`rounded-2xl border border-line bg-white p-6 shadow-card ${i === 0 ? "lg:col-span-2" : ""}`}>
            <h2 className="font-display mb-2 text-[19px] font-bold text-navy">{x.q}</h2>
            <p className="text-[15px] leading-relaxed text-ink-muted">{x.a}</p>
          </section>
        ))}
      </div>

      {/* fix types */}
      <section className="mb-8">
        <h2 className="font-display mb-4 text-[22px] font-bold text-navy">{t.plan.byCategory}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["content", "technical", "partners", "accuracy"] as const).map((c) => (
            <div key={c} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className="h-1.5" style={{ background: CATEGORY_COLOR[c] }} />
              <div className="flex flex-col gap-2 p-5">
                <span className="font-display text-[17px] font-bold" style={{ color: CATEGORY_COLOR[c] }}>{t.cats[c]}</span>
                <p className="text-[14px] leading-relaxed text-ink-muted">{t.catsHint[c]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* glossary */}
      <section>
        <h2 className="font-display mb-4 text-[22px] font-bold text-navy">{t.how.glossary}</h2>
        <dl className="grid gap-3 md:grid-cols-2">
          {glossary.map((g) => (
            <div key={g.k} className="rise rounded-2xl border border-line bg-white p-5 shadow-card">
              <dt className="font-semibold text-navy">{g.k}</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-ink-muted">{g.v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
