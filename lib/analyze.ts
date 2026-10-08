import { BRAND, COMPETITORS } from "./config";
import { completeJSON } from "./engines";
import type { Analysis, ExtractedFact, Fact } from "./types";

function analyzerEngine(): "openai" | "anthropic" | "gemini" | null {
  const pref = process.env.ANALYZER_ENGINE || "auto";
  if (pref === "none") return null; // rule-based reading only (saves API calls on free plans)
  const has = { openai: !!process.env.OPENAI_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY, gemini: !!process.env.GEMINI_API_KEY };
  if (pref !== "auto" && has[pref as keyof typeof has]) return pref as "openai" | "anthropic" | "gemini";
  if (has.openai) return "openai";
  if (has.anthropic) return "anthropic";
  if (has.gemini) return "gemini";
  return null;
}

/** Fast rule-based reading: who is named, and in what order. Used as fallback and as a cross-check. */
export function heuristicAnalysis(text: string): Analysis {
  const lower = text.toLowerCase();
  const firstIdx = (aliases: string[]) =>
    aliases.reduce((min, a) => {
      const i = lower.indexOf(a.toLowerCase());
      return i >= 0 && (min < 0 || i < min) ? i : min;
    }, -1);

  // Strip look-alike names first so "Ahlibank Qatar" does not count as Ahli Bank Oman
  let cleaned = lower;
  for (const l of BRAND.lookalikes) cleaned = cleaned.split(l.toLowerCase()).join(" ");
  const brandPos = BRAND.aliases.reduce((min, a) => {
    const i = cleaned.indexOf(a.toLowerCase());
    return i >= 0 && (min < 0 || i < min) ? i : min;
  }, -1);

  const found = COMPETITORS.map((c) => ({ name: c.name, pos: firstIdx(c.aliases) })).filter((c) => c.pos >= 0);
  const all = [...found, ...(brandPos >= 0 ? [{ name: BRAND.name, pos: brandPos }] : [])].sort((a, b) => a.pos - b.pos);
  const rank = brandPos >= 0 ? all.findIndex((x) => x.name === BRAND.name) + 1 : null;
  return {
    mentioned: brandPos >= 0,
    rank,
    sentiment: "neutral",
    competitors: found.sort((a, b) => a.pos - b.pos).map((c) => c.name),
    facts: [],
  };
}

function buildPrompt(question: string, answer: string, facts: Fact[]) {
  return `You audit how AI assistants talk about "Ahli Bank" in Oman (ahlibank.om, Arabic: البنك الأهلي / البنك الأهلي العماني, Islamic window: Al Hilal Islamic Banking).
Do NOT count Ahlibank Qatar, Al Ahli Bank of Kuwait, Saudi National Bank (formerly NCB "AlAhli") or Ahli United Bank as Ahli Bank Oman.

A customer asked: """${question}"""
The assistant answered: """${answer.slice(0, 8000)}"""

Return a JSON object with:
- "mentioned": true if Ahli Bank Oman is named in the answer.
- "rank": position of Ahli Bank Oman among all banks named, in order of appearance (1 = first). null if not named.
- "sentiment": "positive", "neutral" or "negative" — how the answer presents Ahli Bank Oman ("neutral" if not named).
- "competitors": list of other Omani banks named, using these names where they match: ${COMPETITORS.map((c) => c.name).join(", ")}.
- "facts": list of {"field","value"} for any figure the answer states ABOUT AHLI BANK OMAN ONLY, using these field ids:
${facts.map((f) => `  - ${f.field}: ${f.label_en}${f.unit ? ` (${f.unit})` : ""}`).join("\n")}
  Copy the value as stated (e.g. "5.25%", "OMR 50,000"). Empty list if none.`;
}

export async function analyzeAnswer(question: string, answer: string, facts: Fact[]): Promise<Analysis> {
  const base = heuristicAnalysis(answer);
  const engine = analyzerEngine();
  if (!engine || !answer.trim()) return base;
  try {
    const raw = await completeJSON(engine, buildPrompt(question, answer, facts));
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const valid = new Set(facts.map((f) => f.field));
    const extracted: ExtractedFact[] = Array.isArray(json.facts)
      ? json.facts.filter((f: ExtractedFact) => f && valid.has(f.field) && f.value != null).map((f: ExtractedFact) => ({ field: f.field, value: String(f.value) }))
      : [];
    return {
      mentioned: !!json.mentioned,
      rank: json.mentioned && Number.isFinite(Number(json.rank)) ? Number(json.rank) : null,
      sentiment: ["positive", "neutral", "negative"].includes(json.sentiment) ? json.sentiment : "neutral",
      competitors: Array.isArray(json.competitors) ? json.competitors.map(String) : base.competitors,
      facts: extracted,
    };
  } catch {
    return base;
  }
}
