"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { SearchPick } from "@/components/hostel/SearchPick";
import { PrintPass } from "@/components/hostel/PassSlip";
import { LEAVE_STATUS, hostelApi, istIso, when, type FoundStudent, type Leave } from "@/lib/api/hostel";

const local = (h: number) => new Date(Date.now() + 5.5 * 3_600_000 + h * 3_600_000).toISOString().slice(0, 16);

function NewLeave({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const [f, setF] = useState({ fromAt: local(1), toAt: local(49), reason: "", escort: "", destination: "" });
  const boarders = async (q: string) => (await hostelApi.findStudents(q)).filter((s) => s.current);
  return (
    <Modal isOpen onClose={onClose} title="Leave for a boarder">
      <div className="space-y-3">
        {student ? (
          <div className="rounded-xl bg-surface-container p-3">
            <p className="font-bold">{student.name}</p>
            <p className="text-xs text-on-surface-variant">
              {student.admissionNo} · {student.section} · {student.current}
            </p>
            <button className="mt-1 text-xs text-primary" onClick={() => setStudent(null)}>
              Change
            </button>
          </div>
        ) : (
          <SearchPick label="Boarder" search={boarders} onPick={setStudent} render={(s) => <span><b>{s.name}</b> <span className="text-on-surface-variant">{s.admissionNo} · {s.current}</span></span>} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Leaves at" type="datetime-local" value={f.fromAt} onChange={(e) => setF({ ...f, fromAt: e.target.value })} />
          <Input label="Back by" type="datetime-local" value={f.toAt} onChange={(e) => setF({ ...f, toAt: e.target.value })} />
        </div>
        <Input label="Reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Going with" value={f.escort} onChange={(e) => setF({ ...f, escort: e.target.value })} maxLength={100} placeholder="Father, uncle…" />
          <Input label="Going to" value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} maxLength={100} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!student || f.reason.trim().length < 3}
            onClick={async () => {
              try {
                const r = await hostelApi.addLeave({ studentId: student!.id, fromAt: istIso(f.fromAt), toAt: istIso(f.toAt), reason: f.reason, escort: f.escort || null, destination: f.destination || null });
                showToast(r.status === "approved" ? `Approved. Pass code ${r.passCode}` : "Saved: it needs the principal’s approval (long leave)", "success");
                onSaved();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LeaveList() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [show, setShow] = useState("open");
  const [adding, setAdding] = useState(false);
  const [answering, setAnswering] = useState<{ leave: Leave; approve: boolean } | null>(null);
  const [answer, setAnswer] = useState("");
  const q = useQuery({ queryKey: ["hostel", "leaves", show], queryFn: () => hostelApi.leaves(show) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["hostel", "leaves"] });
  const warden = can("hostel.warden");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          className="flex-1"
          tabs={[
            { id: "open", label: "Waiting & approved" },
            { id: "out", label: "Out now" },
            { id: "done", label: "Back / closed" },
            { id: "all", label: "All" },
          ]}
          activeTab={show}
          onChange={setShow}
        />
        {warden && <Button onClick={() => setAdding(true)}>New leave</Button>}
      </div>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data!.length ? (
        <FormAlert tone="info">Nothing here.</FormAlert>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {q.data!.map((l) => {
            const overdue = l.status === "out" && new Date(l.toAt) < new Date();
            return (
              <Card key={l.id}>
                <div className="flex items-start gap-3">
                  <AuthedPhoto path={l.photo} className="h-12 w-12 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{l.student}</p>
                      <Pill tone={overdue ? "danger" : LEAVE_STATUS[l.status].tone}>{overdue ? "Overdue" : l.late ? "Back late" : LEAVE_STATUS[l.status].label}</Pill>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {l.admissionNo} · {l.hostel}
                    </p>
                    <p className="mt-2 text-sm">
                      {when(l.fromAt)} → {when(l.toAt)}
                    </p>
                    <p className="text-sm">{l.reason}</p>
                    <p className="text-xs text-on-surface-variant">
                      {[l.escort && `with ${l.escort}`, l.destination && `to ${l.destination}`, `asked by ${l.requestedBy}`, l.answeredBy && `answered by ${l.answeredBy}`].filter(Boolean).join(" · ")}
                    </p>
                    {l.answer && <p className="text-xs italic">“{l.answer}”</p>}
                    {(l.outAt || l.inAt) && (
                      <p className="text-xs text-on-surface-variant">
                        {l.outAt && `Went out ${when(l.outAt)}`}
                        {l.inAt && ` · came back ${when(l.inAt)}`}
                      </p>
                    )}
                    {l.passCode && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="font-mono text-sm">Pass: {l.passCode}</span>
                        <PrintPass leaveId={l.id} />
                      </div>
                    )}
                  </div>
                </div>
                {warden && (l.status === "pending" || l.status === "approved") && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      variant="tertiary"
                      onClick={async () => {
                        if (!(await confirm({ title: "Cancel this leave?", message: `${l.student}’s leave is cancelled; the pass stops working.`, confirmLabel: "Cancel leave" }))) return;
                        hostelApi.cancelLeave(l.id).then(refresh).catch((e) => showToast(errorMessage(e), "error"));
                      }}
                    >
                      Cancel
                    </Button>
                    {l.status === "pending" && (
                      <>
                        <Button variant="secondary" onClick={() => (setAnswer(""), setAnswering({ leave: l, approve: false }))}>
                          Refuse
                        </Button>
                        <Button onClick={() => (setAnswer(""), setAnswering({ leave: l, approve: true }))}>Approve</Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {adding && <NewLeave onClose={() => setAdding(false)} onSaved={() => (setAdding(false), refresh())} />}
      {answering && (
        <Modal isOpen onClose={() => setAnswering(null)} title={`${answering.approve ? "Approve" : "Refuse"} leave for ${answering.leave.student}`}>
          <div className="space-y-3">
            <Input label="Note to the parents (optional)" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={300} />
            <div className="flex justify-end gap-2">
              <Button variant="tertiary" onClick={() => setAnswering(null)}>Back</Button>
              <Button
                onClick={async () => {
                  try {
                    await hostelApi.answerLeave(answering.leave.id, answering.approve, answer || null);
                    showToast(answering.approve ? "Approved: the parents get the pass code" : "Refused", "success");
                    setAnswering(null);
                    refresh();
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                {answering.approve ? "Approve" : "Refuse"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function HostelLeavePage() {
  return (
    <RequirePermission permission={["hostel.warden", "hostel.view"]}>
      <PageHeader title="Leave & Passes" description="Leave asked for by parents or made by the warden. An approved leave has a pass code the gate scans when the boarder goes out and comes back." />
      <LeaveList />
    </RequirePermission>
  );
}
