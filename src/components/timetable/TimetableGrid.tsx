"use client";

import { useState } from "react";
import { Entry, WeekDay } from "@/lib/api/timetable";
import { cn } from "@/lib/utils";

/**
 * A week: a row per school day, a column per period (breaks shown thin). Section view shows the
 * subject and teacher; teacher view shows the subject and class. In a draft, cells can be clicked
 * (to change) and dragged onto another cell of the same section (to swap).
 */

const PALETTE = ["bg-sky-50 border-sky-200", "bg-amber-50 border-amber-200", "bg-emerald-50 border-emerald-200", "bg-rose-50 border-rose-200", "bg-violet-50 border-violet-200", "bg-lime-50 border-lime-200", "bg-orange-50 border-orange-200", "bg-cyan-50 border-cyan-200", "bg-fuchsia-50 border-fuchsia-200", "bg-teal-50 border-teal-200", "bg-indigo-50 border-indigo-200", "bg-yellow-50 border-yellow-200"];
const colour = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

type Pos = { weekday: number; periodNo: number };

export function TimetableGrid({
  days,
  entries,
  view,
  editable = false,
  onCellClick,
  onSwap,
  today,
  marks,
}: {
  days: WeekDay[];
  entries: Entry[];
  view: "section" | "teacher";
  editable?: boolean;
  onCellClick?: (pos: Pos, cell: Entry[]) => void;
  onSwap?: (a: Pos, b: Pos) => void;
  /** Highlight this weekday (1 = Monday). */
  today?: number;
  /** Extra labels on cells, e.g. a substitution: key "weekday:periodNo". */
  marks?: Record<string, string>;
}) {
  const [drag, setDrag] = useState<Pos | null>(null);
  const [over, setOver] = useState<string | null>(null);
  if (!days.length) return <p className="text-sm text-on-surface-variant/70">The school week is not set up yet (Timetable Setup).</p>;
  const longest = days.reduce((a, d) => (d.slots.length > a.slots.length ? d : a), days[0]);
  const at = (weekday: number, periodNo: number) => entries.filter((e) => e.weekday === weekday && e.periodNo === periodNo);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-24" />
            {longest.slots.map((s, i) =>
              s.kind === "break" ? (
                <th key={i} className="w-6 text-[9px] font-bold uppercase text-on-surface-variant/50 [writing-mode:vertical-rl]">
                  {s.label}
                </th>
              ) : (
                <th key={i} className="min-w-[110px] text-left px-2 pb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">P{s.periodNo}</p>
                  <p className="text-[10px] font-normal text-on-surface-variant/60">
                    {s.startTime}–{s.endTime}
                  </p>
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.weekday}>
              <th className={cn("text-left px-2 text-[11px] font-black uppercase tracking-widest", d.weekday === today ? "text-primary" : "text-on-surface-variant/70")}>{d.name.slice(0, 3)}</th>
              {longest.slots.map((s, i) => {
                if (s.kind === "break") return <td key={i} className="bg-surface-container-low/60 rounded" />;
                const periodNo = s.periodNo!;
                if (!d.periods.some((p) => p.periodNo === periodNo)) return <td key={i} />;
                const cell = at(d.weekday, periodNo);
                const key = `${d.weekday}:${periodNo}`;
                const draggable = editable && !!onSwap && view === "section";
                return (
                  <td
                    key={i}
                    draggable={draggable && cell.length > 0}
                    onDragStart={() => setDrag({ weekday: d.weekday, periodNo })}
                    onDragOver={(e) => {
                      if (!draggable || !drag) return;
                      e.preventDefault();
                      setOver(key);
                    }}
                    onDragLeave={() => setOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOver(null);
                      if (drag && (drag.weekday !== d.weekday || drag.periodNo !== periodNo)) onSwap?.(drag, { weekday: d.weekday, periodNo });
                      setDrag(null);
                    }}
                    onClick={() => onCellClick?.({ weekday: d.weekday, periodNo }, cell)}
                    className={cn(
                      "align-top rounded-lg border px-2 py-1.5 h-[58px]",
                      cell.length ? colour(cell[0].subject.id) : "border-dashed border-outline-variant/30 bg-white",
                      onCellClick && "cursor-pointer hover:ring-2 hover:ring-primary/20",
                      draggable && cell.length > 0 && "cursor-grab",
                      over === key && "ring-2 ring-primary",
                      d.weekday === today && "shadow-sm"
                    )}
                  >
                    {cell.length === 0 ? (
                      <span className="text-[10px] text-on-surface-variant/40">Free</span>
                    ) : (
                      cell.map((e) => (
                        <div key={e.id} className={cn(cell.length > 1 && "border-b border-black/5 last:border-0 pb-0.5 mb-0.5")}>
                          <p className="font-bold text-primary leading-tight truncate" title={e.subject.name}>
                            {cell.length > 1 ? e.subject.code ?? e.subject.name : e.subject.name}
                            {e.locked && editable && <span className="material-symbols-outlined text-[11px] align-middle ml-0.5 text-on-surface-variant/50">lock</span>}
                          </p>
                          <p className="text-[10px] text-on-surface-variant truncate">
                            {view === "section" ? e.staff?.name ?? <span className="text-error">no teacher</span> : e.section.label}
                            {e.room ? ` · ${e.room.code ?? e.room.name}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                    {marks?.[key] && <p className="mt-0.5 text-[10px] font-bold text-amber-700">{marks[key]}</p>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
