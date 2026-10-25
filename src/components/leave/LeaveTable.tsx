"use client";

import { Pill } from "@/components/forms";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { dayCount, LEAVE_STATUS, leaveApi, leaveDates, StaffLeave } from "@/lib/api/leave";
import { CustomValuesInline } from "@/components/forms/CustomFields";

/** Opens a request's certificate in a new tab (fetched with the person's login). */
export const openAttachment = async (id: string, onError: (m: string) => void) => {
  try {
    window.open(await authedImageUrl(leaveApi.attachmentPath(id)), "_blank", "noopener");
  } catch (err) {
    onError(errorMessage(err));
  }
};

/** Where a request stands, in words: waiting for whom, or who decided and their note. */
export function LeaveStatusCell({ l }: { l: StaffLeave }) {
  return (
    <>
      <Pill tone={LEAVE_STATUS[l.status].tone}>{LEAVE_STATUS[l.status].label}</Pill>
      {l.status === "pending" && l.waitingFor && <p className="text-[11px] text-on-surface-variant/70 mt-1">with {l.waitingFor}</p>}
      {l.first && <p className="text-[11px] text-on-surface-variant/70 mt-1">recommended by {l.first.by}</p>}
      {l.decided && <p className="text-[11px] text-on-surface-variant/70 mt-1">by {l.decided.by ?? "—"}</p>}
      {l.decided?.note && <p className="text-[11px] text-on-surface-variant/70">“{l.decided.note}”</p>}
      {l.cancelled && <p className="text-[11px] text-on-surface-variant/70 mt-1">by {l.cancelled.by ?? "—"}</p>}
    </>
  );
}

/** A list of leave (own or everyone's) with cancelling where allowed. */
export function LeaveTable({ leaves, showStaff = false, empty, onChanged }: { leaves: StaffLeave[]; showStaff?: boolean; empty: string; onChanged: () => void }) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const cancel = async (l: StaffLeave) => {
    const started = l.status === "approved" && l.from <= new Date().toISOString().slice(0, 10);
    if (
      !(await confirm({
        title: `Cancel ${l.type.name}, ${leaveDates(l)}?`,
        message: l.status === "approved" ? (started ? "It has started: the days come off the staff register (they show as not checked in) and the balance goes back." : "The days go back to the balance.") : "The request is withdrawn.",
        confirmLabel: "Cancel leave",
        danger: true,
      }))
    )
      return;
    try {
      await leaveApi.cancel(l.id);
      showToast("Leave cancelled", "success");
      onChanged();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
            {showStaff && <th className="px-5 py-3 font-bold">Staff member</th>}
            <th className="px-5 py-3 font-bold">Leave</th>
            <th className="px-5 py-3 font-bold">Dates</th>
            <th className="px-5 py-3 font-bold">Reason</th>
            <th className="px-5 py-3 font-bold">Status</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {leaves.map((l) => (
            <tr key={l.id} className="border-t border-outline-variant/10 align-top">
              {showStaff && (
                <td className="px-5 py-3">
                  <p className="font-semibold">{l.staff.name}</p>
                  <p className="text-[11px] text-on-surface-variant/70">{[l.staff.employeeCode, l.staff.designation].filter(Boolean).join(" · ") || "—"}</p>
                </td>
              )}
              <td className="px-5 py-3">
                <p className="font-semibold">{l.type.name}</p>
                <p className="text-[11px] text-on-surface-variant/70">{l.type.code}</p>
              </td>
              <td className="px-5 py-3 whitespace-nowrap">
                {leaveDates(l)}
                <p className="text-[11px] text-on-surface-variant/70">
                  {dayCount(l.days)}
                  {l.lwpDays > 0 && ` · ${dayCount(l.lwpDays)} without pay`}
                </p>
              </td>
              <td className="px-5 py-3 max-w-[280px]">
                {l.reason}
                <CustomValuesInline formKey="leave" values={l.custom} />
                {l.hasAttachment && (
                  <button type="button" className="block mt-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => openAttachment(l.id, (m) => showToast(m, "error"))}>
                    Certificate
                  </button>
                )}
              </td>
              <td className="px-5 py-3">
                <LeaveStatusCell l={l} />
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                {l.canCancel && (
                  <button type="button" className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70" onClick={() => cancel(l)}>
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!leaves.length && (
            <tr>
              <td colSpan={showStaff ? 6 : 5} className="px-5 py-12 text-center text-on-surface-variant/70">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
