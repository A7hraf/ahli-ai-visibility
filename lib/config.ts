import type { EngineId } from "./types";

export const BRAND = {
  name: "Ahli Bank",
  nameAr: "البنك الأهلي",
  domain: "ahlibank.om",
  color: "#C9A227",
  short: "AHLI",
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

// Each bank's colour and short code, used on every chart (codes keep banks apart for colour-blind readers).
// Brand colours: Bank Muscat blood red, Sohar International black, Sohar Islamic dark blue (Digital Marketing team);
// NBO blue and Bank Dhofar green from public brand listings; Bank Nizwa not confirmed yet. Change them here only.
export const COMPETITORS: { name: string; aliases: string[]; domain: string; color: string; short: string }[] = [
  { name: "Bank Muscat", aliases: ["bank muscat", "bankmuscat", "بنك مسقط"], domain: "bankmuscat.com", color: "#A3141B", short: "BM" },
  { name: "National Bank of Oman", aliases: ["national bank of oman", "nbo", "البنك الوطني العماني"], domain: "nbo.om", color: "#0083BE", short: "NBO" },
  { name: "Bank Dhofar", aliases: ["bank dhofar", "بنك ظفار"], domain: "bankdhofar.com", color: "#4E9A16", short: "BD" },
  { name: "Sohar International", aliases: ["sohar international", "صحار الدولي"], domain: "soharinternational.com", color: "#151515", short: "SI" },
  { name: "Sohar Islamic", aliases: ["sohar islamic", "صحار الإسلامي"], domain: "soharislamic.om", color: "#1B2F6B", short: "SIS" },
  { name: "Oman Arab Bank", aliases: ["oman arab bank", "بنك عمان العربي"], domain: "oman-arabbank.com", color: "#005AAB", short: "OAB" },
  { name: "Bank Nizwa", aliases: ["bank nizwa", "بنك نزوى"], domain: "banknizwa.om", color: "#7B3F98", short: "BN" },
  { name: "HSBC Oman", aliases: ["hsbc oman", "hsbc", "إتش إس بي سي"], domain: "hsbc.co.om", color: "#DB0011", short: "HSBC" },
];

export const ENGINES: { id: EngineId; label: string; envKey: string; webSearch: boolean; color: string }[] = [
  { id: "chatgpt", label: "ChatGPT", envKey: "OPENAI_API_KEY", webSearch: true, color: "#2a78d6" },
  { id: "gemini", label: "Gemini", envKey: "GEMINI_API_KEY", webSearch: true, color: "#eb6834" },
  { id: "claude", label: "Claude", envKey: "ANTHROPIC_API_KEY", webSearch: true, color: "#1baf7a" },
  { id: "perplexity", label: "Perplexity", envKey: "PERPLEXITY_API_KEY", webSearch: true, color: "#4a3aa7" },
  { id: "deepseek", label: "DeepSeek", envKey: "DEEPSEEK_API_KEY", webSearch: false, color: "#e87ba4" },
];

export const PRODUCTS = ["accounts", "personal_finance", "home_finance", "cards", "islamic", "brand"] as const;
export const PERSONAS = ["government_employee", "private_employee", "expat", "student", "sme_owner", "general"] as const;

export function engineLabel(id: string) {
  return ENGINES.find((e) => e.id === id)?.label ?? id;
}

/** Read an environment variable, ignoring upper/lower case in its name (e.g. "Gemini_API_Key"). */
export function env(name: string): string | undefined {
  const direct = process.env[name];
  if (direct) return direct.trim();
  const key = Object.keys(process.env).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? process.env[key]?.trim() || undefined : undefined;
}

export function configuredEngines(): EngineId[] {
  return ENGINES.filter((e) => !!env(e.envKey)).map((e) => e.id);
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  return configuredEngines().length === 0;
}

/** Only the free Gemini key is set: use light defaults that fit free-tier limits. */
export function geminiOnly(): boolean {
  const e = configuredEngines();
  return e.length === 1 && e[0] === "gemini";
}

export function repeats(): number {
  const n = Number(process.env.REPEATS ?? (geminiOnly() ? 1 : 3));
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.floor(n) : 3;
}
