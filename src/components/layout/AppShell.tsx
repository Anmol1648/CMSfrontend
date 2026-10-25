"use client";

/**
 * Signed-in layout: sidebar, header (school + user menu) and the page.
 * The sidebar comes from the server: only pages the person's permissions allow (/api/me/access).
 */
import { UserPhoto } from "@/components/account/UserPhoto";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PoweredBy } from "@/components/branding/PoweredBy";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logoSrc } from "@/lib/api/school";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useQuery } from "@tanstack/react-query";
import { noticesApi } from "@/lib/api/notices";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FeedbackGate } from "@/components/feedback/FeedbackGate";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { PlatformNotices } from "@/components/platform/PlatformNotices";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TermsSwap } from "./TermsSwap";


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

  const doSignOut = async (everywhere: boolean) => {
    await signOut(everywhere);
    router.replace("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 sm:pl-4 sm:border-l border-outline-variant/30 rounded-lg p-1 hover:bg-surface-container-high/30 transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-primary leading-tight">{name}</p>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-tight mt-0.5">
            {me?.roles.map((r) => r.name).join(", ") || me?.user.kind}
          </p>
        </div>
        <UserPhoto name={name} avatarUrl={me?.user.avatarUrl} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-2rem)] bg-surface-lowest rounded-2xl shadow-premium border border-outline-variant/20 py-2 z-50">
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
  const pathname = usePathname();
  // The one item to light up: the longest link the page is under (/questions/chapters is "Chapters", not "Question Bank").
  const activeHref =
    menu
      .flatMap((g) => g.items.map((i) => i.href))
      .filter((h) => (h === "/home" ? pathname === "/" || pathname === h : pathname === h || pathname.startsWith(`${h}/`)))
      .sort((a, b) => b.length - a.length)[0] ?? null;
  // Notices not opened yet: the number next to "Notices" (checked every few minutes).
  const hasNotices = menu.some((g) => g.items.some((i) => i.key === "notices"));
  const unread = useQuery({ queryKey: ["notices-unread"], queryFn: noticesApi.unread, enabled: hasNotices, refetchInterval: 3 * 60_000, staleTime: 60_000 });
  // Phones and tablets: the sidebar is a drawer opened from the top bar.
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [pathname]);
  const closeNav = useCallback(() => setNavOpen(false), []);
  // Only phones and tablets have the sidebar as a drawer (on a laptop it is always there).
  const openNav = useCallback(() => window.matchMedia("(max-width: 1023px)").matches && setNavOpen(true), []);
  useEffect(() => {
    if (!navOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen">
      <TermsSwap />
      {navOpen && <div className="fixed inset-0 z-[55] bg-slate-900/40 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden />}
      <aside
        id="main-nav"
        className={cn(
          "h-screen w-72 lg:w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low flex flex-col py-6 lg:py-8 px-4 z-[60] lg:z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] transition-transform duration-200",
          navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-8 lg:mb-10 px-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {me?.school?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc(me.school.logoUrl)!} alt="" className="w-12 h-12 object-contain mb-3" />
            )}
            <h1 className="text-xl font-black tracking-tight text-primary leading-tight break-words">{me?.school?.name ?? "School ERP"}</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mt-1">School management</p>
          </div>
          <button type="button" onClick={() => setNavOpen(false)} className="lg:hidden -mr-2 p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high" aria-label="Close menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <SidebarNav menu={menu} activeHref={activeHref} onNavigate={closeNav} onOpenNav={openNav} badges={{ notices: unread.data?.unread }} />
        <PoweredBy compact className="mt-6 px-4 pt-5 border-t border-outline-variant/15" />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col lg:pl-64">
        <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 lg:h-20 bg-surface/80 backdrop-blur-xl flex justify-between items-center gap-3 px-4 sm:px-6 lg:px-12 z-40 border-b border-outline-variant/10">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="lg:hidden -ml-2 p-2 rounded-full text-primary hover:bg-surface-container-high"
              aria-label="Open menu"
              aria-controls="main-nav"
              aria-expanded={navOpen}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <p className="text-sm font-bold text-on-surface-variant/70 truncate">
              <span className="lg:hidden">{me?.school?.name}</span>
              <span className="hidden lg:inline">{me?.school?.legalName}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 min-w-0 pt-20 lg:pt-28 px-4 sm:px-6 lg:px-12 pb-16 lg:pb-20">
          <PlatformNotices />
          <FeedbackGate>{children}</FeedbackGate>
        </main>
        {menu.some((g) => g.items.some((i) => i.key === "assistant")) && pathname !== "/assistant" && <AssistantLauncher />}
      </div>
    </div>
  );
}

/** Page title block used at the top of every screen. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6 mb-6 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight break-words">{title}</h1>
        {description && <p className="text-sm text-on-surface-variant/70 font-medium mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
