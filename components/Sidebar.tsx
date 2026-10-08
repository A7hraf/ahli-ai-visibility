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
    ],
  },
  {
    key: "act",
    items: [
      { href: "/plan", key: "plan", icon: "rocket" },
      { href: "/accuracy", key: "accuracy", icon: "shield" },
      { href: "/site", key: "site", icon: "globe" },
      { href: "/ask", key: "ask", icon: "flask" },
    ],
  },
];

// small links pinned to the bottom of the menu
const FOOT: Item[] = [
  { href: "/answers", key: "responses", icon: "list" },
  { href: "/how", key: "how", icon: "book" },
  { href: "/settings", key: "settings", icon: "settings" },
];

export default function Sidebar({ nav, appName, appSub }: { nav: UIText["nav"]; appName: string; appSub: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const isActive = (it: Item) => (it.href === "/" ? path === "/" : [it.href, ...(it.also ?? [])].some((h) => path.startsWith(h)));

  const list = (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          <p className="mb-1 px-3 text-[11.5px] font-bold text-ink-soft">{nav[g.key]}</p>
          {g.items.map((it) => {
            const active = isActive(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] transition-colors duration-150 ${active ? "bg-navy/[0.06] font-bold text-navy" : "font-medium text-ink-2 hover:bg-slate-100 hover:text-ink"}`}
              >
                {active && <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-gold" aria-hidden="true" />}
                <span className={`transition-transform duration-150 group-hover:scale-110 ${active ? "text-navy" : "text-ink-soft group-hover:text-ink-2"}`}>
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

  const foot = (
    <div className="grid grid-cols-3 gap-1 border-t border-line pt-3">
      {FOOT.map((it) => {
        const active = isActive(it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] leading-tight transition ${active ? "bg-navy/[0.06] font-bold text-navy" : "text-ink-muted hover:bg-slate-100 hover:text-ink"}`}
          >
            <Icon name={it.icon} size={16} />
            {nav[it.key]}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* desktop: pinned to the side, never scrolls with the page */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col gap-5 overflow-hidden border-e border-line bg-white px-3 py-5 lg:flex">
        <Link href="/" className="flex items-center gap-3 px-1">
          <span className="px-1.5 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ahlibank-logo.png" alt="ahlibank" className="h-8 w-auto" />
          </span>
        </Link>
        <div className="-mt-2 px-2">
          <p className="text-[15px] font-bold leading-snug text-ink">{appName}</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">{appSub}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
        {foot}
      </aside>

      {/* mobile */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-2.5 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-8 w-auto" />
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-ink" aria-label="Menu" aria-expanded={open}>
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 top-[53px] z-30 flex flex-col gap-6 overflow-y-auto bg-white px-4 pb-8 pt-4 lg:hidden">
          {list}
          {foot}
        </div>
      )}
    </>
  );
}
