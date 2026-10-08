import type { EngineId } from "./types";

export const BRAND = {
  name: "Ahli Bank",
  nameAr: "البنك الأهلي",
  domain: "ahlibank.om",
  // Every way people (and AI engines) write the Bank's name
  aliases: [
    "ahli bank oman",
    "ahlibank oman",
    "ahli bank",
    "ahlibank",
    "al hilal islamic",
    "البنك الأهلي العماني",
    "البنك الأهلي",
    "الأهلي العماني",
    "الهلال الإسلامي",
  ],
  // Names that look similar but are NOT this bank (used to flag confusion)
  lookalikes: ["ahlibank qatar", "ahli bank qatar", "al ahli bank of kuwait", "saudi national bank", "ahli united bank", "أهلي بنك قطر"],
};

export const COMPETITORS: { name: string; aliases: string[]; domain: string }[] = [
  { name: "Bank Muscat", aliases: ["bank muscat", "bankmuscat", "بنك مسقط"], domain: "bankmuscat.com" },
  { name: "National Bank of Oman", aliases: ["national bank of oman", "nbo", "البنك الوطني العماني"], domain: "nbo.om" },
  { name: "Bank Dhofar", aliases: ["bank dhofar", "بنك ظفار"], domain: "bankdhofar.com" },
  { name: "Sohar International", aliases: ["sohar international", "صحار الدولي"], domain: "soharinternational.com" },
  { name: "Oman Arab Bank", aliases: ["oman arab bank", "بنك عمان العربي"], domain: "oman-arabbank.com" },
  { name: "Bank Nizwa", aliases: ["bank nizwa", "بنك نزوى"], domain: "banknizwa.om" },
  { name: "HSBC Oman", aliases: ["hsbc oman", "hsbc", "إتش إس بي سي"], domain: "hsbc.co.om" },
];

export const ENGINES: { id: EngineId; label: string; envKey: string; webSearch: boolean; color: string }[] = [
  { id: "chatgpt", label: "ChatGPT", envKey: "OPENAI_API_KEY", webSearch: true, color: "#0B6298" },
  { id: "gemini", label: "Gemini", envKey: "GEMINI_API_KEY", webSearch: true, color: "#ADA042" },
  { id: "claude", label: "Claude", envKey: "ANTHROPIC_API_KEY", webSearch: true, color: "#C2703D" },
  { id: "perplexity", label: "Perplexity", envKey: "PERPLEXITY_API_KEY", webSearch: true, color: "#2E8B87" },
  { id: "deepseek", label: "DeepSeek", envKey: "DEEPSEEK_API_KEY", webSearch: false, color: "#5B6CB5" },
];

export const PRODUCTS = ["accounts", "personal_finance", "home_finance", "cards", "islamic", "brand"] as const;
export const PERSONAS = ["government_employee", "private_employee", "expat", "student", "sme_owner", "general"] as const;

export function engineLabel(id: string) {
  return ENGINES.find((e) => e.id === id)?.label ?? id;
}

export function configuredEngines(): EngineId[] {
  return ENGINES.filter((e) => !!process.env[e.envKey]).map((e) => e.id);
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  return configuredEngines().length === 0;
}

export function repeats(): number {
  const n = Number(process.env.REPEATS ?? 3);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.floor(n) : 3;
}
