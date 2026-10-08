// Small "?" that explains a metric in plain words (hover on desktop, tap on mobile)
export default function InfoTip({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold ${light ? "bg-white/15 text-white" : "bg-slate-100 text-ink-muted"} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full start-1/2 z-30 mb-2 hidden w-56 max-w-[70vw] -translate-x-1/2 rounded-xl bg-ink-900 px-3 py-2 text-start text-[12.5px] font-normal normal-case leading-relaxed tracking-normal text-white shadow-pop group-hover:block group-focus-within:block rtl:translate-x-1/2"
      >
        {text}
      </span>
    </span>
  );
}
