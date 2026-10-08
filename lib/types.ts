export type Lang = "en" | "ar";
export type EngineId = "chatgpt" | "gemini" | "claude" | "perplexity" | "deepseek";
export type Sentiment = "positive" | "neutral" | "negative";

export interface Prompt {
  id: number;
  text: string;
  lang: Lang;
  product: string;
  persona: string;
  active: number;
  created_at: string;
}

export interface Citation {
  url: string;
  title?: string;
}

export interface ExtractedFact {
  field: string;
  value: string;
}

export interface Answer {
  id: number;
  run_id: number;
  prompt_id: number;
  engine: EngineId;
  repeat: number;
  text: string;
  mentioned: number; // 0/1
  rank: number | null; // position among banks named, 1 = first
  sentiment: Sentiment;
  competitors: string[];
  facts: ExtractedFact[];
  citations: Citation[];
  error: string | null;
  created_at: string;
}

export interface Run {
  id: number;
  started_at: string;
  finished_at: string | null;
  mode: "demo" | "live";
  status: "running" | "done" | "failed";
  notes: string | null;
}

export interface Fact {
  id: number;
  field: string;
  product: string;
  label_en: string;
  label_ar: string;
  value: string;
  unit: string;
  note: string | null;
  updated_at: string;
}

export interface Alert {
  id: number;
  answer_id: number;
  engine: EngineId;
  prompt_id: number;
  field: string;
  said: string;
  expected: string;
  status: "open" | "resolved";
  created_at: string;
}

export interface EngineResult {
  text: string;
  citations: Citation[];
}

export interface Analysis {
  mentioned: boolean;
  rank: number | null;
  sentiment: Sentiment;
  competitors: string[];
  facts: ExtractedFact[];
}
