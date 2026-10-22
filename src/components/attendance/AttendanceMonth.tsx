"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MyAttendance, showDay, Summary, todayIST } from "@/lib/api/attendance";
import { cn } from "@/lib/utils";

/**
 * A student's attendance for a month: the month's and the session's %, then a calendar or a table
 * (the choice is remembered), with leave and holidays. Used by My Attendance (students / parents) and
 * Student Attendance (class teachers / office).
 */

type Day = NonNullable<MyAttendance["days"]>[number];

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shiftMonth = (m: string, by: number) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + by, 1)).toISOString().slice(0, 7);
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

/** Solid colours per status, so days stand apart at a glance. */
const SOLID: Record<string, string> = {
  P: "bg-emerald-500 text-white border-emerald-600",
  A: "bg-red-500 text-white border-red-600",
  LT: "bg-amber-400 text-amber-950 border-amber-500",
  HD: "bg-orange-400 text-white border-orange-500",
  LV: "bg-sky-500 text-white border-sky-600",
  ML: "bg-violet-500 text-white border-violet-600",
};
const solid = (code: string) => SOLID[code.toUpperCase()] ?? (code.includes("/") ? "bg-teal-400 text-white border-teal-500" : "bg-slate-500 text-white border-slate-600");
const isWeeklyOff = (off: string) => off.startsWith("Weekly off") || off.endsWith("Saturday off");

/** What a day says, in words, for the cell and the table. */
const describe = (d: Day) => {
  if (d.off) return { kind: isWeeklyOff(d.off) ? ("weekly" as const) : ("holiday" as const), title: isWeeklyOff(d.off) ? d.off.replace(/^Weekly off \((.+)\)$/, "$1") : "Holiday", detail: isWeeklyOff(d.off) ? "" : d.off };
  if (d.marks.length) {
    const m = d.marks[0];
    const name = d.marks.length > 1 ? d.marks.map((x) => x.name).join(" / ") : m.name;
    const notes = d.marks.map((x) => x.note).filter(Boolean).join("; ");
    return { kind: "marked" as const, title: name, code: d.marks.length > 1 ? d.marks.map((x) => x.code).join("/") : m.code, detail: [d.leave?.status === "approved" ? `Leave: ${d.leave.reason}` : "", notes].filter(Boolean).join(" · ") };
  }
  if (d.leave) return { kind: "leave" as const, title: d.leave.status === "approved" ? (d.leave.kind === "medical" ? "Medical leave (approved)" : "Leave (approved)") : "Leave asked", detail: d.leave.reason };
  if (d.future) return { kind: "future" as const, title: "", detail: "" };
  return { kind: "unmarked" as const, title: "Not marked", detail: "" };
};

function Stat({ title, s, min }: { title: string; s: Summary; min: number }) {
  const low = s.percent !== null && s.percent < min;
  return (
    <Card>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{title}</p>
      <p className={cn("text-4xl font-black mt-1", s.percent === null ? "text-on-surface-variant/50" : low ? "text-error" : "text-emerald-700")}>{s.percent === null ? "—" : `${s.percent}%`}</p>
      <p className="text-xs text-on-surface-variant mt-2">
        {s.present} present · {s.absent} absent{s.excused ? ` · ${s.excused} on leave` : ""} · of {s.days} day{s.days === 1 ? "" : "s"}
      </p>
      {low && <p className="text-xs font-bold text-error mt-1">Below the school’s minimum of {min}%</p>}
    </Card>
  );
}

