"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { CameraScan } from "@/components/library/CameraScan";
import { AuthedPhoto, PhotoCapture } from "@/components/visitors/Photo";
import { clock, EntryInput, HostKind, Known, sinceMin, Visit, visitorsApi } from "@/lib/api/visitors";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const blank: EntryInput = { name: "", mobile: null, idTypeId: null, idNumber: null, address: null, photoFileId: null, purposeId: null, hostKind: "office", staffId: null, studentId: null, people: 1, vehicleNo: null, note: null };

/** Whom they meet: a staff member or a student, searched by name. */
function HostPicker({ kind, value, onChange }: { kind: "staff" | "student"; value: { id: string; label: string } | null; onChange: (v: { id: string; label: string } | null) => void }) {
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
        .hosts(kind, t)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, kind]);
  if (value)
    return (
      <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
        <span className="flex-1 text-sm font-bold text-primary">{value.label}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-bold text-primary">
          Change
        </button>
      </div>
    );
  return (
    <div className="relative">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "staff" ? "Teacher / staff name" : "Student name or admission no"} icon="search" />
      {hits && (
        <div className="absolute z-20 mt-1 w-full rounded-xl bg-surface-container-lowest shadow-lg max-h-60 overflow-y-auto">
          {!hits.length && <p className="px-4 py-3 text-sm text-on-surface-variant">Not found.</p>}
          {hits.map((h) => (
            <button key={h.id} type="button" onClick={() => { onChange({ id: h.id, label: `${h.label} · ${h.detail}` }); setText(""); setHits(null); }} className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high">
              <span className="block text-sm font-bold">{h.label}</span>
              <span className="block text-xs text-on-surface-variant/70">{h.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryForm({ expected, onDone }: { expected: Visit | null; onDone: (v: Visit) => void }) {
  const queryClient = useQueryClient();
  const setup = useQuery({ queryKey: ["visitors", "setup"], queryFn: visitorsApi.setup });
  const purposes = useQuery({ queryKey: ["master-options", "visit_purpose"], queryFn: () => mastersApi.options("visit_purpose"), staleTime: 5 * 60_000 });
  const [v, setV] = useState<EntryInput>(blank);
  const [host, setHost] = useState<{ id: string; label: string } | null>(null);
  const [known, setKnown] = useState<Known | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (p: Partial<EntryInput>) => setV((x) => ({ ...x, ...p }));
  // An expected visitor arriving: their details are filled in.
  useEffect(() => {
    if (!expected) return;
    setV({ ...blank, expectedVisitId: expected.id, name: expected.visitor.name, mobile: expected.visitor.mobile, hostKind: expected.hostKind, note: expected.note, people: expected.people });
    setHost(null);
  }, [expected]);
  // A known mobile number fills the rest in (and warns about the blacklist).
  useEffect(() => {
    const m = (v.mobile ?? "").replace(/\D/g, "");
    if (m.length < 10) {
      setKnown(null);
      return;
    }
    const timer = setTimeout(() => {
      visitorsApi
        .lookup(m)
        .then((k) => {
          setKnown(k);
          if (k) setV((x) => ({ ...x, name: x.name || k.name, idTypeId: x.idTypeId ?? k.idTypeId, idNumber: x.idNumber ?? k.idNumber, address: x.address ?? k.address }));
        })
        .catch(() => setKnown(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [v.mobile]);
  const choosePurpose = (id: string) => {
    const host = (purposes.data?.find((p) => p.id === id)?.extra as { host?: HostKind } | null)?.host;
    set({ purposeId: id || null, ...(host && !v.expectedVisitId ? { hostKind: host } : {}) });
    setHost(null);
  };
  const save = async () => {
    setError(null);
    setFields({});
    try {
      const r = await visitorsApi.enter({ ...v, staffId: v.hostKind === "staff" ? (host?.id ?? null) : null, studentId: v.hostKind === "student" ? (host?.id ?? null) : null, photoFileId: v.photoFileId ?? null });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      setV(blank);
      setHost(null);
      setKnown(null);
      onDone(r);
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  const s = setup.data;
  return (
    <Card>
      <p className={label}>{v.expectedVisitId ? "Expected visitor arriving" : "New visitor"}</p>
      <div className="mt-3 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Mobile" value={v.mobile ?? ""} onChange={(e) => set({ mobile: e.target.value || null })} error={fields.mobile} inputMode="tel" placeholder="98765 43210" icon="call" />
          <Input label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={fields.name} />
        </div>
        {known?.blacklisted && <FormAlert>Blacklisted: {known.blacklistReason ?? "not allowed in"}. Don’t let them in; call the office.</FormAlert>}
        {known && !known.blacklisted && known.visits.length > 0 && (
          <p className="text-xs text-on-surface-variant">
            Came before: {known.visits.slice(0, 3).map((x) => `${x.day} (${x.met})`).join(", ")}
          </p>
        )}
        <PhotoCapture value={v.photoFileId ?? (known?.photoFileId ? "known" : null)} preview={known?.photoFileId ? visitorsApi.visitorPhoto(known.id) : null} onChange={(id) => set({ photoFileId: id })} label={s?.photoRequired ? "Photo (needed)" : "Photo"} />
        {fields.photoFileId && <p className="text-xs text-error">{fields.photoFileId}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Purpose" value={v.purposeId ?? ""} onChange={choosePurpose} options={[{ value: "", label: "Choose…" }, ...(purposes.data ?? []).filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))]} />
          <Select label="Meeting" value={v.hostKind} onChange={(k) => { set({ hostKind: k as HostKind }); setHost(null); }} options={[{ value: "office", label: "The office" }, { value: "staff", label: "A staff member" }, { value: "student", label: "About a student (parent / relative)" }]} />
        </div>
        {v.hostKind !== "office" && !v.expectedVisitId && (
          <div>
            <HostPicker kind={v.hostKind} value={host} onChange={setHost} />
            {(fields.staffId || fields.studentId) && <p className="text-xs text-error mt-1">{fields.staffId ?? fields.studentId}</p>}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="People" type="number" min={1} max={50} value={v.people} onChange={(e) => set({ people: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
          <Input label="Vehicle no." value={v.vehicleNo ?? ""} onChange={(e) => set({ vehicleNo: e.target.value || null })} placeholder="UK07 AB 1234" />
          <MasterSelect master="visitor_id_type" label={s?.idRequired ? "ID proof (needed)" : "ID proof"} value={v.idTypeId ?? ""} onChange={(id) => set({ idTypeId: id || null })} />
        </div>
        {v.idTypeId && <Input label="ID number" value={v.idNumber ?? ""} onChange={(e) => set({ idNumber: e.target.value || null })} error={fields.idNumber} />}
        <Input label="Note" value={v.note ?? ""} onChange={(e) => set({ note: e.target.value || null })} />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-2">
          {v.expectedVisitId && (
            <Button variant="secondary" onClick={() => setV(blank)}>
              Clear
            </Button>
          )}
          <Button onClick={save} disabled={!v.name.trim() || !!known?.blacklisted}>
            {s?.approval && v.hostKind === "staff" && !v.expectedVisitId ? "Ask the staff member" : "Let in and print pass"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VisitRow({ v, onOut, onArrive }: { v: Visit; onOut?: () => void; onArrive?: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <AuthedPhoto path={v.photoFileId ? visitorsApi.visitPhoto(v.id) : null} className="h-11 w-11 rounded-lg object-cover" />
      <div className="flex-1 min-w-[10rem]">
        <p className="text-sm font-bold">
          {v.visitor.name}
          {v.people > 1 ? ` +${v.people - 1}` : ""}
        </p>
        <p className="text-xs text-on-surface-variant/70">
          {v.purpose ?? "Visit"} · {v.host}
          {v.passNo ? ` · ${v.passNo}` : ""}
        </p>
      </div>
      {v.status === "in" && <span className={cn("text-xs font-bold", sinceMin(v.inAt) > 90 ? "text-error" : "text-on-surface-variant")}>in {clock(v.inAt)} · {sinceMin(v.inAt)} min</span>}
      {v.status === "waiting" && <Pill tone="warning">Waiting for the OK</Pill>}
      {v.status === "denied" && <Pill tone="danger">Not allowed{v.answerNote ? `: ${v.answerNote}` : ""}</Pill>}
      {v.status === "in" && (
        <a href={`/visitors/pass/${v.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary">
          Pass
        </a>
      )}
      {onArrive && (
        <Button variant="secondary" onClick={onArrive}>
          Arrived
        </Button>
      )}
      {onOut && (
        <Button variant="tertiary" onClick={onOut}>
          Check out
        </Button>
      )}
    </li>
  );
}

function Gate() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["visitors", "today"], queryFn: visitorsApi.today, refetchInterval: 15_000 });
  const [expected, setExpected] = useState<Visit | null>(null);
  const [code, setCode] = useState("");
  const outRef = useRef<HTMLInputElement>(null);
  const out = async (key: string) => {
    if (!key.trim()) return;
    try {
      const v = await visitorsApi.out(key.trim());
      showToast(`${v.visitor.name} checked out`, "success");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const done = (v: Visit) => {
    setExpected(null);
    if (v.status === "in") {
      showToast(`${v.visitor.name} let in: pass ${v.passNo}`, "success");
      window.open(`/visitors/pass/${v.id}`, "_blank", "noopener");
    } else showToast(`Asked ${v.host}: wait for the answer below`, "success");
  };
  const t = q.data;
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_520px]">
      <EntryForm expected={expected} onDone={done} />
      <div className="space-y-4">
        <Card>
          <p className={label}>Check out: scan the pass, or type its number</p>
          <div className="mt-2 flex items-end gap-2">
            <Input ref={outRef} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void out(code)} placeholder="VP-261024-007" icon="qr_code_scanner" />
            <CameraScan onScan={(c) => void out(c)} label="Scan the pass with the camera" />
            <Button onClick={() => out(code)} disabled={!code.trim()}>
              Out
            </Button>
          </div>
          {t && (
            <p className="mt-2 text-xs text-on-surface-variant">
              Today: {t.inToday} came · {t.inside.length} inside · {t.outToday} left
            </p>
          )}
        </Card>
        {!t ? (
          <PageLoader />
        ) : (
          <>
            {(t.waiting.length > 0 || t.denied.length > 0) && (
              <Card padding="none">
                <p className={cn(label, "px-4 pt-4")}>Waiting for the staff member</p>
                <ul className="divide-y divide-outline-variant/10">
                  {[...t.waiting, ...t.denied].map((v) => (
                    <VisitRow key={v.id} v={v} onOut={v.status === "waiting" ? () => out(v.id) : undefined} />
                  ))}
                </ul>
              </Card>
            )}
            {t.expected.length > 0 && (
              <Card padding="none">
                <p className={cn(label, "px-4 pt-4")}>Expected today</p>
                <ul className="divide-y divide-outline-variant/10">
                  {t.expected.map((v) => (
                    <VisitRow key={v.id} v={v} onArrive={() => setExpected(v)} />
                  ))}
                </ul>
              </Card>
            )}
            <Card padding="none">
              <p className={cn(label, "px-4 pt-4")}>Inside now ({t.inside.length})</p>
              {!t.inside.length && <p className="px-4 py-4 text-sm text-on-surface-variant">No visitors inside.</p>}
              <ul className="divide-y divide-outline-variant/10">
                {t.inside.map((v) => (
                  <VisitRow key={v.id} v={v} onOut={() => out(v.id)} />
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function GatePage() {
  return (
    <RequirePermission permission="visitor.gate">
      <PageHeader title="Gate" description="Let visitors in with a photo and a pass, see who is inside, and check them out by scanning the pass." />
      <Gate />
    </RequirePermission>
  );
}
