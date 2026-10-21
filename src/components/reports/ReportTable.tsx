"use client";

import { Fragment } from "react";
import { ReportColumn, ReportRow, ReportRun } from "@/lib/api/reports";

const showDate = (v: string) => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00Z` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

export const formatCell = (c: ReportColumn, v: unknown) => {
  if (v === null || v === undefined || v === "") return "";
  if (c.type === "money") return typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : String(v);
  if (c.type === "number") return typeof v === "number" ? v.toLocaleString("en-IN") : String(v);
  if (c.type === "date") return showDate(String(v));
  return String(v);
};

const sum = (rows: ReportRow[], key: string) => rows.reduce((a, r) => a + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);

/** A report on screen: group headings and subtotals when it is grouped, and the grand total. */
export function ReportTable({ run }: { run: ReportRun }) {
  const cols = run.columns;
  const numeric = (c: ReportColumn) => c.type === "money" || c.type === "number";
  const groups: { label: string | null; rows: ReportRow[] }[] = [];
  for (const r of run.rows) {
    const label = run.groupedBy ? String(r.groupLabel ?? "—") : null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }
  const firstTotal = Math.max(1, cols.findIndex((c) => c.total));
  const totalRow = (label: string, count: number, values: Record<string, number>, cls: string) => (
    <tr className={cls}>
      <td colSpan={cols.findIndex((c) => c.total) < 0 ? cols.length : firstTotal} className="px-4 py-2">
        {label} · {count.toLocaleString("en-IN")} {count === 1 ? "row" : "rows"}
      </td>
      {cols.findIndex((c) => c.total) >= 0 &&
        cols.slice(firstTotal).map((c) => (
          <td key={c.key} className={`px-4 py-2 ${numeric(c) ? "text-right" : ""}`}>
            {c.total ? formatCell(c, values[c.key]) : ""}
          </td>
        ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
            {cols.map((c) => (
              <th key={c.key} className={`px-4 py-3 font-bold whitespace-nowrap ${numeric(c) ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g, gi) => (
            <Fragment key={`${g.label}-${gi}`}>
              {g.label !== null && (
                <tr className="bg-primary/5">
                  <td colSpan={cols.length} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
                    {run.groupedBy}: {g.label}
                  </td>
                </tr>
              )}
              {g.rows.map((r, i) => (
                <tr key={i} className="border-t border-outline-variant/10">
                  {cols.map((c) => (
                    <td key={c.key} className={`px-4 py-2 ${numeric(c) ? "text-right tabular-nums" : ""}`}>
                      {formatCell(c, r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {g.label !== null &&
                groups.length > 1 &&
                totalRow(
                  `Total for ${g.label}`,
                  g.rows.length,
                  Object.fromEntries(cols.filter((c) => c.total).map((c) => [c.key, sum(g.rows, c.key)])),
                  "border-t border-outline-variant/30 bg-surface-container-low/60 font-bold text-sm"
                )}
            </Fragment>
          ))}
          {!run.rows.length && (
            <tr>
              <td colSpan={cols.length} className="px-4 py-12 text-center text-on-surface-variant/70">
                Nothing to show for these filters.
              </td>
            </tr>
          )}
        </tbody>
        {run.rows.length > 0 && <tfoot>{totalRow("Grand total", run.count, run.totals, "border-t-2 border-primary font-black text-primary")}</tfoot>}
      </table>
    </div>
  );
}
