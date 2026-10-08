"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// true once the surrounding panel has scrolled into view; charts read it to animate from zero
export const InViewCtx = createContext(true);
export const useShown = () => useContext(InViewCtx);

export function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** Spotlight that follows the pointer (pair with the `spot` class). */
export const spotlight = {
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  },
};

/** Fades its content in the first time it enters the screen, and tells charts inside to animate. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div", id }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section"; id?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag ref={ref} id={id} data-in={inView} className={`reveal ${className}`} style={{ ["--d" as string]: `${delay}ms` }}>
      <InViewCtx.Provider value={inView}>{children}</InViewCtx.Provider>
    </Tag>
  );
}

/** A number that counts up when it first appears. */
export function CountUp({ value, decimals, duration = 1100, className }: { value: number; decimals?: number; duration?: number; className?: string }) {
  const shown = useShown();
  const [v, setV] = useState(0);
  const dec = decimals ?? (Number.isInteger(value) ? 0 : 1);
  useEffect(() => {
    if (!shown) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setV(value);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      setV(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shown, value, duration]);
  return <span className={className}>{v.toFixed(dec)}</span>;
}
