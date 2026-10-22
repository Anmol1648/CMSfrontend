"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { ApprovalItem, dayCount, leaveApi, leaveDates } from "@/lib/api/leave";
import { LeaveStatusCell, openAttachment } from "@/components/leave/LeaveTable";

/** One request to decide: who, what, the balance, who else is away and the periods to cover. */
function RequestCard({ r, onDecide }: { r: ApprovalItem; onDecide: (approve: boolean) => void }) {
  const { showToast } = useToast();
  const b = r.balance;
  // What is left after every waiting request (this one too) is below zero.
  const short = !!b && !b.unlimited && b.available < 0;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-extrabold text-on-surface">{r.staff.name}</p>
          <p className="text-xs text-on-surface-variant/70">{[r.staff.employeeCode, r.staff.designation, r.staff.department].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary">
            {r.type.name} · {dayCount(r.days)}
          </p>
          <p className="text-sm">{leaveDates(r)}</p>
          {r.lwpDays > 0 && <p className="text-xs font-bold text-amber-700">{dayCount(r.lwpDays)} without pay (beyond the balance)</p>}
        </div>
      </div>
      <p className="text-sm">
        <span className="text-on-surface-variant/60">Reason: </span>
        {r.reason}
        {r.hasAttachment && (
          <button type="button" className="ml-3 text-[11px] font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => openAttachment(r.id, (m) => showToast(m, "error"))}>
            Certificate
          </button>
        )}
      </p>
      <div className="grid gap-3 md:grid-cols-3 text-xs">
        <div className="rounded-xl bg-surface-container-low p-3">
          <p className="font-black uppercase tracking-widest text-on-surface-variant/60 text-[10px] mb-1">Balance</p>
          {!b ? "—" : b.unlimited ? `${b.taken} taken this year` : `${b.balance} left${b.pending ? `, of which ${b.pending} asked (this included)` : ""}`}
          {short && <p className="text-error font-bold mt-1">More than the balance</p>}
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <p className="font-black uppercase tracking-widest text-on-surface-variant/60 text-[10px] mb-1">Also away then</p>
          {r.away.length ? r.away.map((a, i) => <p key={i}>{a.name}{a.department ? ` (${a.department})` : ""} · {leaveDates(a)}{a.status === "pending" ? " · asked" : ""}</p>) : "Nobody"}
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <p className="font-black uppercase tracking-widest text-on-surface-variant/60 text-[10px] mb-1">Periods to cover</p>
          {r.periods ? `${r.periods} period${r.periods === 1 ? "" : "s"}: they go to Substitution when approved` : "None"}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-on-surface-variant/70">
          Asked {new Date(r.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          {r.appliedBy && r.appliedBy !== r.staff.name ? ` by ${r.appliedBy}` : ""}
          {r.twoSteps && (r.stage === 1 ? " · step 1 of 2" : r.first ? ` · recommended by ${r.first.by}${r.first.note ? `: “${r.first.note}”` : ""}` : "")}
        </span>
        {r.canDecide && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onDecide(false)}>
              Not approve
            </Button>
            <Button onClick={() => onDecide(true)}>{r.twoSteps && r.stage === 1 ? "Recommend" : "Approve"}</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function Approvals() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const [deciding, setDeciding] = useState<{ r: ApprovalItem; approve: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useQuery({ queryKey: ["leave-approvals", tab], queryFn: () => leaveApi.approvals(tab) });

  const decide = async () => {
    if (!deciding) return;
    setBusy(true);
    try {
      const r = await leaveApi.decide(deciding.r.id, deciding.approve, note.trim() || undefined);
      showToast(`${deciding.r.staff.name}: ${r.status === "approved" ? "approved" : r.status === "rejected" ? "not approved" : "sent on for final approval"}`, "success");
      setDeciding(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["leave-approvals"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Leave Approvals" description="Leave asked by the staff who report to you (everyone’s, if you approve for the school). Approved leave goes into the staff register, and a teacher’s periods to Substitution." />
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: "pending", label: "Waiting" },
            { id: "decided", label: "Decided by me (90 days)" },
          ]}
          activeTab={tab}
          onChange={(t) => setTab(t as "pending" | "decided")}
        />
      </div>
      {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
      {!list.data && !list.isError && <PageLoader />}
      {list.data && tab === "pending" && (
        <div className="space-y-4">
          {list.data.map((r) => (
            <RequestCard key={r.id} r={r} onDecide={(approve) => setDeciding({ r, approve })} />
          ))}
          {!list.data.length && <Card className="text-center text-on-surface-variant/70 py-12">Nothing waiting for you.</Card>}
        </div>
      )}
      {list.data && tab === "decided" && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Staff member</th>
                  <th className="px-5 py-3 font-bold">Leave</th>
                  <th className="px-5 py-3 font-bold">Dates</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10 align-top">
                    <td className="px-5 py-3 font-semibold">{r.staff.name}</td>
                    <td className="px-5 py-3">{r.type.name}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {leaveDates(r)} <span className="text-[11px] text-on-surface-variant/70">· {dayCount(r.days)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <LeaveStatusCell l={r} />
                    </td>
                  </tr>
                ))}
                {!list.data.length && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-on-surface-variant/70">
                      Nothing decided in the last 90 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {deciding && (
        <Modal isOpen onClose={() => setDeciding(null)} title={`${deciding.approve ? (deciding.r.twoSteps && deciding.r.stage === 1 ? "Recommend" : "Approve") : "Not approve"}: ${deciding.r.staff.name}, ${leaveDates(deciding.r)}`}>
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              {!deciding.approve
                ? "They see that it was not approved, with your note."
                : deciding.r.twoSteps && deciding.r.stage === 1
                  ? "It goes on to the principal / office for the final approval."
                  : `${dayCount(deciding.r.days)} of ${deciding.r.type.name}: the days go into the staff register${deciding.r.periods ? `, and ${deciding.r.periods} periods to Substitution` : ""}.`}
            </p>
            <Input label={deciding.approve ? "Note (optional)" : "Why (they see it)"} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeciding(null)}>
                Cancel
              </Button>
              <Button onClick={decide} loading={busy} className={deciding.approve ? undefined : "!bg-none bg-error"}>
                {deciding.approve ? (deciding.r.twoSteps && deciding.r.stage === 1 ? "Recommend" : "Approve") : "Not approve"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function LeaveApprovalsPage() {
  const { can } = useAuth();
  return (
    <RequirePermission permission={can("leave.approve_all") ? "leave.approve_all" : "leave.approve"}>
      <Approvals />
    </RequirePermission>
  );
}

