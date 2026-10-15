"use client";

/**
 * Signed-in layout: sidebar, header (school + user menu) and the page.
 * The sidebar comes from the server: only pages the person's permissions allow (/api/me/access).
 */
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-all duration-200 relative rounded-r-full",
        active ? "text-primary font-bold bg-surface-container-high shadow-sm" : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high/50"
      )}
    >
      <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
        {item.icon}
      </span>
      <span className="text-sm tracking-tight">{item.label}</span>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />}
    </Link>
  );
}

function UserMenu() {
  const { me, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const name = me?.user.displayName ?? "";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const doSignOut = async (everywhere: boolean) => {
    await signOut(everywhere);
    router.replace("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 pl-4 border-l border-outline-variant/30 rounded-lg p-1 hover:bg-surface-container-high/30 transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="text-right">
          <p className="text-sm font-bold text-primary leading-tight">{name}</p>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-tight mt-0.5">
            {me?.roles.map((r) => r.name).join(", ") || me?.user.kind}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-black">{initials}</div>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 bg-surface-lowest rounded-2xl shadow-premium border border-outline-variant/20 py-2 z-50">
          <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-lg">manage_accounts</span>
            My account
          </Link>
          <button role="menuitem" onClick={() => doSignOut(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign out
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirmAll(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-error hover:bg-error-container/30"
          >
            <span className="material-symbols-outlined text-lg">devices</span>
            Sign out on all devices
          </button>
        </div>
      )}

      <Modal isOpen={confirmAll} onClose={() => setConfirmAll(false)} title="Sign out everywhere?">
        <p className="text-sm text-on-surface-variant leading-relaxed">
          You will be signed out on this and every other device (phone, other browsers). Use this if you signed in somewhere you
          don&apos;t trust.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmAll(false)}>
            Cancel
          </Button>
          <Button className="bg-error text-white" onClick={() => doSignOut(true)}>
            Sign out everywhere
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, access } = useAuth();
  const menu = access?.menu ?? [];
  return (
    <div className="flex min-h-screen">
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low flex flex-col py-8 px-4 z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
        <div className="mb-10 px-4">
          <h1 className="text-xl font-black tracking-tight text-primary leading-tight">{me?.school?.name ?? "School ERP"}</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mt-1">School management</p>
        </div>
        <nav className="flex-1 space-y-1 pr-2" aria-label="Main">
          {menu.map((group) => (
            <div key={group.key} className="mb-3">
              {group.label && (
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/40 px-4 mb-2 mt-3">{group.label}</p>
              )}
              {group.items.map((item) => (
                <NavLink key={item.key} item={item} />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col pl-64">
        <header className="fixed top-0 right-0 left-64 h-20 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-12 z-40 border-b border-outline-variant/10">
          <p className="text-sm font-bold text-on-surface-variant/70">{me?.school?.legalName}</p>
          <UserMenu />
        </header>
        <main className="flex-1 pt-28 px-12 pb-20">{children}</main>
      </div>
    </div>
  );
}

/** Page title block used at the top of every screen. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">{title}</h1>
        {description && <p className="text-sm text-on-surface-variant/70 font-medium mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
