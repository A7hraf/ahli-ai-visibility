import type { ExtractedFact, Fact } from "./types";

function num(s: string): number | null {
  const m = s.replace(/,/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Compare what an AI engine said with the Bank's approved figures. Returns mismatches. */
export function compareFacts(said: ExtractedFact[], truth: Fact[]) {
  const out: { field: string; said: string; expected: string }[] = [];
  for (const s of said) {
    const t = truth.find((f) => f.field === s.field);
    if (!t) continue;
    const a = num(s.value);
    const b = num(t.value);
    let wrong = false;
    if (a !== null && b !== null) {
      // tolerate rounding: 1% relative or 0.05 absolute
      wrong = Math.abs(a - b) > Math.max(0.05, Math.abs(b) * 0.01);
    } else {
      wrong = s.value.trim().toLowerCase() !== t.value.trim().toLowerCase();
    }
    if (wrong) out.push({ field: s.field, said: s.value, expected: `${t.value}${t.unit ? " " + t.unit : ""}` });
  }
  return out;
}
