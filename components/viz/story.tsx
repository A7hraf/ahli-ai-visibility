"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BRAND_IDX, type Dataset, type DRow } from "@/lib/analytics";
import { fill, type UIText } from "@/lib/ui-text";
import { Highlight } from "./Details";

/* ---------- section bar that follows the page (scrollspy) ---------- */

export function SectionNav({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label={label} className="sticky top-[110px] z-20 -mx-4 overflow-x-auto border-b border-line bg-canvas/95 px-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:top-[57px]">
      <ol className="flex w-max gap-1">
        {items.map((it, i) => {
          const on = active === it.id;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? "true" : undefined}
                className={`relative flex items-center gap-2 whitespace-nowrap px-3 py-3 text-[14px] transition-colors duration-200 ${on ? "font-bold text-navy" : "font-medium text-ink-muted hover:text-ink"}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold ${on ? "bg-navy text-white" : "bg-slate-200 text-ink-2"}`}>{i + 1}</span>
                {it.label}
                <span className={`absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`} />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Numbered chapter heading. */
export function Chapter({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-36 flex-col gap-4">
      <header className="flex items-center gap-3 pt-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-[13px] font-bold text-white">{n}</span>
        <h2 className="text-[20px] font-extrabold leading-tight text-ink">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/* ---------- "see it through the customer's eyes": a live chat preview ---------- */

type Ans = { id: number; text: string; prompt: string; engine: string; mentioned: number; rank: number | null };

export function AnswerPreview({ ds, ui, rows }: { ds: Dataset; ui: UIText; rows: DRow[] }) {
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {ds.engines.map((e) => {
          const ans = answers?.find((x) => x.engine === e.id);
          if (!ans) return null;
          const on = engine === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setEngine(e.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-bold transition-all ${on ? "border-transparent text-white shadow-sm" : "border-line bg-white text-ink-2 hover:bg-slate-50"}`}
              style={on ? { background: e.color } : undefined}
            >
              {e.label}
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${Number(ans.mentioned) ? "bg-good text-white" : "bg-bad text-white"}`}>{Number(ans.mentioned) ? "✓" : "✗"}</span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-[260px] flex-col gap-3 rounded-xl border border-line bg-slate-50 p-4">
        <div className="flex items-end gap-2 self-start">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-[14px] text-navy" aria-hidden="true">
            👤
          </span>
          <div>
            <p className="mb-1 text-[11px] text-ink-muted">{ui.overview.askLine}</p>
            <p dir="auto" className="max-w-md rounded-3xl rounded-es-md bg-navy px-4 py-2.5 text-[14px] text-white shadow-card">
              {q.rs[0] ? ds.prompts[q.p].text : ""}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2 self-end">
          <div className="min-w-0">
            <p className="mb-1 text-end text-[11px] text-ink-muted">{eng ? fill(ui.overview.aiLine, { ai: eng.label }) : ""}</p>
            <div dir="auto" className="max-w-lg whitespace-pre-line rounded-3xl rounded-ee-md bg-white px-4 py-3 text-[13.5px] leading-relaxed text-ink-2 shadow-card">
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white" style={{ background: eng?.color ?? "#A79C88" }} aria-hidden="true">
            {eng?.label.slice(0, 1)}
          </span>
        </div>
        {a && done && (
          <p className={`rise mt-auto self-center rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${Number(a.mentioned) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {Number(a.mentioned) ? `✓ ${ui.drawer.named} · #${a.rank}` : `✗ ${ui.drawer.notNamed}`}
          </p>
        )}
      </div>
      {questions.length > 1 && (
        <button onClick={() => setQi((i) => i + 1)} className="self-start rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-ink transition hover:bg-slate-50">
          ↻ {ui.overview.nextQ}
        </button>
      )}
    </div>
  );
}
