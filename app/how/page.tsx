import { getT } from "@/lib/i18n";
import { CATEGORY_COLOR } from "@/lib/actions";
import { UI } from "@/lib/ui-text";
import { CATEGORY_TINT } from "@/lib/plan";
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
      {/* hero with the weekly flow */}
      <section className="rise mb-6 mt-3 rounded-[4px] bg-navy px-6 py-8 text-white sm:px-10">
        <p className="text-[12.5px] font-bold text-gold-400">{UI[lang].kick.how}</p>
        <h1 className="mt-2 font-display text-[32px] leading-tight sm:text-[40px]">{t.how.title}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-white/75">{t.how.lead}</p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {t.how.flow.map((f, i) => (
            <li key={f} className="group flex flex-col gap-3 border-t-2 border-gold pt-4 transition hover:-translate-y-0.5">
              <span className="flex items-center justify-between">
                <span className="font-display text-[28px] leading-none text-white/45 transition group-hover:text-gold-400">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-gold-400">
                  <Icon name={icons[i]} size={22} />
                </span>
              </span>
              <span className="text-[16px] font-bold">{f}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Q&A */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {qa.map((x, i) => (
          <section key={i} className={`lift rounded-[4px] border border-line bg-white p-6 ${i === 0 ? "lg:col-span-2" : ""}`}>
            <h2 className="mb-2 font-display text-[20px] text-ink">{x.q}</h2>
            <p className="text-[15px] leading-relaxed text-ink-2">{x.a}</p>
          </section>
        ))}
      </div>

      {/* fix types */}
      <section className="mb-6">
        <h2 className="mb-4 font-display text-[24px] text-ink">{t.plan.byCategory}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["content", "technical", "partners", "accuracy"] as const).map((c) => (
            <div key={c} className="lift overflow-hidden rounded-[4px] border border-line bg-white">
              <div className="flex flex-col gap-2 p-5">
                <span className="self-start rounded-[3px] px-2 py-0.5 text-[13px] font-bold" style={{ background: CATEGORY_TINT[c], color: CATEGORY_COLOR[c] }}>
                  {t.cats[c]}
                </span>
                <p className="text-[14px] leading-relaxed text-ink-2">{t.catsHint[c]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* glossary */}
      <section>
        <h2 className="mb-4 font-display text-[24px] text-ink">{t.how.glossary}</h2>
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {glossary.map((g) => (
            <div key={g.k} className="rise lift rounded-[4px] border border-line bg-white p-5">
              <dt className="text-[16px] font-bold text-ink">{g.k}</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-ink-2">{g.v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