function CalendarView({ days, today }: { days: Day[]; today: string }) {
  const lead = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (Day | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {WEEK.map((w) => (
        <div key={w} className="text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 pb-1">
          {w}
        </div>
      ))}
      {cells.map((c, i) => {
        if (!c) return <div key={`x${i}`} />;
        const d = describe(c);
        const isToday = c.date === today;
        return (
          <div
            key={c.date}
            title={[d.title, d.detail].filter(Boolean).join(" — ")}
            className={cn(
              "relative h-16 sm:h-20 rounded-xl border p-1.5 sm:p-2 flex flex-col justify-between overflow-hidden",
              d.kind === "marked" && solid(d.code!),
              d.kind === "leave" && (c.leave?.status === "approved" ? "border-2 border-dashed border-sky-500 bg-sky-50 text-sky-800" : "border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800"),
              d.kind === "holiday" && "bg-rose-50 border-rose-200 text-rose-700",
              d.kind === "weekly" && "bg-surface-container text-on-surface-variant/60 border-transparent",
              d.kind === "unmarked" && "bg-white border-outline-variant/40 text-on-surface-variant",
              d.kind === "future" && "bg-white/60 border-outline-variant/15 text-on-surface-variant/40",
              isToday && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <span className="text-xs sm:text-sm font-black leading-none">{Number(c.date.slice(8))}</span>
            <span className="text-[9px] sm:text-[11px] font-bold leading-tight line-clamp-2">{d.kind === "holiday" ? d.detail : d.title}</span>
            {isToday && <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-widest opacity-80">Today</span>}
          </div>
        );
      })}
    </div>
  );
}

function TableView({ days, today }: { days: Day[]; today: string }) {
  const shown = days.filter((d) => !d.future || d.leave);
  return (
    <div className="overflow-x-auto -mx-5 sm:mx-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
            <th className="px-5 py-2 font-bold">Date</th>
            <th className="px-5 py-2 font-bold">Attendance</th>
            <th className="px-5 py-2 font-bold">Details</th>
          </tr>
        </thead>
        <tbody>
          {[...shown].reverse().map((c) => {
            const d = describe(c);
            return (
              <tr key={c.date} className={cn("border-t border-outline-variant/10", c.date === today && "bg-primary/5")}>
                <td className="px-5 py-2.5 whitespace-nowrap">
                  <span className="font-semibold">{showDay(c.date, { day: "numeric", month: "short" })}</span>
                  <span className="text-xs text-on-surface-variant ml-2">{showDay(c.date, { weekday: "short" })}</span>
                  {c.date === today && <span className="ml-2 text-[10px] font-black uppercase text-primary">Today</span>}
                </td>
                <td className="px-5 py-2.5">
                  {d.kind === "marked" ? (
                    <span className={cn("inline-block rounded-full border px-3 py-0.5 text-xs font-bold", solid(d.code!))}>{d.title}</span>
                  ) : d.kind === "leave" ? (
                    <span className={cn("inline-block rounded-full border border-dashed px-3 py-0.5 text-xs font-bold", c.leave?.status === "approved" ? "border-sky-500 bg-sky-50 text-sky-800" : "border-amber-400 bg-amber-50 text-amber-800")}>{d.title}</span>
                  ) : d.kind === "holiday" ? (
                    <span className="text-xs font-bold text-rose-700">Holiday</span>
                  ) : d.kind === "weekly" ? (
                    <span className="text-xs text-on-surface-variant/70">No school ({d.title})</span>
                  ) : (
                    <span className="text-xs text-on-surface-variant/70">{d.title}</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-xs text-on-surface-variant">{d.detail}</td>
              </tr>
            );
          })}
          {!shown.length && (
            <tr>
              <td colSpan={3} className="px-5 py-10 text-center text-on-surface-variant/70">
                Nothing for this month yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const VIEW_KEY = "attendance-month-view";

export function AttendanceMonth({ data: d, month, onMonth }: { data: MyAttendance; month: string; onMonth: (m: string) => void }) {
  const [view, setView] = useState<"calendar" | "table">("calendar");
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "table" || v === "calendar") setView(v);
    } catch {
      /* no storage: calendar */
    }
  }, []);
  const choose = (v: "calendar" | "table") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not remembered */
    }
  };
  const today = todayIST();
  const days = d.days!;
  const counts = new Map<string, { name: string; n: number }>();
  for (const day of days)
    for (const m of day.marks) {
      const c = counts.get(m.code) ?? { name: m.name, n: 0 };
      c.n++;
      counts.set(m.code, c);
    }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Stat title={monthName(d.month!)} s={d.monthSummary!} min={d.minPercent!} />
        <Stat title={`Session ${d.yearSummary!.year} so far`} s={d.yearSummary!} min={d.minPercent!} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Previous month">
              <span className="material-symbols-outlined align-middle">chevron_left</span>
            </Button>
            <h3 className="font-black text-primary min-w-[150px] text-center">{monthName(d.month!)}</h3>
            <Button variant="secondary" disabled={month >= today.slice(0, 7)} onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Next month">
              <span className="material-symbols-outlined align-middle">chevron_right</span>
            </Button>
          </div>
          <div className="inline-flex rounded-xl bg-surface-container p-1" role="tablist" aria-label="View">
            {(["calendar", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => choose(v)}
                className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold", view === v ? "bg-white text-primary shadow-sm" : "text-on-surface-variant")}
              >
                <span className="material-symbols-outlined text-base">{v === "calendar" ? "calendar_month" : "table_rows"}</span>
                {v === "calendar" ? "Calendar" : "Table"}
              </button>
            ))}
          </div>
        </div>

        {counts.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from(counts.entries()).map(([code, c]) => (
              <span key={code} className={cn("rounded-full border px-3 py-1 text-xs font-bold", solid(code))}>
                {c.name}: {c.n}
              </span>
            ))}
          </div>
        )}

        {view === "calendar" ? <CalendarView days={days} today={today} /> : <TableView days={days} today={today} />}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-xs text-on-surface-variant">
          {d.statuses!.map((s) => (
            <span key={s.code} className="flex items-center gap-1.5">
              <span className={cn("inline-block w-3.5 h-3.5 rounded border", solid(s.code))} />
              {s.name}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded border-2 border-dashed border-sky-500 bg-sky-50" />
            Leave approved (coming)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded border-2 border-dashed border-amber-400 bg-amber-50" />
            Leave asked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded border border-rose-200 bg-rose-50" />
            Holiday
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded bg-surface-container" />
            No school
          </span>
        </div>
      </Card>
    </>
  );
}
