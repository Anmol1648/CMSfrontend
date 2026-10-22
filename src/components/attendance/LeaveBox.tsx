"use client";

import { useState } from "react";
import { useCodedList } from "@/components/masters/useCodedList";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { LEAVE_STATUS, leaveApi, showDay, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

/** A student's leave: ask for it (parent / student) and see what was asked and decided. */
export function LeaveBox({ studentId, studentName }: { studentId: string; studentName: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const mine = useQuery({ queryKey: ["my-leave", studentId], queryFn: () => leaveApi.mine(studentId) });
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(todayIST());
  const types = useCodedList("student_leave_type");
  const [kind, setKind] = useState("leave");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setError(null);
    try {
      await leaveApi.apply({ student: studentId, from, to, kind, reason: reason.trim() });
      showToast("Leave asked. The class teacher will look at it.", "success");
      setOpen(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["my-leave", studentId] });
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const cancel = async (id: string) => {
    if (!(await confirm({ title: "Cancel this leave request?", message: "The class teacher will no longer see it.", confirmLabel: "Cancel request", danger: true }))) return;
    try {
      await leaveApi.cancel(id);
      showToast("Request cancelled", "success");
      queryClient.invalidateQueries({ queryKey: ["my-leave", studentId] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  const d = mine.data;
  const earliest = d ? new Date(new Date(`${todayIST()}T00:00:00Z`).getTime() - d.backDays * 86_400_000).toISOString().slice(0, 10) : undefined;

  return (
    <Card padding="none" className="overflow-hidden mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
        <div>
          <h3 className="font-black text-primary">Leave</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Ask for leave for {studentName}. Approved leave doesn’t count against the attendance %.</p>
        </div>
        {d?.canAsk && !open && (
          <Button onClick={() => setOpen(true)}>
            <span className="material-symbols-outlined text-lg align-middle mr-1">event_available</span>
            Ask for leave
          </Button>
        )}
      </div>
      {open && (
        <div className="px-5 py-4 border-b border-outline-variant/20 bg-surface-container-low/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="From" type="date" value={from} min={earliest} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            <Select label="Kind" value={kind} onChange={setKind} options={types.options} />
          </div>
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fever; family function out of station" />
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={ask} disabled={reason.trim().length < 3 || !from || !to}>
              Send
            </Button>
          </div>
        </div>
      )}
      {d && !d.canAsk && <p className="px-5 py-3 text-xs text-on-surface-variant">The school takes leave requests at the office.</p>}
      {mine.isError && (
        <div className="p-5">
          <FormAlert>{errorMessage(mine.error)}</FormAlert>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {(d?.leaves ?? []).map((l) => (
            <tr key={l.id} className="border-t border-outline-variant/10 first:border-t-0 align-top">
              <td className="px-5 py-3 whitespace-nowrap">
                {l.from === l.to ? showDay(l.from) : `${showDay(l.from, { day: "numeric", month: "short" })} – ${showDay(l.to, { day: "numeric", month: "short", year: "numeric" })}`}
                <p className="text-[11px] text-on-surface-variant/70">
                  {l.days} school day{l.days === 1 ? "" : "s"} · {l.kindName}
                </p>
              </td>
              <td className="px-5 py-3">{l.reason}</td>
              <td className="px-5 py-3">
                <Pill tone={LEAVE_STATUS[l.status].tone}>{LEAVE_STATUS[l.status].label}</Pill>
                {l.decisionNote && <p className="text-[11px] text-on-surface-variant/70 mt-1">“{l.decisionNote}”{l.decidedBy ? ` · ${l.decidedBy}` : ""}</p>}
              </td>
              <td className="px-5 py-3 text-right">
                {(l.status === "pending" || (l.status === "approved" && l.from > todayIST())) && (
                  <button type="button" onClick={() => cancel(l.id)} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {d && !d.leaves.length && (
            <tr>
              <td className="px-5 py-8 text-center text-on-surface-variant/70">No leave asked yet.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </Card>
  );
}
