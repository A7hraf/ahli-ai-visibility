"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

type Props = {
  lang: Lang;
  t: { nav: Record<string, string>; appName: string; appSub: string; footer: string };
  demo: boolean;
  demoLabel: string;
  liveLabel: string;
};

const LINKS: { href: string; key: string; icon: IconName }[] = [
  { href: "/", key: "overview", icon: "gauge" },
  { href: "/prompts", key: "prompts", icon: "chat" },
  { href: "/answers", key: "answers", icon: "list" },
  { href: "/sources", key: "sources", icon: "link" },
  { href: "/accuracy", key: "accuracy", icon: "shield" },
  { href: "/site", key: "site", icon: "globe" },
  { href: "/settings", key: "settings", icon: "settings" },
];

export default function Sidebar({ lang, t, demo, demoLabel, liveLabel }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchLang() {
    document.cookie = `lang=${lang === "ar" ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
              active ? "bg-white/10 text-white" : "text-brand-100/80 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className={`${active ? "text-gold-400" : "text-brand-300"}`}>
              <Icon name={l.icon} />
            </span>
            {t.nav[l.key]}
            {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-gold-400" />}
          </Link>
        );
      })}
    </nav>
  );

  const header = (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-12 w-auto" />
      </div>
      <div>
        <p className="font-display text-[17px] font-semibold leading-tight text-white">{t.appName}</p>
        <p className="mt-0.5 text-xs text-brand-300">{t.appSub}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            demo ? "bg-gold/20 text-gold-400" : "bg-good/20 text-emerald-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${demo ? "bg-gold-400" : "bg-emerald-300"}`} />
          {demo ? demoLabel : liveLabel}
        </span>
        <button
          onClick={switchLang}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/10"
          aria-label="Switch language"
        >
          {lang === "ar" ? "English" : "العربية"}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-brand-300/80">{t.footer}</p>
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-navy p-5 lg:flex">
        <div className="flex flex-col gap-8">
          {header}
          {nav}
        </div>
        {footer}
      </aside>

      {/* mobile */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-8 w-auto rounded bg-white px-2 py-1" />
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white" aria-label="Menu" aria-expanded={open}>
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      <div className="h-14 lg:hidden" />
      {open && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between gap-6 overflow-y-auto bg-navy px-5 pb-6 pt-20 lg:hidden">
          {nav}
          {footer}
        </div>
      )}
    </>
  );
}
