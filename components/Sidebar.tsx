"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UIText } from "@/lib/ui-text";
import { Icon, type IconName } from "./Icon";

type Item = { href: string; key: keyof UIText["nav"]; icon: IconName; also?: string[] };

const GROUPS: { key: keyof UIText["nav"]; items: Item[] }[] = [
  {
    key: "insights",
    items: [
      { href: "/", key: "overview", icon: "grid" },
      { href: "/competitors", key: "competitors", icon: "trophy", also: ["/compare"] },
      { href: "/queries", key: "queries", icon: "chat", also: ["/prompts"] },
      { href: "/sources", key: "sources", icon: "news" },
      { href: "/accuracy", key: "accuracy", icon: "shield" },
    ],
  },
  {
    key: "act",
    items: [
      { href: "/plan", key: "plan", icon: "rocket" },
      { href: "/site", key: "site", icon: "globe" },
      { href: "/ask", key: "ask", icon: "flask" },
    ],
  },
  {
    key: "data",
    items: [
      { href: "/answers", key: "responses", icon: "list" },
      { href: "/how", key: "how", icon: "book" },
      { href: "/settings", key: "settings", icon: "settings" },
    ],
  },
];

export default function Sidebar({ nav, appName, appSub, footer }: { nav: UIText["nav"]; appName: string; appSub: string; footer: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const isActive = (it: Item) => (it.href === "/" ? path === "/" : [it.href, ...(it.also ?? [])].some((h) => path.startsWith(h)));

  const list = (
    <nav className="flex flex-col gap-6">
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          <p className="mb-2 flex items-center gap-2 px-3 font-display text-[12px] font-semibold tracking-wide text-gold-400/80"><span className="h-px w-3 bg-gold-400/50" />{nav[g.key]}</p>
          {g.items.map((it) => {
            const active = isActive(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-full px-3 py-2 text-[14px] transition-colors ${active ? "bg-gold font-semibold text-navy shadow-glow" : "text-white/70 hover:bg-white/[0.07] hover:text-white"}`}
              >
                <span className={active ? "text-navy" : "text-gold-400/70"}>
                  <Icon name={it.icon} size={17} />
                </span>
                {nav[it.key]}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="pattern-star sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-7 overflow-y-auto bg-navy px-4 py-6 lg:flex">
        <div className="flex flex-col gap-3 px-2">
          <div className="self-start rounded-2xl bg-white px-3 py-2 shadow-glow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ahlibank-logo.png" alt="ahlibank" className="h-9 w-auto" />
          </div>
          <div>
            <p className="font-display text-[17px] font-semibold leading-snug text-white">{appName}</p>
            <p className="mt-0.5 text-[11.5px] text-white/50">{appSub}</p>
          </div>
        </div>
        {list}
        <p className="mt-auto px-3 text-[10.5px] leading-relaxed text-white/40">{footer}</p>
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between bg-navy px-4 py-2.5 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-8 w-auto rounded-md bg-white px-2 py-1" />
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white" aria-label="Menu" aria-expanded={open}>
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && <div className="pattern-star fixed inset-0 top-[52px] z-30 overflow-y-auto bg-navy px-4 pb-8 pt-4 lg:hidden">{list}</div>}
    </>
  );
}
