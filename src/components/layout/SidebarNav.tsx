"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
}
interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

const OPEN_KEY = "nav-open";
/** More items than this: groups start closed (except the first and the current page's). */
const MANY = 25;

const readOpen = (): Record<string, boolean> | null => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? "null");
  } catch {
    return null;
  }
};
const writeOpen = (v: Record<string, boolean>) => {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(v));
  } catch {
    /* private window: remembered until the page is closed */
  }
};

function NavLink({ item, onNavigate, badge, active, highlighted }: { item: NavItem; onNavigate?: () => void; badge?: number; active: boolean; highlighted?: boolean }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-all duration-200 relative rounded-r-full",
        active ? "text-primary font-bold bg-surface-container-high shadow-sm" : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high/50",
        highlighted && !active && "bg-surface-container-high/70 text-primary"
      )}
    >
      <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
        {item.icon}
      </span>
      <span className="text-sm tracking-tight flex-1">{item.label}</span>
      {!!badge && <span className="min-w-[20px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-black text-white">{badge > 99 ? "99+" : badge}</span>}
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />}
    </Link>
  );
}

/**
 * The sidebar's pages: a search box (Ctrl+K or / from anywhere; arrows and Enter to open) and groups
 * that open and close. Someone with many pages starts with groups closed (the first one and the
 * current page's open); each person's choice is remembered in their browser.
 */
export function SidebarNav({ menu, activeHref, onNavigate, onOpenNav, badges = {} }: { menu: NavGroup[]; activeHref: string | null; onNavigate: () => void; onOpenNav: () => void; badges?: Record<string, number | undefined> }) {
  const router = useRouter();
  const search = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const total = menu.reduce((a, g) => a + g.items.length, 0);
  const activeGroup = menu.find((g) => g.items.some((i) => i.href === activeHref))?.key;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // First load: what the person chose before, else open or closed by how many pages they have.
  useEffect(() => {
    const saved = readOpen();
    const many = total > MANY;
    setOpen(Object.fromEntries(menu.map((g, n) => [g.key, saved?.[g.key] ?? (!many || n === 0)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.map((g) => g.key).join(",")]);
  // The current page's group opens.
  useEffect(() => {
    if (activeGroup) setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);

  // Ctrl+K or / (when not typing somewhere) goes to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        onOpenNav();
        setTimeout(() => search.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpenNav]);

  const t = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      t
        ? menu.map((g) => ({ ...g, items: g.label.toLowerCase().includes(t) ? g.items : g.items.filter((i) => i.label.toLowerCase().includes(t)) })).filter((g) => g.items.length)
        : menu,
    [menu, t]
  );
  const flat = shown.flatMap((g) => g.items);
  useEffect(() => setHi(0), [t]);

  const toggle = (key: string) =>
    setOpen((o) => {
      const next = { ...o, [key]: !o[key] };
      writeOpen(next);
      return next;
    });
  const setAll = (v: boolean) => {
    const next = Object.fromEntries(menu.map((g) => [g.key, v]));
    writeOpen(next);
    setOpen(next);
  };

  return (
    <div className="flex-1 pr-2">
      <div className="relative mb-3 px-2">
        <span className="material-symbols-outlined pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/60">search</span>
        <input
          ref={search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, flat.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && flat[hi]) {
              e.preventDefault();
              router.push(flat[hi].href);
              setQ("");
              onNavigate();
            } else if (e.key === "Escape") {
              setQ("");
              search.current?.blur();
            }
          }}
          placeholder="Search menu"
          aria-label="Search the menu"
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-2 pl-9 pr-12 text-sm focus:border-primary focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-outline-variant/40 px-1.5 text-[10px] text-on-surface-variant/70 lg:block">Ctrl K</kbd>
      </div>
      {!t && menu.length > 2 && (
        <div className="mb-2 flex justify-end gap-3 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
          <button type="button" onClick={() => setAll(true)} className="hover:text-primary">
            Expand all
          </button>
          <button type="button" onClick={() => setAll(false)} className="hover:text-primary">
            Collapse all
          </button>
        </div>
      )}
      <nav className="space-y-1" aria-label="Main">
        {shown.map((group) => {
          const isOpen = t ? true : (open[group.key] ?? true);
          const headed = !!group.label;
          return (
            <div key={group.key} className="mb-1">
              {headed && (
                <button type="button" onClick={() => !t && toggle(group.key)} aria-expanded={isOpen} className="group flex w-full items-center gap-2 px-4 pb-1 pt-3 text-left">
                  <span className="flex-1 text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/50 group-hover:text-primary">{group.label}</span>
                  {!isOpen && <span className="rounded-full bg-surface-container-high px-1.5 text-[10px] font-bold text-on-surface-variant/70">{group.items.length}</span>}
                  {!t && <span className={cn("material-symbols-outlined text-base text-on-surface-variant/50 transition-transform", isOpen ? "rotate-0" : "-rotate-90")}>expand_more</span>}
                </button>
              )}
              {(isOpen || !headed) &&
                group.items.map((item) => (
                  <NavLink key={item.key} item={item} active={item.href === activeHref} highlighted={!!t && flat[hi]?.key === item.key} onNavigate={() => (setQ(""), onNavigate())} badge={badges[item.key]} />
                ))}
            </div>
          );
        })}
        {t && !flat.length && <p className="px-4 py-3 text-sm text-on-surface-variant">Nothing in your menu matches “{q}”.</p>}
      </nav>
    </div>
  );
}
