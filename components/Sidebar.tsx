"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UIText } from "@/lib/ui-text";
import type { Role } from "@/lib/session";
import { Icon, type IconName } from "./Icon";

type Item = { href: string; key: keyof UIText["nav"]; icon: IconName; also?: string[]; badge?: boolean };

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
      { href: "/accuracy", key: "accuracy", icon: "shield", badge: true },
      { href: "/site", key: "site", icon: "globe" },
      { href: "/ask", key: "ask", icon: "sparkle" },
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

export interface SideUser {
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
}

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");

export default function Sidebar({ nav, appName, appSub, user, alerts, signout }: { nav: UIText["nav"]; appName: string; appSub: string; user: SideUser; alerts: number; signout: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const isActive = (it: Item) => (it.href === "/" ? path === "/" : [it.href, ...(it.also ?? [])].some((h) => path.startsWith(h)));

  async function out() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  const list = (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          <p className="mb-1 px-2.5 text-[11.5px] font-medium text-ink-soft">{nav[g.key]}</p>
          {g.items.map((it) => {
            const active = isActive(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-2.5 rounded-[4px] px-2.5 py-[9px] text-[14.5px] transition-colors duration-150 ${active ? "bg-gold-100 font-bold text-navy" : "font-medium text-ink-2 hover:bg-slate-100 hover:text-ink"}`}
              >
                <span className={`transition-transform duration-150 group-hover:scale-110 ${active ? "text-gold-600" : "text-ink-soft group-hover:text-ink-2"}`}>
                  <Icon name={it.icon} size={18} />
                </span>
                <span className="flex-1">{nav[it.key]}</span>
                {it.badge && alerts > 0 && <span className="num flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-bad px-1 text-[11px] font-bold text-white">{alerts}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const me = (
    <div className="flex items-center gap-2.5 border-t border-line pt-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-[12.5px] font-bold text-navy" aria-hidden="true">
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-ink" title={user.email}>
          {user.name}
        </p>
        <p className="truncate text-[11.5px] text-ink-muted">{user.roleLabel}</p>
      </div>
      <button onClick={out} title={signout} aria-label={signout} className="rounded-[4px] p-2 text-ink-soft transition hover:bg-slate-100 hover:text-bad">
        <Icon name="logout" size={18} className="rtl:-scale-x-100" />
      </button>
    </div>
  );

  const brand = (
    <>
      <Link href="/" className="block px-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-9 w-auto" />
      </Link>
      <div className="border-b border-line px-1.5 pb-4">
        <p className="font-display text-[20px] leading-none text-ink">{appName}</p>
        <p className="mt-1 text-[11.5px] text-ink-muted">{appSub}</p>
      </div>
    </>
  );

  return (
    <>
      {/* desktop: pinned to the side, never scrolls with the page */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col gap-4 overflow-hidden border-e border-line bg-white px-3.5 pb-4 pt-5 lg:flex">
        {brand}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{list}</div>
        {me}
      </aside>

      {/* mobile */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-2.5 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ahlibank-logo.png" alt="ahlibank" className="h-8 w-auto" />
        <button onClick={() => setOpen(!open)} className="rounded-[4px] p-2 text-ink" aria-label="Menu" aria-expanded={open}>
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-navy/35 lg:hidden" />}
      <aside className={`fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-white px-3.5 pb-4 pt-5 shadow-pop transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "invisible -translate-x-full rtl:translate-x-full"}`} aria-hidden={!open}>
        {brand}
        <div className="flex-1">{list}</div>
        {me}
      </aside>
    </>
  );
}
