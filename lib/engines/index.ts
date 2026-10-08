import type { Citation, EngineId, EngineResult } from "../types";

// Each connector asks the question the way a customer would: no system prompt,
// web search switched on where the engine supports it, location set to Oman.

const TIMEOUT = 120_000;

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
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
    { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
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

async function askGemini(q: string): Promise<EngineResult> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const j = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { "x-goog-api-key": process.env.GEMINI_API_KEY! },
    { contents: [{ role: "user", parts: [{ text: q }] }], tools: [{ google_search: {} }] },
  );
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
    { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
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
    { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
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
    "https://api.deepseek.com/chat/completions",
    { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
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
      { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      { model: process.env.ANALYZER_MODEL || "gpt-4.1-mini", response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] },
    );
    return j.choices?.[0]?.message?.content ?? "{}";
  }
  if (engine === "anthropic") {
    const j = await post(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      { model: process.env.ANALYZER_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 1200, messages: [{ role: "user", content: prompt + "\n\nReply with the JSON object only." }] },
    );
    return (j.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  }
  const model = process.env.ANALYZER_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const j = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { "x-goog-api-key": process.env.GEMINI_API_KEY! },
    { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } },
  );
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}
