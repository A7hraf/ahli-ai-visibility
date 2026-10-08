/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Citation, EngineId, EngineResult } from "../types";
import { env } from "../config";

// Each connector asks the question the way a customer would: no system prompt,
// web search switched on where the engine supports it, location set to Oman.

const TIMEOUT = 120_000;

/** A daily (not per-minute) quota is used up: retrying soon will not help. */
export class QuotaError extends Error {}

function isDailyQuota(text: string) {
  return /per ?day|PerDay|daily|retry in \d+h|"retryDelay": ?"(\d{3,})s"/i.test(text);
}

async function post(url: string, headers: Record<string, string>, body: unknown, attempt = 0): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  if (res.status === 429 && isDailyQuota(text)) throw new QuotaError(`429 daily quota: ${text.slice(0, 200)}`);
  // Free tiers also have per-minute limits: wait briefly and retry
  if ((res.status === 429 || res.status === 503) && attempt < 2) {
    const after = Number(res.headers.get("retry-after")) || 0;
    await new Promise((r) => setTimeout(r, Math.min(20, after || 5 * 2 ** attempt) * 1000));
    return post(url, headers, body, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function dedupe(c: Citation[]): Citation[] {
  const seen = new Set<string>();
  return c.filter((x) => x.url && !seen.has(x.url) && seen.add(x.url));
}

async function askChatGPT(q: string): Promise<EngineResult> {
  const j = await post(
    "https://api.openai.com/v1/responses",
    { authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    {
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      input: q,
      tools: [{ type: "web_search", user_location: { type: "approximate", country: "OM" } }],
    },
  );
  let text = "";
  const citations: Citation[] = [];
  for (const item of j.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text") {
        text += part.text;
        for (const a of part.annotations ?? []) if (a.type === "url_citation") citations.push({ url: a.url, title: a.title });
      }
    }
  }
  return { text, citations: dedupe(citations) };
}

// Free Google AI Studio keys may not include Google Search grounding, and each model has its own
// small daily free quota. We try search first, and move to the next model when a model's quota is used up.
let geminiSearchBlocked = process.env.GEMINI_SEARCH === "false";
const exhausted = new Set<string>();

export function geminiModels(): string[] {
  const fromEnv = (process.env.GEMINI_MODEL || "").split(",").map((m) => m.trim()).filter(Boolean);
  const defaults = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"];
  return [...new Set([...fromEnv, ...defaults])];
}

async function geminiCall(body: object): Promise<any> {
  const headers = { "x-goog-api-key": env("GEMINI_API_KEY")! };
  let last: Error | null = null;
  for (const model of geminiModels()) {
    if (exhausted.has(model)) continue;
    try {
      return await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, headers, body);
    } catch (e) {
      last = e as Error;
      const m = String(last.message);
      // quota used up or model not available to this account: try the next model
      if (e instanceof QuotaError || /^(404|429)/.test(m)) {
        exhausted.add(model);
        continue;
      }
      throw e;
    }
  }
  throw new QuotaError(`All Gemini models have used today's free quota. Try again tomorrow or enable billing. (${last?.message.slice(0, 120) ?? ""})`);
}

async function askGemini(q: string): Promise<EngineResult> {
  const body = { contents: [{ role: "user", parts: [{ text: q }] }] };
  let j;
  if (!geminiSearchBlocked) {
    try {
      j = await geminiCall({ ...body, tools: [{ google_search: {} }] });
    } catch (e) {
      const m = String((e as Error).message);
      if (!/^(400|403)/.test(m)) throw e;
      geminiSearchBlocked = true; // plan without search: stop trying for this instance
    }
  }
  if (!j) j = await geminiCall(body);
  const cand = j.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  // Gemini returns redirect links; the title holds the real domain
  const citations: Citation[] = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((g: { web?: { uri: string; title?: string } }) => g.web)
    .filter(Boolean)
    .map((w: { uri: string; title?: string }) => ({ url: w.title && /\./.test(w.title) ? `https://${w.title}/` : w.uri, title: w.title }));
  return { text, citations: dedupe(citations) };
}

async function askClaude(q: string): Promise<EngineResult> {
  const j = await post(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": env("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
    {
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: q }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "OM", timezone: "Asia/Muscat" } }],
    },
  );
  let text = "";
  const citations: Citation[] = [];
  for (const b of j.content ?? []) {
    if (b.type === "text") {
      text += b.text;
      for (const c of b.citations ?? []) if (c.url) citations.push({ url: c.url, title: c.title });
    }
  }
  return { text, citations: dedupe(citations) };
}

async function askPerplexity(q: string): Promise<EngineResult> {
  const j = await post(
    "https://api.perplexity.ai/chat/completions",
    { authorization: `Bearer ${env("PERPLEXITY_API_KEY")}` },
    { model: process.env.PERPLEXITY_MODEL || "sonar", messages: [{ role: "user", content: q }] },
  );
  const text = j.choices?.[0]?.message?.content ?? "";
  const citations: Citation[] = [
    ...(j.search_results ?? []).map((s: { url: string; title?: string }) => ({ url: s.url, title: s.title })),
    ...(j.citations ?? []).map((u: string) => ({ url: u })),
  ];
  return { text, citations: dedupe(citations) };
}

async function askDeepSeek(q: string): Promise<EngineResult> {
  // DeepSeek's API has no built-in web search: this measures what the model "remembers".
  const j = await post(
    `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`,
    { authorization: `Bearer ${env("DEEPSEEK_API_KEY")}` },
    { model: process.env.DEEPSEEK_MODEL || "deepseek-chat", messages: [{ role: "user", content: q }] },
  );
  return { text: j.choices?.[0]?.message?.content ?? "", citations: [] };
}

export const ASK: Record<EngineId, (q: string) => Promise<EngineResult>> = {
  chatgpt: askChatGPT,
  gemini: askGemini,
  claude: askClaude,
  perplexity: askPerplexity,
  deepseek: askDeepSeek,
};

/** Plain text completion used by the analyzer (JSON output). */
export async function completeJSON(engine: "openai" | "anthropic" | "gemini", prompt: string): Promise<string> {
  if (engine === "openai") {
    const j = await post(
      "https://api.openai.com/v1/chat/completions",
      { authorization: `Bearer ${env("OPENAI_API_KEY")}` },
      { model: process.env.ANALYZER_MODEL || "gpt-4.1-mini", response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] },
    );
    return j.choices?.[0]?.message?.content ?? "{}";
  }
  if (engine === "anthropic") {
    const j = await post(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": env("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
      { model: process.env.ANALYZER_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 1200, messages: [{ role: "user", content: prompt + "\n\nReply with the JSON object only." }] },
    );
    return (j.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  }
  const j = await geminiCall({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}
