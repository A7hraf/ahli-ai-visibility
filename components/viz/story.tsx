"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND_IDX, type Dataset, type DRow } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { Highlight } from "./Details";

/* ---------- "see it through the customer's eyes": a live chat preview ---------- */

type Ans = { id: number; text: string; prompt: string; engine: string; mentioned: number; rank: number | null };

export function AnswerPreview({ ds, ui, rows, take }: { ds: Dataset; ui: UIText; rows: DRow[]; take?: (n: number, t: number) => string }) {
  // questions in the latest week, the ones where some assistants mention us and some don't come first
  const last = Math.max(-1, ...rows.map((r) => r.r));
  const questions = useMemo(() => {
    const byP = new Map<number, DRow[]>();
    for (const r of rows) if (r.r === last) byP.set(r.p, [...(byP.get(r.p) ?? []), r]);
    return [...byP.entries()]
      .map(([p, rs]) => ({ p, rs, mixed: rs.some((x) => x.o.includes(BRAND_IDX)) && rs.some((x) => !x.o.includes(BRAND_IDX)) }))
      .sort((a, b) => Number(b.mixed) - Number(a.mixed));
  }, [rows, last]);
  const [qi, setQi] = useState(0);
  const q = questions[qi % Math.max(1, questions.length)];
  const [engine, setEngine] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Ans[] | null>(null);
  const [typed, setTyped] = useState(0);

  const ids = q ? q.rs.map((r) => r.id).join(",") : "";
  useEffect(() => {
    if (!ids) return;
    let live = true;
    setAnswers(null);
    fetch(`/api/answers?ids=${ids}`)
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        setAnswers(j.answers ?? []);
        const first = (j.answers ?? []).find((a: Ans) => !Number(a.mentioned)) ?? j.answers?.[0];
        setEngine(first?.engine ?? null);
      })
      .catch(() => live && setAnswers([]));
    return () => {
      live = false;
    };
  }, [ids]);

  const a = answers?.find((x) => x.engine === engine) ?? null;
  // typewriter
  useEffect(() => {
    setTyped(0);
    if (!a) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setTyped(a.text.length);
    const id = setInterval(() => setTyped((t) => (t >= a.text.length ? (clearInterval(id), t) : t + 3)), 16);
    return () => clearInterval(id);
  }, [a]);

  if (!q) return null;
  const eng = ds.engines.find((e) => e.id === engine);
  const done = a ? typed >= a.text.length : false;
  const named = answers ? answers.filter((x) => Number(x.mentioned)).length : 0;
  return (
    <div className="flex flex-col gap-4">
      {take && answers && answers.length > 0 && <p className="-mt-1 text-[14px] text-ink-2">{take(named, answers.length)}</p>}
      <div className="flex flex-wrap gap-1.5">
        {ds.engines.map((e) => {
          const ans = answers?.find((x) => x.engine === e.id);
          if (!ans) return null;
          const on = engine === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setEngine(e.id)}
              className={`flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[13px] font-bold transition-all ${on ? "border-navy bg-white text-ink shadow-[inset_0_0_0_1px_#0B3A5B]" : "border-line bg-white text-ink-2 hover:bg-slate-100"}`}
            >
              <span className={Number(ans.mentioned) ? "text-good" : "text-bad"}>{Number(ans.mentioned) ? "✓" : "✗"}</span>
              {e.label}
              <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
            </button>
          );
        })}
      </div>

      <div className="flex min-h-[260px] flex-col gap-3 rounded-[4px] border border-line bg-paper p-4">
        <div className="flex items-end gap-2 self-start">
          <div>
            <p className="mb-1 text-[11px] text-ink-muted">{ui.overview.askLine}</p>
            <p dir="auto" className="max-w-md rounded-[4px] bg-navy px-4 py-2.5 text-[14px] text-white">
              {q.rs[0] ? ds.prompts[q.p].text : ""}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2 self-end">
          <div className="min-w-0">
            <p className="mb-1 text-end text-[11px] text-ink-muted">{eng ? fill(ui.overview.aiLine, { ai: eng.label }) : ""}</p>
            <div dir="auto" className="max-w-lg whitespace-pre-line rounded-[4px] border border-line bg-white px-4 py-3 text-[13.5px] leading-[1.9] text-ink-2">
              {!a ? (
                <span className="inline-flex items-center gap-1 text-ink-muted">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft [animation-delay:240ms]" />
                </span>
              ) : done ? (
                <Highlight text={a.text} />
              ) : (
                <span className="caret">{a.text.slice(0, typed)}</span>
              )}
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-bold text-white" style={{ background: eng?.color ?? "#A79C88" }} aria-hidden="true">
            {eng?.label.slice(0, 1)}
          </span>
        </div>
        {a && done && (
          <p className={`rise mt-auto self-center rounded-[3px] px-3 py-1 text-[12.5px] font-bold ${Number(a.mentioned) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {Number(a.mentioned) ? `✓ ${ui.drawer.named} · #${a.rank}` : `✗ ${ui.drawer.notNamed}`}
          </p>
        )}
      </div>
      {questions.length > 1 && (
        <button onClick={() => setQi((i) => i + 1)} className="self-start rounded-[4px] border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-navy transition hover:bg-slate-100">
          ↻ {ui.overview.nextQ}
        </button>
      )}
    </div>
  );
}
