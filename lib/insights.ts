import { all, run as exec } from "./db";
import { comparison } from "./compare";
import { citationStats, engineLangMatrix, getRuns, overview } from "./metrics";
import { completeJSON } from "./engines";
import { engineLabel, env, geminiOnly } from "./config";
import type { Lang } from "./types";

export type Insight = { tone: "good" | "warn" | "bad" | "info"; text: string };

const PRODUCT: Record<string, { en: string; ar: string }> = {
  accounts: { en: "accounts", ar: "الحسابات" },
  personal_finance: { en: "personal finance", ar: "التمويل الشخصي" },
  home_finance: { en: "home finance", ar: "التمويل السكني" },
  cards: { en: "cards", ar: "البطاقات" },
  islamic: { en: "Islamic banking", ar: "الصيرفة الإسلامية" },
  brand: { en: "brand questions", ar: "أسئلة العلامة" },
};

async function facts() {
  const runs = await getRuns();
  if (!runs.length) return null;
  const id = Number(runs[runs.length - 1].id);
  const [o, m, c, s] = await Promise.all([overview(id), engineLangMatrix(id), comparison(), citationStats(id)]);
  return { runId: id, o, m, c, s };
}

/** Plain, rule-based insights. Always available, no API key needed. */
export async function ruleInsights(lang: Lang): Promise<Insight[]> {
  const f = await facts();
  if (!f || !f.c) return [];
  const { o, m, c, s } = f;
  const ar = lang === "ar";
  const out: Insight[] = [];
  const en = m.reduce((a, x) => a + x.en, 0) / Math.max(m.length, 1);
  const arR = m.reduce((a, x) => a + x.ar, 0) / Math.max(m.length, 1);
  const gap = Math.round(en - arR);
  if (gap > 5)
    out.push({ tone: "bad", text: ar ? `فجوة لغوية: البنك يُذكر في ${Math.round(arR)}% فقط من الإجابات العربية مقابل ${Math.round(en)}% بالإنجليزية. الأولوية لمحتوى عربي يجيب مباشرة عن أسئلة العملاء.` : `Language gap: the Bank is named in only ${Math.round(arR)}% of Arabic answers vs ${Math.round(en)}% in English. Arabic Q&A content is the top priority.` });

  const sorted = [...m].sort((a, b) => b.all - a.all);
  if (sorted.length > 1) {
    const best = sorted[0], worst = sorted[sorted.length - 1];
    out.push({ tone: "info", text: ar ? `${best.label} يذكر البنك أكثر (${best.all}%)، و${worst.label} أقل (${worst.all}%).${worst.engine === "deepseek" ? " DeepSeek يعتمد على ذاكرته فقط، فالحضور في الأخبار والمصادر العامة هو ما يرفعه." : ""}` : `${best.label} names the Bank most (${best.all}%), ${worst.label} least (${worst.all}%).${worst.engine === "deepseek" ? " DeepSeek answers from memory only, so press coverage and public sources are what lift it." : ""}` });
  }

  const pos = c.ranking.findIndex((r) => r.isBrand) + 1;
  const leader = c.ranking[0];
  out.push(
    pos === 1
      ? { tone: "good", text: ar ? `البنك الأهلي هو الأكثر ذكراً بين البنوك العُمانية في هذا القياس (${leader.mention}%).` : `Ahli Bank is the most-named Omani bank in this run (${leader.mention}%).` }
      : { tone: "warn", text: ar ? `البنك الأهلي في المرتبة ${pos} من ${c.ranking.length}. المتصدر ${leader.bank} بنسبة ${leader.mention}%.` : `Ahli Bank ranks #${pos} of ${c.ranking.length}. ${leader.bank} leads with ${leader.mention}%.` },
  );

  const brandProd = c.byProduct.find((r) => r.bank === "Ahli Bank")!;
  const weakest = [...brandProd.cells].filter((x) => x.product !== "brand").sort((a, b) => a.v - b.v)[0];
  if (weakest)
    out.push({ tone: "warn", text: ar ? `أضعف منتج في الظهور: ${PRODUCT[weakest.product]?.ar} (${Math.round(weakest.v)}%). ابدأ تحسين المحتوى من صفحته.` : `Weakest product for visibility: ${PRODUCT[weakest.product]?.en} (${Math.round(weakest.v)}%). Start content fixes there.` });

  const third = s.domains.find((d) => d.kind === "comparison" || d.kind === "community");
  if (third)
    out.push({ tone: "info", text: ar ? `${third.domain} من أكثر المصادر التي يقرأها الذكاء الاصطناعي (${third.share}% من الاستشهادات). تأكد أن بيانات البنك فيه محدّثة.` : `${third.domain} is one of the sources AI reads most (${third.share}% of citations). Make sure the Bank's details there are current.` });

  if (o.openAlerts > 0)
    out.push({ tone: "bad", text: ar ? `${o.openAlerts} تنبيهات دقة مفتوحة: الذكاء الاصطناعي يذكر أرقاماً قديمة أو خاطئة عن البنك.` : `${o.openAlerts} open accuracy alerts: AI engines are quoting outdated or wrong figures about the Bank.` });
  return out.slice(0, 5);
}

/** AI-written insights, stored once per run (so page views cost nothing). */
export async function aiInsights(lang: Lang): Promise<Insight[] | null> {
  const runs = await getRuns();
  if (!runs.length) return null;
  const id = Number(runs[runs.length - 1].id);
  const row = (await all<{ body: string }>("SELECT body FROM insights WHERE run_id = ? AND lang = ?", [id, lang]))[0];
  if (!row) return null;
  try {
    return JSON.parse(row.body) as Insight[];
  } catch {
    return null;
  }
}

export async function generateAiInsights(runId: number) {
  if (geminiOnly()) return; // keep the small free Gemini quota for answers
  const engine = env("OPENAI_API_KEY") ? "openai" : env("ANTHROPIC_API_KEY") ? "anthropic" : env("GEMINI_API_KEY") ? "gemini" : null;
  if (!engine) return;
  const f = await facts();
  if (!f || !f.c) return;
  const data = {
    overall: f.o,
    byEngine: f.m.map((x) => ({ engine: engineLabel(x.engine), en: x.en, ar: x.ar })),
    ranking: f.c.ranking.map((r) => ({ bank: r.bank, mention: r.mention, first: r.first, en: r.en, ar: r.ar })),
    topSources: f.s.domains.slice(0, 8),
  };
  for (const lang of ["en", "ar"] as const) {
    try {
      const raw = await completeJSON(
        engine,
        `You are a digital marketing analyst at Ahli Bank Oman. From this week's AI-visibility data, write 4 short, specific, actionable insights for the marketing team${lang === "ar" ? " in Arabic" : " in English"}.
Data: ${JSON.stringify(data)}
Return JSON: {"insights":[{"tone":"good|warn|bad|info","text":"..."}]}. Each text max 30 words, cite numbers.`,
      );
      const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      if (Array.isArray(j.insights)) await exec("INSERT INTO insights (run_id, lang, body) VALUES (?, ?, ?)", [runId, lang, JSON.stringify(j.insights.slice(0, 5))]);
    } catch {
      /* rule-based insights remain */
    }
  }
}
