"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto, PhotoCapture } from "@/components/visitors/Photo";
import { clock, GateStudent, visitorsApi } from "@/lib/api/visitors";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
type Who = { kind: "guardian" | "person"; id: string; name: string } | { kind: "other" };

function FindStudent({ onPick }: { onPick: (id: string) => void }) {
  const [text, setText] = useState("");
  const [hits, setHits] = useState<{ id: string; label: string; detail: string }[] | null>(null);
  useEffect(() => {
    const t = text.trim();
    if (t.length < 2) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      visitorsApi
        .hosts("student", t)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <div className="relative">
      <Input label="Student to collect" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name or admission no" icon="search" />
      {hits && (
        <div className="absolute z-20 mt-1 w-full rounded-xl bg-surface-container-lowest shadow-lg max-h-64 overflow-y-auto">
          {!hits.length && <p className="px-4 py-3 text-sm text-on-surface-variant">Not found.</p>}
          {hits.map((h) => (
            <button key={h.id} type="button" onClick={() => { onPick(h.id); setText(""); setHits(null); }} className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high">
              <span className="block text-sm font-bold">{h.label}</span>
              <span className="block text-xs text-on-surface-variant/70">{h.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HandOver({ s, onDone }: { s: GateStudent; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [who, setWho] = useState<Who | null>(null);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState({ name: "", relation: "", mobile: "" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!who) return;
    setError(null);
    try {
      const r = await visitorsApi.pickup({ studentId: s.student.id, byKind: who.kind, guardianId: who.kind === "guardian" ? who.id : null, personId: who.kind === "person" ? who.id : null, ...(who.kind === "other" ? { name: other.name, relation: other.relation, mobile: other.mobile } : {}), photoFileId: photo, reason });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      showToast(r.status === "waiting" ? "Not on the list: the office is asked to approve. Keep the child in school until then." : `${s.student.name} handed over; parents and class teacher told`, r.status === "waiting" ? "error" : "success");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const tile = (key: string, active: boolean, onClick: () => void, children: React.ReactNode) => (
    <button key={key} type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left", active ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:border-primary/40")}>
      {children}
    </button>
  );
  return (
    <Card>
      <div className="flex items-start gap-4">
        <AuthedPhoto path={s.student.hasPhoto ? visitorsApi.studentPhoto(s.student.id) : null} className="h-24 w-20 rounded-xl object-cover" icon="school" />
        <div className="flex-1">
          <p className="text-lg font-extrabold">{s.student.name}</p>
          <p className="text-sm text-on-surface-variant">
            {s.student.section} · {s.student.admissionNo}
          </p>
          {s.student.classTeacher && (
            <p className="text-xs text-on-surface-variant/70">
              Class teacher: {s.student.classTeacher.name}
              {s.student.classTeacher.mobile ? ` · ${s.student.classTeacher.mobile}` : ""}
            </p>
          )}
          {s.today.length > 0 && <FormAlert tone="warning">Already today: {s.today.map((p) => `${clock(p.at)} by ${p.name} (${p.status})`).join("; ")}</FormAlert>}
        </div>
      </div>
      <p className={cn(label, "mt-5")}>Who is collecting? Check their face and ID</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {s.guardians.map((g) =>
          tile(
            g.id,
            who?.kind === "guardian" && who.id === g.id,
            () => setWho({ kind: "guardian", id: g.id, name: g.name }),
            <>
              <span className="material-symbols-outlined text-3xl text-primary">family_restroom</span>
              <span>
                <span className="block text-sm font-bold">{g.name}</span>
                <span className="block text-xs text-on-surface-variant/70">
                  {g.relation}
                  {g.mobile ? ` · ${g.mobile}` : ""}
                </span>
              </span>
            </>
          )
        )}
        {s.people.map((p) =>
          tile(
            p.id,
            who?.kind === "person" && who.id === p.id,
            () => setWho({ kind: "person", id: p.id, name: p.name }),
            <>
              <AuthedPhoto path={p.photoFileId ? visitorsApi.personPhoto(p.id) : null} className="h-12 w-12 rounded-lg object-cover" />
              <span>
                <span className="block text-sm font-bold">{p.name}</span>
                <span className="block text-xs text-on-surface-variant/70">
                  {p.relation}
                  {p.mobile ? ` · ${p.mobile}` : ""}
                </span>
              </span>
            </>
          )
        )}
        {tile(
          "other",
          who?.kind === "other",
          () => setWho({ kind: "other" }),
          <>
            <span className="material-symbols-outlined text-3xl text-error">person_alert</span>
            <span>
              <span className="block text-sm font-bold text-error">Someone not on the list</span>
              <span className="block text-xs text-on-surface-variant/70">Needs the office’s OK</span>
            </span>
          </>
        )}
      </div>
      {who?.kind === "other" && (
        <div className="mt-4 space-y-3 rounded-xl bg-error/5 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Name" value={other.name} onChange={(e) => setOther({ ...other, name: e.target.value })} />
            <Input label="Relation" value={other.relation} onChange={(e) => setOther({ ...other, relation: e.target.value })} placeholder="Cousin" />
            <Input label="Mobile" value={other.mobile} onChange={(e) => setOther({ ...other, mobile: e.target.value })} inputMode="tel" />
          </div>
          <PhotoCapture value={photo} onChange={setPhoto} label="Photo of the person" />
        </div>
      )}
      {who && (
        <div className="mt-4 space-y-3">
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Doctor’s appointment" />
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onDone}>
              Cancel
            </Button>
            <Button onClick={save} disabled={reason.trim().length < 2 || (who.kind === "other" && (!other.name.trim() || !other.mobile.trim()))}>
              {who.kind === "other" ? "Ask the office" : "Hand over"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Pickup() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [student, setStudent] = useState<GateStudent | null>(null);
  const today = useQuery({ queryKey: ["visitors", "pickups"], queryFn: visitorsApi.pickupsToday, refetchInterval: 15_000 });
  const pick = async (id: string) => {
    try {
      setStudent(await visitorsApi.gateStudent(id));
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const answer = async (id: string, allow: boolean, name: string) => {
    if (!(await confirm({ title: allow ? `Let ${name} collect the child?` : "Refuse this pickup?", message: allow ? "Call the parents first to confirm." : undefined, confirmLabel: allow ? "Allow" : "Refuse", danger: !allow }))) return;
    try {
      await visitorsApi.answerPickup(id, allow);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      showToast(allow ? "Allowed: parents and class teacher told" : "Refused", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const waiting = (today.data ?? []).filter((p) => p.status === "waiting");
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
      <div className="space-y-4">
        {can("visitor.gate") && (student ? <HandOver s={student} onDone={() => setStudent(null)} /> : <Card><FindStudent onPick={pick} /></Card>)}
      </div>
      <div className="space-y-4">
        {waiting.length > 0 && (
          <Card>
            <p className={label}>Waiting for the office’s OK</p>
            <ul className="mt-2 space-y-2">
              {waiting.map((p) => (
                <li key={p.id} className="rounded-xl bg-error/5 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <AuthedPhoto path={p.photoFileId ? visitorsApi.pickupPhoto(p.id) : null} className="h-11 w-11 rounded-lg object-cover" />
                    <div className="flex-1 text-sm">
                      <p className="font-bold">
                        {p.name}
                        {p.relation ? ` (${p.relation})` : ""} → {p.student}
                      </p>
                      <p className="text-xs text-on-surface-variant/70">
                        {p.mobile} · {p.reason} · {clock(p.at)}
                      </p>
                    </div>
                  </div>
                  {can("visitor.manage") ? (
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="tertiary" onClick={() => answer(p.id, false, p.name)}>
                        Refuse
                      </Button>
                      <Button onClick={() => answer(p.id, true, p.name)}>Allow</Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-error font-bold">Keep the child in school until the office answers.</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <p className={label}>Collected today</p>
          {!(today.data ?? []).filter((p) => p.status !== "waiting").length && <p className="mt-2 text-sm text-on-surface-variant">None yet.</p>}
          <ul className="mt-2 space-y-1.5 text-sm">
            {(today.data ?? [])
              .filter((p) => p.status !== "waiting")
              .map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-on-surface-variant">{clock(p.at)}</span>
                  <span className="flex-1">
                    <b>{p.student}</b> by {p.name}
                    {p.relation ? ` (${p.relation})` : ""}
                  </span>
                  {p.status === "refused" ? <Pill tone="danger">Refused</Pill> : p.byKind === "other" ? <Pill tone="warning">Allowed</Pill> : <Pill tone="success">On the list</Pill>}
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function PickupPage() {
  return (
    <RequirePermission permission={["visitor.gate", "visitor.manage"]}>
      <PageHeader title="Student Pickup" description="A child collected early: check the person against the parents and the pickup list, note the reason, and the parents and class teacher are told." />
      <Pickup />
    </RequirePermission>
  );
}
