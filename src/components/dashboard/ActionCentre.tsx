"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { dashboardApi } from "@/lib/api/dashboard";

/** "Waiting for you": a card for each kind of thing waiting on the person, opening where it is done. */
export function ActionCentre() {
  const q = useQuery({ queryKey: ["widget", "__actions"], queryFn: () => dashboardApi.actions(), refetchInterval: 2 * 60_000, staleTime: 60_000, retry: 1 });
  if (q.isError) return null;
  if (!q.data)
    return (
      <div className="mb-6 flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 w-56 shrink-0 animate-pulse rounded-2xl bg-surface-container" />
        ))}
      </div>
    );
  if (!q.data.length)
    return (
      <div className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <span className="material-symbols-outlined text-lg">task_alt</span>
        All clear: nothing is waiting for you.
      </div>
    );
  return (
    <div className="mb-6">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Waiting for you</p>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
        {q.data.map((a) => (
          <Link key={a.key} href={a.href} className={cn("flex w-60 shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 transition hover:shadow-md sm:w-auto sm:min-w-[14rem]", a.tone === "bad" ? "border-error/30 bg-error/5" : "border-amber-300/50 bg-amber-50")}>
            <span className={cn("material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl", a.tone === "bad" ? "bg-error/10 text-error" : "bg-amber-100 text-amber-800")}>{a.icon}</span>
            <span className="min-w-0">
              <span className={cn("block text-xl font-extrabold leading-tight", a.tone === "bad" ? "text-error" : "text-amber-800")}>{a.value}</span>
              <span className="block text-xs font-semibold text-on-surface-variant">{a.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
