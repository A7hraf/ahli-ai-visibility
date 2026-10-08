import { getT } from "@/lib/i18n";
import { getRuns, promptMatrix } from "@/lib/metrics";
import { ENGINES } from "@/lib/config";
import { Badge, Card, PageHeader } from "@/components/ui";
import PromptForm, { PromptRowActions } from "@/components/PromptForm";

export default async function PromptsPage() {
  const { lang, t } = await getT();
  const runs = await getRuns();
  const last = runs[runs.length - 1];
  const matrix = last ? await promptMatrix(Number(last.id)) : [];

  return (
    <>
      <PageHeader title={t.prompts.title} lead={t.prompts.lead} />

      <Card title={t.prompts.add} note={t.prompts.tip} className="mb-6">
        <PromptForm
          labels={{ text: t.prompts.text, lang: t.prompts.lang, product: t.prompts.product, persona: t.prompts.persona, save: t.prompts.save }}
          langs={t.langs}
          products={t.products}
          personas={t.personas}
          defaultLang={lang}
        />
      </Card>

      <Card title={t.prompts.results}>
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-start text-[12px] uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 text-start font-medium sm:px-6">{t.prompts.text}</th>
                {ENGINES.map((e) => (
                  <th key={e.id} className="px-2 py-3 text-center font-medium">{e.label}</th>
                ))}
                <th className="px-5 py-3 font-medium sm:px-6" />
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ prompt: p, cells }) => (
                <tr key={p.id} className={`border-b border-line last:border-0 ${Number(p.active) ? "" : "opacity-50"}`}>
                  <td className="max-w-[420px] px-5 py-3 sm:px-6">
                    <p dir="auto" className={`font-medium text-navy ${p.lang === "ar" ? "font-arabic text-[15px]" : ""}`}>{p.text}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={p.lang === "ar" ? "gold" : "brand"}>{t.langs[p.lang as "en" | "ar"]}</Badge>
                      <Badge>{t.products[p.product as keyof typeof t.products] ?? p.product}</Badge>
                      <Badge>{t.personas[p.persona as keyof typeof t.personas] ?? p.persona}</Badge>
                    </div>
                  </td>
                  {cells.map((c) => {
                    const tone = c.n === 0 ? "bg-slate-50 text-ink-soft" : c.mentioned === 0 ? "bg-slate-100 text-ink-muted" : c.bestRank && c.bestRank <= 3 ? "bg-good-soft text-good" : "bg-warn-soft text-warn";
                    return (
                      <td key={c.engine} className="px-2 py-3 text-center">
                        <div className={`num mx-auto flex w-20 flex-col items-center rounded-lg px-2 py-1.5 ${tone}`}>
                          <span className="text-[13px] font-semibold">{c.n ? `${c.mentioned}/${c.n}` : "–"}</span>
                          <span className="text-[11px]">{c.bestRank ? `#${c.bestRank}` : c.n ? "—" : ""}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 sm:px-6">
                    <PromptRowActions id={Number(p.id)} active={!!Number(p.active)} labels={{ active: t.prompts.active, delete: t.prompts.delete }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          {lang === "ar" ? "كل خانة: عدد مرات ذكر البنك من عدد الإجابات، وأفضل ترتيب. أخضر = ضمن أول 3." : "Each cell: times the Bank was named out of answers, and best rank. Green = top 3."}
        </p>
      </Card>
    </>
  );
}
