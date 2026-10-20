"use client";

import { Pill } from "@/components/forms";
import type { EnquiryListItem } from "@/lib/api/admissions";
import { cn } from "@/lib/utils";

export const formatDay = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** The stage, coloured by open / admitted / lost. */
export function StatusPill({ e }: { e: Pick<EnquiryListItem, "status" | "stage"> }) {
  return <Pill tone={e.status === "won" ? "success" : e.status === "lost" ? "danger" : "primary"}>{e.stage.name}</Pill>;
}

/** Next follow-up date; today in amber, overdue in red. */
export function FollowUpDate({ e }: { e: Pick<EnquiryListItem, "nextFollowUp" | "followUp"> }) {
  if (!e.followUp) return <span className="text-on-surface-variant/50">—</span>;
  return (
    <span className={cn("font-semibold", e.followUp === "overdue" && "text-error", e.followUp === "today" && "text-amber-700")}>
      {e.followUp === "today" ? "Today" : formatDay(e.nextFollowUp)}
      {e.followUp === "overdue" && <span className="ml-1 text-[10px] uppercase tracking-widest">overdue</span>}
    </span>
  );
}
