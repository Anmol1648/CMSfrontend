"use client";

import { Fragment, useState } from "react";
import { Pill } from "@/components/forms";
import { rupees, StudentDues } from "@/lib/api/fees";
import { cn } from "@/lib/utils";

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A student's instalments: due date, fees after concessions, paid, fine, balance; heads on click. */
export function DuesTable({
  dues,
  selectable = false,
  selected = [],
  onSelect,
}: {
  dues: StudentDues;
  selectable?: boolean;
  selected?: string[];
  onSelect?: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!dues.instalments.length) return <p className="text-sm text-on-surface-variant/70">No fees are set for this student&apos;s class this year (Fees → Fee Setup).</p>;
  const toggle = (id: string) => onSelect?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
            {selectable && <th className="py-2 w-8" />}
            <th className="py-2 font-bold">Instalment</th>
            <th className="py-2 font-bold">Due</th>
            <th className="py-2 font-bold text-right">Fees</th>
            <th className="py-2 font-bold text-right">Fine</th>
            <th className="py-2 font-bold text-right">Paid</th>
            <th className="py-2 font-bold text-right">Balance</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {dues.instalments.map((i) => (
            <Fragment key={i.id}>
              <tr className={cn("border-t border-outline-variant/10", i.overdue && "bg-error-container/10")}>
                {selectable && (
                  <td className="py-2.5">
                    <input type="checkbox" disabled={i.balance <= 0} checked={selected.includes(i.id)} onChange={() => toggle(i.id)} className="accent-[#1A365D] h-4 w-4" aria-label={`Pay ${i.name}`} />
                  </td>
                )}
                <td className="py-2.5">
                  <button type="button" onClick={() => setOpen(open === i.id ? null : i.id)} className="font-bold text-primary hover:underline text-left">
                    {i.name}
                    <span className="material-symbols-outlined text-base align-middle ml-1">{open === i.id ? "expand_less" : "expand_more"}</span>
                  </button>
                </td>
                <td className="py-2.5">{fmt(i.dueDate)}</td>
                <td className="py-2.5 text-right">{rupees(i.net)}</td>
                <td className="py-2.5 text-right">{i.fine.charged ? rupees(i.fine.charged - i.fine.waived) : "—"}</td>
                <td className="py-2.5 text-right text-emerald-700">{i.paid ? rupees(i.paid) : "—"}</td>
                <td className="py-2.5 text-right font-black">{i.balance > 0 ? rupees(i.balance) : "—"}</td>
                <td className="py-2.5 text-right">{i.balance <= 0 ? <Pill tone="success">Paid</Pill> : i.overdue ? <Pill tone="danger">Overdue</Pill> : i.paid ? <Pill tone="warning">Part paid</Pill> : null}</td>
              </tr>
              {open === i.id && (
                <tr>
                  <td colSpan={selectable ? 8 : 7} className="pb-3">
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs bg-surface-container-low/60 rounded-lg">
                      <thead>
                        <tr className="text-left text-on-surface-variant/60">
                          <th className="px-3 py-1.5 font-bold">Head</th>
                          <th className="px-3 py-1.5 font-bold text-right">Amount</th>
                          <th className="px-3 py-1.5 font-bold text-right">Concession</th>
                          <th className="px-3 py-1.5 font-bold text-right">Changed</th>
                          <th className="px-3 py-1.5 font-bold text-right">Payable</th>
                          <th className="px-3 py-1.5 font-bold text-right">Paid</th>
                          <th className="px-3 py-1.5 font-bold text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {i.lines.map((l) => (
                          <tr key={l.feeHeadId} className="border-t border-outline-variant/10">
                            <td className="px-3 py-1.5">{l.head}</td>
                            <td className="px-3 py-1.5 text-right">{rupees(l.gross)}</td>
                            <td className="px-3 py-1.5 text-right">{l.concession ? `−${rupees(l.concession)}` : "—"}</td>
                            <td className="px-3 py-1.5 text-right">{l.adjustment ? (l.adjustment > 0 ? `+${rupees(l.adjustment)}` : `−${rupees(-l.adjustment)}`) : "—"}</td>
                            <td className="px-3 py-1.5 text-right">{rupees(l.net)}</td>
                            <td className="px-3 py-1.5 text-right">{l.paid ? rupees(l.paid) : "—"}</td>
                            <td className="px-3 py-1.5 text-right font-bold">{l.balance > 0 ? rupees(l.balance) : "—"}</td>
                          </tr>
                        ))}
                        {i.fine.charged > 0 && (
                          <tr className="border-t border-outline-variant/10">
                            <td className="px-3 py-1.5">Late fine</td>
                            <td className="px-3 py-1.5 text-right">{rupees(i.fine.charged)}</td>
                            <td className="px-3 py-1.5 text-right">—</td>
                            <td className="px-3 py-1.5 text-right">{i.fine.waived ? `−${rupees(i.fine.waived)} waived` : "—"}</td>
                            <td className="px-3 py-1.5 text-right">{rupees(Math.max(0, i.fine.charged - i.fine.waived))}</td>
                            <td className="px-3 py-1.5 text-right">{i.fine.paid ? rupees(i.fine.paid) : "—"}</td>
                            <td className="px-3 py-1.5 text-right font-bold">{i.fine.balance > 0 ? rupees(i.fine.balance) : "—"}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {dues.concessions.length > 0 && <p className="mt-3 text-xs text-on-surface-variant">Concessions: {dues.concessions.map((c) => `${c.name}${c.automatic ? " (automatic)" : ""}`).join(" · ")}</p>}
    </div>
  );
}
