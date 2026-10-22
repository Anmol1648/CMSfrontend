"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LEAVE_STATUS, leaveApi, LeaveRequest, showDay, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { studentsApi } from "@/lib/api/students";
import { useCodedList } from "@/components/masters/useCodedList";

const range = (r: LeaveRequest) => (r.from === r.to ? showDay(r.from, { day: "numeric", month: "short", year: "numeric" }) : `${showDay(r.from, { day: "numeric", month: "short" })} – ${showDay(r.to, { day: "numeric", month: "short", year: "numeric" })}`);

/** The office records leave for a student (approved straight away). */
function Record({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState<{ id: string; label: string } | null>(null);
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(todayIST());
  const types = useCodedList("student_leave_type");
  const [kind, setKind] = useState("leave");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const found = useQuery({
    queryKey: ["leave-student-search", search],
    queryFn: () => studentsApi.list({ search, pageSize: 8 }),
    enabled: search.trim().length >= 2 && !student,
  });
  const save = async () => {
    if (!student) return;
    setError(null);
    try {
      await leaveApi.apply({ student: student.id, from, to, kind, reason: reason.trim() });
      showToast("Leave recorded and approved", "success");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Record leave for a student">
      <div className="space-y-4">
        {student ? (
          <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
            <span className="font-semibold">{student.label}</span>
            <button type="button" className="text-xs font-bold uppercase tracking-widest text-primary" onClick={() => setStudent(null)}>
              Change
            </button>
          </div>
        ) : (
          <div>
            <Input label="Student" placeholder="Name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
            <div className="mt-2 space-y-1">
              {(found.data?.items ?? []).map((s) => (
                <button key={s.id} type="button" onClick={() => setStudent({ id: s.id, label: `${s.name} · ${s.admissionNo}${s.section ? ` · ${s.section.label}` : ""}` })} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-container-low">
                  {s.name} <span className="text-xs text-on-surface-variant">· {s.admissionNo}{s.section ? ` · ${s.section.label}` : ""}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select label="Kind" value={kind} onChange={setKind} options={types.options} />
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family function; fever (note from parent)" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!student || reason.trim().length < 3}>
            Record leave
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Requests() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { can } = useAuth();
  const [tab, setTab] = useState("pending");
  const [deciding, setDeciding] = useState<{ r: LeaveRequest; approve: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const list = useQuery({ queryKey: ["leave-requests", tab], queryFn: () => leaveApi.requests(tab) });

  const decide = async () => {
    if (!deciding) return;
    try {
      await leaveApi.decide(deciding.r.id, deciding.approve, note.trim() || undefined);
      showToast(deciding.approve ? `${deciding.r.student.name}: leave approved` : `${deciding.r.student.name}: not approved`, "success");
      setDeciding(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Leave requests"
        description="Leave asked by parents and students for the sections you look after. Approved leave is put in the register by itself (Leave / Medical leave), also for days already marked."
        actions={
          can("attendance.mark_any") ? (
            <Button variant="secondary" onClick={() => setRecording(true)}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Record leave
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: "pending", label: "Waiting" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Not approved" },
            { id: "all", label: "All" },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
      </div>
      {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
      {!list.data && !list.isError && <PageLoader />}
      {list.data && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Student</th>
                  <th className="px-5 py-3 font-bold">Dates</th>
                  <th className="px-5 py-3 font-bold">Reason</th>
                  <th className="px-5 py-3 font-bold">Asked by</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.data.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10 align-top">
                    <td className="px-5 py-3">
                      <p className="font-semibold">{r.student.name}</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        {r.student.section ?? "—"}
                        {r.student.roll ? ` · Roll ${r.student.roll}` : ""} · {r.student.admissionNo}
                      </p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {range(r)}
                      <p className="text-[11px] text-on-surface-variant/70">
                        {r.days} school day{r.days === 1 ? "" : "s"} · {r.kindName}
                      </p>
                    </td>
                    <td className="px-5 py-3 max-w-[280px]">{r.reason}</td>
                    <td className="px-5 py-3 text-xs">
                      {r.appliedBy ?? "—"}
                      <p className="text-on-surface-variant/60">{new Date(r.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={LEAVE_STATUS[r.status].tone}>{LEAVE_STATUS[r.status].label}</Pill>
                      {r.decidedBy && <p className="text-[11px] text-on-surface-variant/70 mt-1">by {r.decidedBy}</p>}
                      {r.decisionNote && <p className="text-[11px] text-on-surface-variant/70">“{r.decisionNote}”</p>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-4 text-xs font-bold uppercase tracking-widest">
                          <button type="button" className="text-emerald-700 hover:opacity-70" onClick={() => setDeciding({ r, approve: true })}>
                            Approve
                          </button>
                          <button type="button" className="text-error hover:opacity-70" onClick={() => setDeciding({ r, approve: false })}>
                            Not approve
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!list.data.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-on-surface-variant/70">
                      {tab === "pending" ? "Nothing waiting." : "No requests."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {deciding && (
        <Modal isOpen onClose={() => setDeciding(null)} title={`${deciding.approve ? "Approve" : "Not approve"}: ${deciding.r.student.name}, ${range(deciding.r)}`}>
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              {deciding.approve ? "Those school days get “" + deciding.r.kindName + "” in the register, and don’t count against the attendance %." : "The parent sees that it was not approved."}
            </p>
            <Input label="Note (optional, the parent sees it)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeciding(null)}>
                Cancel
              </Button>
              <Button onClick={decide} className={deciding.approve ? undefined : "!bg-none bg-error"}>
                {deciding.approve ? "Approve" : "Not approve"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {recording && <Record onClose={() => setRecording(false)} />}
    </>
  );
}

export default function LeaveRequestsPage() {
  return (
    <RequirePermission permission="attendance.mark">
      <Requests />
    </RequirePermission>
  );
}
