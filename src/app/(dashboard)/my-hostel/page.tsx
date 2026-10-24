"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Qr } from "@/components/library/Qr";
import { LEAVE_STATUS, hostelApi, istIso, when, type MyChild } from "@/lib/api/hostel";

const local = (h: number) => new Date(Date.now() + 5.5 * 3_600_000 + h * 3_600_000).toISOString().slice(0, 16);

function AskLeave({ child, onClose, onSaved }: { child: MyChild; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({ fromAt: local(24), toAt: local(72), reason: "", escort: "", destination: "Home" });
  return (
    <Modal isOpen onClose={onClose} title={`Ask for leave: ${child.name}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Collect at" type="datetime-local" value={f.fromAt} onChange={(e) => setF({ ...f, fromAt: e.target.value })} />
          <Input label="Back by" type="datetime-local" value={f.toAt} onChange={(e) => setF({ ...f, toAt: e.target.value })} />
        </div>
        <Input label="Reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Who will collect" value={f.escort} onChange={(e) => setF({ ...f, escort: e.target.value })} maxLength={100} placeholder="Father, mother…" />
          <Input label="Going to" value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} maxLength={100} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={f.reason.trim().length < 3}
            onClick={async () => {
              try {
                await hostelApi.askLeave({ studentId: child.studentId, fromAt: istIso(f.fromAt), toAt: istIso(f.toAt), reason: f.reason, escort: f.escort || null, destination: f.destination || null });
                showToast("Sent to the warden. You will be told when it is approved.", "success");
                onSaved();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Child({ c, parentLeave }: { c: MyChild; parentLeave: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [asking, setAsking] = useState(false);
  const [pass, setPass] = useState<string | null>(null);
  const [v, setV] = useState({ name: "", relation: "", phone: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["hostel", "mine"] });
  const absences = c.nights.filter((n) => n.mark === "absent").length;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-extrabold">{c.name}</p>
            <p className="text-sm text-on-surface-variant">
              {c.hostel} · Room {c.room}, bed {c.bed} · since {c.since}
            </p>
            {c.roommates.length > 0 && <p className="mt-1 text-sm">Room-mates: {c.roommates.join(", ")}</p>}
            {c.warden && (
              <p className="mt-1 text-sm">
                Warden: <b>{c.warden.name}</b>
                {c.warden.phone && (
                  <>
                    {" "}
                    · <a className="text-primary" href={`tel:${c.warden.phone}`}>{c.warden.phone}</a>
                  </>
                )}
              </p>
            )}
            {c.hostelPhone && <p className="text-sm">Hostel phone: <a className="text-primary" href={`tel:${c.hostelPhone}`}>{c.hostelPhone}</a></p>}
          </div>
          {parentLeave && <Button onClick={() => setAsking(true)}>Ask for leave</Button>}
        </div>
        <div className="mt-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Night roll call, last two weeks{absences ? ` · ${absences} absent` : ""}</p>
          <div className="flex flex-wrap gap-1">
            {c.nights
              .slice()
              .reverse()
              .map((n) => (
                <span key={n.date} title={`${n.date}: ${n.mark}`} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${n.mark === "present" ? "bg-emerald-100 text-emerald-800" : n.mark === "absent" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                  {n.date.slice(8)}
                </span>
              ))}
            {!c.nights.length && <span className="text-sm text-on-surface-variant">None yet.</span>}
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-bold">Leave</p>
        <div className="space-y-2">
          {c.leaves.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container px-3 py-2 text-sm">
              <Pill tone={l.late ? "warning" : LEAVE_STATUS[l.status].tone}>{l.late ? "Back late" : LEAVE_STATUS[l.status].label}</Pill>
              <span className="flex-1">
                {when(l.fromAt)} → {when(l.toAt)} · {l.reason}
                {l.answer && <span className="text-on-surface-variant"> · “{l.answer}”</span>}
              </span>
              {l.passCode && (
                <Button variant="secondary" onClick={() => setPass(l.passCode)}>
                  Pass {l.passCode}
                </Button>
              )}
              {(l.status === "pending" || l.status === "approved") && (
                <Button variant="tertiary" onClick={async () => (await confirm({ title: "Cancel this leave?", message: "The warden is told; the pass stops working.", confirmLabel: "Cancel leave" })) && hostelApi.cancelLeave(l.id).then(refresh).catch((e) => showToast(errorMessage(e), "error"))}>
                  Cancel
                </Button>
              )}
            </div>
          ))}
          {!c.leaves.length && <p className="text-sm text-on-surface-variant">No leave yet.</p>}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-bold">Sick bay</p>
          {c.medical.map((m) => (
            <div key={m.id} className="border-b border-outline-variant/10 py-2 text-sm last:border-0">
              <b>{m.complaint}</b> <span className="text-on-surface-variant">{when(m.at)}</span>
              <p className="text-on-surface-variant">{[m.treatment, m.medicine].filter(Boolean).join(" · ")}{m.referred ? " · taken to the doctor" : ""}</p>
            </div>
          ))}
          {!c.medical.length && <p className="text-sm text-on-surface-variant">No visits.</p>}
        </Card>
        <Card>
          <p className="mb-1 font-bold">Who may visit</p>
          <p className="mb-3 text-xs text-on-surface-variant">Only these people (besides you) can meet {c.name.split(" ")[0]} at the hostel.</p>
          {c.visitors.map((x) => (
            <div key={x.id} className="flex items-center justify-between border-b border-outline-variant/10 py-2 text-sm last:border-0">
              <span>
                <b>{x.name}</b> {x.relation && `(${x.relation})`} {x.phone}
              </span>
              <button className="material-symbols-outlined text-lg text-on-surface-variant" onClick={async () => (await confirm({ title: `Remove ${x.name}?`, message: "They can no longer visit.", confirmLabel: "Remove" })) && hostelApi.removeVisitor(x.id).then(refresh).catch((e) => showToast(errorMessage(e), "error"))}>
                delete
              </button>
            </div>
          ))}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Input placeholder="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} />
            <Input placeholder="Relation" value={v.relation} onChange={(e) => setV({ ...v, relation: e.target.value })} maxLength={40} />
            <Input placeholder="Phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} maxLength={20} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="secondary"
              disabled={v.name.trim().length < 2}
              onClick={async () => {
                try {
                  await hostelApi.addVisitor({ studentId: c.studentId, name: v.name, relation: v.relation || null, phone: v.phone || null });
                  setV({ name: "", relation: "", phone: "" });
                  refresh();
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Add visitor
            </Button>
          </div>
        </Card>
      </div>
      {asking && <AskLeave child={c} onClose={() => setAsking(false)} onSaved={() => (setAsking(false), refresh())} />}
      {pass && (
        <Modal isOpen onClose={() => setPass(null)} title="Leave pass">
          <div className="flex flex-col items-center gap-3 py-2">
            <Qr text={pass} size={220} />
            <p className="font-mono text-2xl font-bold tracking-widest">{pass}</p>
            <p className="text-center text-sm text-on-surface-variant">Show this at the hostel gate when {c.name.split(" ")[0]} leaves and comes back.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MyHostel() {
  const q = useQuery({ queryKey: ["hostel", "mine"], queryFn: hostelApi.mine });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data!.children.length) return <FormAlert tone="info">Not staying in the school hostel.</FormAlert>;
  return (
    <div className="space-y-8">
      {q.data!.children.map((c) => (
        <Child key={c.studentId} c={c} parentLeave={q.data!.parentLeave} />
      ))}
    </div>
  );
}

export default function MyHostelPage() {
  return (
    <RequirePermission permission="hostel.mine">
      <PageHeader title="My Hostel" description="Room, roll call, leave passes, sick bay and visitors." />
      <MyHostel />
    </RequirePermission>
  );
}
