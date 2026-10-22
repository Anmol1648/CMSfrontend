"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { useToast } from "@/components/ui/ToastProvider";
import { CorrectionRequest, leaveApi, showDay, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

const TONE: Record<CorrectionRequest["status"], "warning" | "success" | "danger"> = { pending: "warning", approved: "success", rejected: "danger" };
const LABEL: Record<CorrectionRequest["status"], string> = { pending: "Waiting", approved: "Approved", rejected: "Not approved" };

/** A staff member asks the office to correct a day, and sees their requests. */
export function CorrectionBox() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mine = useQuery({ queryKey: ["my-corrections"], queryFn: leaveApi.myCorrections });
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIST());
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setError(null);
    try {
      queryClient.setQueryData(["my-corrections"], await leaveApi.askCorrection({ date, ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}), reason: reason.trim() }));
      showToast("Request sent to the office", "success");
      setOpen(false);
      setReason("");
      setCheckIn("");
      setCheckOut("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card padding="none" className="overflow-hidden mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
        <div>
          <h3 className="font-black text-primary">Correct a day</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Forgot to check in or out, or were on duty elsewhere? Ask the office to put it right.</p>
        </div>
        {!open && (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Ask for a correction
          </Button>
        )}
      </div>
      {open && (
        <div className="px-5 py-4 border-b border-outline-variant/20 bg-surface-container-low/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Day" type="date" value={date} max={todayIST()} onChange={(e) => setDate(e.target.value)} />
            <Input label="I came in at" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            <Input label="I left at" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Forgot to check in; exam duty at another centre" />
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={ask} disabled={reason.trim().length < 3 || (!checkIn && !checkOut)}>
              Send
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {(mine.data ?? []).map((r) => (
            <tr key={r.id} className="border-t border-outline-variant/10 first:border-t-0">
              <td className="px-5 py-2.5 whitespace-nowrap">{showDay(r.date, { weekday: "short", day: "numeric", month: "short" })}</td>
              <td className="px-5 py-2.5 tabular-nums text-xs">
                {r.checkIn ? `in ${r.checkIn}` : ""} {r.checkOut ? `out ${r.checkOut}` : ""}
              </td>
              <td className="px-5 py-2.5 text-xs">{r.reason}</td>
              <td className="px-5 py-2.5">
                <Pill tone={TONE[r.status]}>{LABEL[r.status]}</Pill>
                {r.decisionNote && <p className="text-[11px] text-on-surface-variant/70 mt-1">“{r.decisionNote}”</p>}
              </td>
            </tr>
          ))}
          {mine.data && !mine.data.length && (
            <tr>
              <td className="px-5 py-6 text-center text-xs text-on-surface-variant/70">No requests.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </Card>
  );
}

/** The office's list of waiting correction requests, to approve or turn down. */
export function CorrectionRequests() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const list = useQuery({ queryKey: ["staff-corrections"], queryFn: () => leaveApi.corrections("pending") });
  const decide = async (r: CorrectionRequest, approve: boolean) => {
    try {
      queryClient.setQueryData(["staff-corrections"], await leaveApi.decideCorrection(r.id, approve));
      queryClient.invalidateQueries({ queryKey: ["staff-day"] });
      showToast(approve ? `${r.staff.name}: corrected` : `${r.staff.name}: not approved`, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  if (!list.data?.length) return null;
  return (
    <Card padding="none" className="overflow-hidden mb-4 ring-2 ring-amber-200">
      <div className="px-5 py-3 border-b border-outline-variant/20">
        <h3 className="font-black text-primary">Correction requests waiting · {list.data.length}</h3>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {list.data.map((r) => (
            <tr key={r.id} className="border-t border-outline-variant/10 first:border-t-0 align-top">
              <td className="px-5 py-2.5">
                <p className="font-semibold">{r.staff.name}</p>
                <p className="text-[11px] font-mono text-on-surface-variant/70">{r.staff.employeeCode}</p>
              </td>
              <td className="px-5 py-2.5 whitespace-nowrap">{showDay(r.date, { weekday: "short", day: "numeric", month: "short" })}</td>
              <td className="px-5 py-2.5 text-xs tabular-nums">
                Asks: {r.checkIn ? `in ${r.checkIn}` : ""} {r.checkOut ? `out ${r.checkOut}` : ""}
                <p className="text-on-surface-variant/70">
                  Recorded: {r.recorded.checkIn ? `in ${r.recorded.checkIn}` : "no check-in"}
                  {r.recorded.checkOut ? `, out ${r.recorded.checkOut}` : ""}
                </p>
              </td>
              <td className="px-5 py-2.5 text-xs max-w-[260px]">{r.reason}</td>
              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                <div className="flex justify-end gap-4 text-xs font-bold uppercase tracking-widest">
                  <button type="button" className="text-emerald-700 hover:opacity-70" onClick={() => decide(r, true)}>
                    Approve
                  </button>
                  <button type="button" className="text-error hover:opacity-70" onClick={() => decide(r, false)}>
                    Not approve
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
}
