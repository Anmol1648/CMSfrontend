"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { dashboardApi, DashboardWidget, Tone, WidgetData } from "@/lib/api/dashboard";

const TONE_TEXT: Record<Tone, string> = { good: "text-emerald-700", warn: "text-amber-700", bad: "text-error", neutral: "text-primary" };
const TONE_BAR: Record<Tone, string> = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-error", neutral: "bg-primary" };
const TONE_DOT: Record<Tone, string> = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-error", neutral: "bg-outline-variant" };
/** Slices of a donut, in a steady order of distinct colours. */
const SLICES = ["#1A365D", "#2B6CB0", "#38A169", "#D69E2E", "#DD6B20", "#805AD5", "#E53E3E", "#319795"];

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const short = (n: number) => (n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(Math.round(n)));

function Stat({ d }: { d: WidgetData }) {
  const tone = d.tone ?? "neutral";
  return (
    <div className="flex h-full flex-col">
      <p className={cn("text-3xl sm:text-4xl font-extrabold tracking-tight", TONE_TEXT[tone])}>{d.value}</p>
      {d.caption && <p className="text-xs text-on-surface-variant/70 mt-1">{d.caption}</p>}
      {d.progress && d.progress.max > 0 && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-surface-container overflow-hidden">
            <div className={cn("h-full rounded-full", TONE_BAR[tone === "bad" ? "neutral" : tone])} style={{ width: `${Math.min(100, (d.progress.value / d.progress.max) * 100)}%` }} />
          </div>
          {d.progress.label && <p className="text-[11px] text-on-surface-variant/70 mt-1">{d.progress.label}</p>}
        </div>
      )}
      {!!d.sub?.length && (
        <div className="mt-auto pt-3 grid grid-cols-3 gap-2">
          {d.sub.map((s) => (
            <div key={s.label} className="min-w-0">
              <p className={cn("text-sm font-bold truncate", s.tone ? TONE_TEXT[s.tone] : "text-on-surface")}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 truncate">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {d.action && (
        <Link href={d.action.href} className="mt-3 inline-flex w-fit items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90">
          {d.action.label}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

function Bars({ d }: { d: WidgetData }) {
  const points = d.points ?? [];
  const max = Math.max(1, ...points.map((p) => p.value));
  const dense = points.length > 14;
  return (
    <div>
      <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={d.caption ?? "Chart"}>
        {points.map((p, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end min-w-0">
            <div className={cn("w-full rounded-t-[3px] transition-colors", p.value ? "bg-primary/80 group-hover:bg-primary" : "bg-surface-container")} style={{ height: `${Math.max(p.value ? 4 : 2, (p.value / max) * 100)}%` }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-on-surface px-2 py-1 text-[10px] font-bold text-white group-hover:block">
              {p.hint ?? p.label}: {d.money ? money(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {points.map((p, i) => (
          <span key={i} className="flex-1 min-w-0 truncate text-center text-[9px] text-on-surface-variant/60">
            {dense ? (i % Math.ceil(points.length / 6) === 0 ? p.label : "") : p.label}
          </span>
        ))}
      </div>
      {d.caption && <p className="text-xs text-on-surface-variant/70 mt-2">{d.caption}</p>}
      {!points.some((p) => p.value) && <p className="text-xs text-on-surface-variant/60 mt-1">Nothing yet.</p>}
      {d.money && points.some((p) => p.value) && <p className="sr-only">Highest {short(max)}</p>}
    </div>
  );
}

function Donut({ d }: { d: WidgetData }) {
  const slices = (d.slices ?? []).filter((s) => s.value > 0);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  if (!total) return <p className="text-sm text-on-surface-variant/70">Nothing yet this month.</p>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="Breakdown">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#EEF2F7" strokeWidth="14" />
        {slices.map((s, i) => {
          const len = (s.value / total) * C;
          const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={SLICES[i % SLICES.length]} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {d.centerLabel && <p className="text-lg font-extrabold text-primary">{d.centerLabel}</p>}
        {slices.map((s, i) => (
          <p key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SLICES[i % SLICES.length] }} />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto font-bold">{d.money ? money(s.value) : s.value}</span>
            <span className="w-9 text-right text-on-surface-variant/60">{Math.round((s.value / total) * 100)}%</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function List({ d }: { d: WidgetData }) {
  const items = d.items ?? [];
  if (!items.length) return <p className="text-sm text-on-surface-variant/70">{d.empty}</p>;
  return (
    <div className="divide-y divide-outline-variant/10 -my-1">
      {items.map((it, i) => {
        const body = (
          <div className="flex items-center gap-3 py-2">
            {it.tone && <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[it.tone])} />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{it.title}</p>
              {it.sub && <p className="text-[11px] text-on-surface-variant/70 truncate">{it.sub}</p>}
            </div>
            {it.meta && <span className={cn("shrink-0 text-xs font-bold", it.tone ? TONE_TEXT[it.tone] : "text-on-surface-variant")}>{it.meta}</span>}
            {it.badge != null && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black", typeof it.badge === "number" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>{it.badge}</span>}
          </div>
        );
        return it.href ? (
          <Link key={i} href={it.href} className="block rounded-lg px-1 hover:bg-surface-container-low">
            {body}
          </Link>
        ) : (
          <div key={i} className="px-1">
            {body}
          </div>
        );
      })}
      {d.more && (
        <Link href={d.more.href} className="block pt-2 text-[11px] font-bold uppercase tracking-widest text-primary hover:opacity-70">
          {d.more.label}
        </Link>
      )}
    </div>
  );
}

const SPAN: Record<DashboardWidget["size"], string> = { sm: "", md: "md:col-span-2", lg: "md:col-span-2 xl:col-span-4" };

/** One widget: title (click through to its page), its own data, refreshed every couple of minutes. */
export function Widget({ w }: { w: DashboardWidget }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["widget", w.key], queryFn: () => dashboardApi.widget(w.key), refetchInterval: 3 * 60_000, staleTime: 60_000, retry: 1 });
  const d = q.data;
  if (d?.hidden) return null;
  const refresh = async () => {
    queryClient.setQueryData(["widget", w.key], await dashboardApi.widget(w.key, true));
  };
  return (
    <Card className={cn("flex flex-col min-w-0", SPAN[w.size])}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {w.href ? (
            <Link href={w.href} className="group inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-primary hover:opacity-80">
              {w.label}
              <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </Link>
          ) : (
            <p className="text-xs font-black uppercase tracking-widest text-primary">{w.label}</p>
          )}
          {d?.note && <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{d.note}</p>}
        </div>
        <button type="button" onClick={refresh} aria-label={`Refresh ${w.label}`} title={d ? `Updated ${new Date(d.updatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · refresh` : "Refresh"} className="shrink-0 rounded-full p-1 text-on-surface-variant/40 hover:bg-surface-container hover:text-primary">
          <span className={cn("material-symbols-outlined text-base", q.isFetching && "animate-spin")}>refresh</span>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {q.isError && <p className="text-sm text-error">Couldn’t load this. Try refresh.</p>}
        {!d && !q.isError && (
          <div className="space-y-2 animate-pulse">
            <div className="h-8 w-24 rounded bg-surface-container" />
            <div className="h-3 w-40 rounded bg-surface-container" />
            <div className="h-3 w-32 rounded bg-surface-container" />
          </div>
        )}
        {d && w.type === "stat" && <Stat d={d} />}
        {d && w.type === "chart" && <Bars d={d} />}
        {d && w.type === "donut" && <Donut d={d} />}
        {d && w.type === "list" && <List d={d} />}
      </div>
    </Card>
  );
}
