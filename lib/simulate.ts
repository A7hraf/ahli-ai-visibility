import { BRAND, COMPETITORS, ENGINES } from "./config";
import type { EngineId, EngineResult } from "./types";

// Simulated answers for engines that have no API key yet (hybrid mode) and for demo mode.
// Always stored with simulated = 1 and labelled in the interface.

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const WEIGHT: Record<string, number> = {
  "Bank Muscat": 0.78,
  "National Bank of Oman": 0.6,
  "Bank Dhofar": 0.5,
  "Sohar International": 0.48,
  "Sohar Islamic": 0.3,
  "Bank Nizwa": 0.36,
  "Oman Arab Bank": 0.32,
  "HSBC Oman": 0.28,
};
const BRAND_BASE: Record<string, [number, number]> = {
  chatgpt: [0.42, 0.2],
  gemini: [0.38, 0.17],
  claude: [0.36, 0.15],
  perplexity: [0.46, 0.22],
  deepseek: [0.22, 0.08],
};

export function simulateAnswer(question: string, engine: EngineId, salt = ""): EngineResult {
  const ar = /[؀-ۿ]/.test(question);
  let seed = hash(question + engine + salt);
  const r = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) % 10000) / 10000;
  let comps = COMPETITORS.filter((c) => r() < (WEIGHT[c.name] ?? 0.3)).map((c) => c.name);
  if (comps.length < 2) comps = [...comps, ...COMPETITORS.map((c) => c.name).filter((n) => !comps.includes(n)).slice(0, 2 - comps.length)];
  comps.sort((a, b) => (WEIGHT[b] ?? 0) - (WEIGHT[a] ?? 0) + (r() - 0.5) * 0.6);
  const [en, arP] = BRAND_BASE[engine] ?? [0.3, 0.15];
  const named = r() < (ar ? arP : en) || /ahli|الأهلي/i.test(question);
  if (named) comps.splice(Math.floor(r() * Math.min(4, comps.length + 1)), 0, BRAND.name);
  const lines = comps.map((b, i) => `${i + 1}. ${b}`).join("\n");
  const text = ar
    ? `(إجابة محاكاة — هذا المحرك غير متصل بعد)\nبناءً على المصادر المتاحة، هذه بعض البنوك التي يمكنك النظر فيها في عُمان:\n${lines}\nننصح بمقارنة الرسوم والشروط في موقع كل بنك قبل القرار.`
    : `(Simulated answer — this engine is not connected yet)\nBased on available sources, here are banks you could consider in Oman:\n${lines}\nCompare fees and terms on each bank's website before deciding.`;
  const citations = ENGINES.find((e) => e.id === engine)?.webSearch
    ? [
        { url: ar ? "https://giraffy.com/om/ar/finance/personal-loans" : "https://www.expatfocus.com/oman/articles/how-to-open-a-bank-account-in-oman-6387" },
        { url: `https://${COMPETITORS[Math.floor(r() * COMPETITORS.length)].domain}/` },
        ...(named && r() < 0.4 ? [{ url: "https://ahlibank.om/" }] : []),
      ]
    : [];
  return { text, citations };
}
