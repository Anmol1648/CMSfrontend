"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { ApiError, authedImageUrl, errorMessage } from "@/lib/api/client";
import { disciplineApi, INFORMED, RecordInput, Role, Severity, SEVERITY, when } from "@/lib/api/discipline";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const nowLocal = () => {
  const d = new Date(Date.now() + 5.5 * 3_600_000);
  return d.toISOString().slice(0, 16);
};

/** Records an incident (or a positive note) for one or more students. */
export function RecordForm({ positive, onClose }: { positive: boolean; onClose: (id?: string) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const opts = useQuery({ queryKey: ["discipline", "options"], queryFn: disciplineApi.options });
  const [typeId, setTypeId] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [at, setAt] = useState(nowLocal());
  const [placeId, setPlaceId] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string; section: string; role: Role }[]>([]);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [phoned, setPhoned] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [text, setText] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; admissionNo: string; section: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = text.trim();
    if (t.length < 2) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      disciplineApi
        .students(t)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text]);
  const types = (opts.data?.types ?? []).filter((t) => !!t.positive === positive);
  const type = types.find((t) => t.id === typeId);
  const save = async () => {
    setError(null);
    try {
      const input: RecordInput = { typeId, ...(positive || !severity ? {} : { severity }), occurredAt: new Date(`${at}:00+05:30`).toISOString(), placeId: placeId || null, title: title.trim() || null, details: details.trim() || null, students: students.map((s) => ({ studentId: s.id, role: positive ? "did" : s.role })), attachmentIds: files.map((f) => f.id), phoned, followUpOn: followUp || null };
      const r = await disciplineApi.record(input);
      queryClient.invalidateQueries({ queryKey: ["discipline"] });
      showToast(positive ? "Positive note recorded" : "Incident recorded", "success");
      onClose(r.id);
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  const upload = async (f: File) => {
    try {
      const r = await disciplineApi.upload(f);
      setFiles((x) => [...x, r]);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={() => onClose()} title={positive ? "Record a positive note" : "Record an incident"} width="max-w-2xl">
      {!opts.data ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={positive ? "For" : "What happened"} value={typeId} onChange={(t) => { setTypeId(t); setSeverity(""); }} options={[{ value: "", label: "Choose…" }, ...types.map((t) => ({ value: t.id, label: `${t.name}${opts.data!.points && t.points ? ` (${t.points > 0 ? "+" : ""}${t.points})` : ""}` }))]} />
            {!positive && <Select label="How serious" value={severity || type?.severity || "minor"} onChange={(s) => setSeverity(s as Severity)} options={(Object.keys(SEVERITY) as Severity[]).map((s) => ({ value: s, label: SEVERITY[s].label }))} />}
          </div>
          <div>
            <p className={label}>Students</p>
            <div className="relative mt-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a student: name or admission no" icon="person_add" />
              {hits && (
                <div className="absolute z-20 mt-1 w-full rounded-xl bg-surface-container-lowest shadow-lg max-h-60 overflow-y-auto">
                  {!hits.length && <p className="px-4 py-3 text-sm text-on-surface-variant">No student found (in your sections).</p>}
                  {hits.map((h) => (
                    <button key={h.id} type="button" onClick={() => { if (!students.some((s) => s.id === h.id)) setStudents((x) => [...x, { id: h.id, name: h.name, section: h.section, role: "did" }]); setText(""); setHits(null); }} className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high">
                      <span className="block text-sm font-bold">{h.name}</span>
                      <span className="block text-xs text-on-surface-variant/70">
                        {h.section} · {h.admissionNo}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fields.students && <p className="text-xs text-error mt-1">{fields.students}</p>}
            <ul className="mt-2 space-y-1.5">
              {students.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
                  <span className="flex-1 text-sm">
                    <b>{s.name}</b> <span className="text-xs text-on-surface-variant">{s.section}</span>
                  </span>
                  {!positive && (
                    <select value={s.role} onChange={(e) => setStudents((x) => x.map((y) => (y.id === s.id ? { ...y, role: e.target.value as Role } : y)))} className="rounded-lg bg-white px-2 py-1 text-xs" aria-label={`Part of ${s.name}`}>
                      <option value="did">Involved</option>
                      <option value="affected">Affected</option>
                      <option value="witness">Witness</option>
                    </select>
                  )}
                  <button type="button" onClick={() => setStudents((x) => x.filter((y) => y.id !== s.id))} aria-label="Remove" className="p-1 rounded hover:bg-surface-container-high">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={label}>When</span>
              <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
              {fields.occurredAt && <span className="text-xs text-error">{fields.occurredAt}</span>}
            </label>
            <MasterSelect master="incident_place" label="Where" value={placeId} onChange={setPlaceId} />
          </div>
          <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type?.name ?? ""} maxLength={150} />
          <label className="flex flex-col gap-2">
            <span className={label}>Details</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={3000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {files.map((f) => (
              <Pill key={f.id} tone="primary">
                {f.name}
              </Pill>
            ))}
            {files.length < 5 && (
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                <span className="material-symbols-outlined text-lg">attach_file</span> Attach a photo / PDF
              </button>
            )}
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
          </div>
          {!positive && (
            <div className="grid gap-4 sm:grid-cols-2 items-end">
              <Checkbox checked={phoned} onChange={setPhoned} label="I told the parents by phone" hint={`Parents get an alert from “${opts.data.alertFrom}” severity (System Settings → Discipline).`} />
              <Input label="Follow up on (optional)" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            </div>
          )}
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!typeId || !students.length}>
              Record
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** A student's conduct history this session. */
export function ConductModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["discipline", "student", studentId], queryFn: () => disciplineApi.student(studentId) });
  const c = q.data;
  return (
    <Modal isOpen onClose={onClose} title={c ? `Conduct: ${c.student.name}` : "Conduct"} width="max-w-2xl">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        c && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              {c.student.section} · {c.student.admissionNo}
            </p>
            <div className="flex gap-2">
              <Pill tone={c.points < 0 ? "danger" : "success"}>{c.points} points</Pill>
              <Pill tone={c.incidents ? "warning" : "neutral"}>{c.incidents} incidents</Pill>
              <Pill tone="success">{c.positives} positive notes</Pill>
            </div>
            <ul className="space-y-2">
              {c.history.map((h) => (
                <li key={`${h.id}-${h.role}`} className={cn("rounded-xl px-4 py-2.5", h.positive ? "bg-green-50" : "bg-surface-container-low")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 font-bold text-sm">
                      {h.positive ? "🌟 " : ""}
                      {h.title}
                    </span>
                    {!h.positive && <Pill tone={SEVERITY[h.severity].tone}>{SEVERITY[h.severity].label}</Pill>}
                    {h.points !== 0 && <span className={cn("text-xs font-bold", h.points < 0 ? "text-error" : "text-green-700")}>{h.points > 0 ? `+${h.points}` : h.points}</span>}
                  </div>
                  <p className="text-xs text-on-surface-variant/70">
                    {when(h.occurredAt)} · {h.type} · {h.role}
                    {h.actions.length ? ` · ${h.actions.join(", ")}` : ""}
                  </p>
                </li>
              ))}
              {!c.history.length && <li className="text-sm text-on-surface-variant">Nothing recorded this session.</li>}
            </ul>
          </div>
        )
      )}
    </Modal>
  );
}

/** One incident: students (part, points, informed, acknowledged), actions (with approval), resolve. */
export function IncidentDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["discipline", "one", id], queryFn: () => disciplineApi.get(id) });
  const opts = useQuery({ queryKey: ["discipline", "options"], queryFn: disciplineApi.options });
  const [adding, setAdding] = useState(false);
  const [act, setAct] = useState({ actionId: "", studentId: "", note: "", fromDate: "", toDate: "" });
  const [conduct, setConduct] = useState<string | null>(null);
  const i = q.data;
  const run = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["discipline"] });
      showToast(done, "success");
      return true;
    } catch (err) {
      showToast(errorMessage(err), "error");
      return false;
    }
  };
  const openFile = async (fileId: string) => {
    try {
      window.open(await authedImageUrl(disciplineApi.filePath(id, fileId)), "_blank", "noopener");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const chosen = opts.data?.actions.find((a) => a.id === act.actionId);
  return (
    <Modal isOpen onClose={onClose} title={i ? `${i.positive ? "🌟 " : ""}${i.title}` : "Incident"} width="max-w-3xl">
      {!i ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {!i.positive && <Pill tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</Pill>}
            <Pill tone={i.status === "open" ? "warning" : "success"}>{i.status === "open" ? "Open" : i.positive ? "Positive note" : "Settled"}</Pill>
            {!i.parentsSee && <Pill>Parents don’t see this</Pill>}
            <span className="text-xs text-on-surface-variant">
              {i.type} · {when(i.occurredAt)}
              {i.place ? ` · ${i.place}` : ""} · recorded by {i.recordedBy}
            </span>
          </div>
          {i.details && <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm whitespace-pre-line">{i.details}</p>}
          {i.attachmentIds.length > 0 && (
            <div className="flex gap-2">
              {i.attachmentIds.map((f, n) => (
                <button key={f} type="button" onClick={() => openFile(f)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">
                  <span className="material-symbols-outlined text-sm">attach_file</span> File {n + 1}
                </button>
              ))}
            </div>
          )}
          <div>
            <p className={label}>Students</p>
            <ul className="mt-2 space-y-2">
              {i.students.map((s) => (
                <li key={s.id} className="rounded-xl border border-outline-variant/20 px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setConduct(s.studentId)} className="flex-1 text-left">
                      <span className="text-sm font-bold text-primary">{s.name}</span>{" "}
                      <span className="text-xs text-on-surface-variant">
                        {s.section} · {s.roleLabel}
                      </span>
                    </button>
                    {s.points !== 0 && <span className={cn("text-xs font-bold", s.points < 0 ? "text-error" : "text-green-700")}>{s.points > 0 ? `+${s.points}` : s.points}</span>}
                    {s.role !== "witness" && <Pill tone={s.informedHow === "none" ? "warning" : "success"}>{INFORMED[s.informedHow] ?? s.informedHow}</Pill>}
                    {s.acknowledgedAt && <Pill tone="success">Parent acknowledged</Pill>}
                  </div>
                  {s.parentReply && <p className="mt-1 text-xs">Parent: “{s.parentReply}”</p>}
                  {s.role !== "witness" && s.informedHow === "none" && !i.positive && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="tertiary" onClick={() => run(() => disciplineApi.informed(i.id, s.id, "alert"), "Parents told")}>
                        Tell parents now
                      </Button>
                      <Button variant="tertiary" onClick={() => run(() => disciplineApi.informed(i.id, s.id, "phone"), "Noted")}>
                        I phoned them
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {!i.positive && (
            <div>
              <div className="flex items-center justify-between">
                <p className={label}>Actions</p>
                {i.can.action && !adding && (
                  <Button variant="tertiary" onClick={() => setAdding(true)}>
                    Add an action
                  </Button>
                )}
              </div>
              <ul className="mt-2 space-y-1.5">
                {i.actions.map((a) => (
                  <li key={a.id} className="rounded-xl bg-surface-container-low px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="flex-1">
                        {a.action} · {a.student}
                        {a.fromDate ? ` · ${a.fromDate}${a.toDate ? ` – ${a.toDate}` : ""}` : ""}
                      </b>
                      {a.status === "pending" ? <Pill tone="warning">Waiting for approval</Pill> : a.status === "rejected" ? <Pill tone="danger">Refused</Pill> : <Pill tone="success">Done</Pill>}
                    </div>
                    <p className="text-xs text-on-surface-variant/70">
                      {a.decidedBy}
                      {a.note ? ` · ${a.note}` : ""}
                      {a.approvedBy && a.status !== "done" ? ` · answered by ${a.approvedBy}` : ""}
                      {a.answer ? ` · “${a.answer}”` : ""}
                    </p>
                    {a.status === "pending" && i.can.approve && (
                      <div className="mt-2 flex gap-2 justify-end">
                        <Button variant="tertiary" onClick={() => run(() => disciplineApi.answer(a.id, false, null), "Refused")}>
                          Refuse
                        </Button>
                        <Button onClick={() => run(() => disciplineApi.answer(a.id, true, null), "Approved")}>Approve</Button>
                      </div>
                    )}
                  </li>
                ))}
                {!i.actions.length && <li className="text-sm text-on-surface-variant">No action yet.</li>}
              </ul>
              {adding && opts.data && (
                <div className="mt-3 rounded-xl bg-surface-container-low p-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Action" value={act.actionId} onChange={(x) => setAct({ ...act, actionId: x })} options={[{ value: "", label: "Choose…" }, ...opts.data.actions.map((a) => ({ value: a.id, label: `${a.name}${a.approval ? " (needs approval)" : ""}` }))]} />
                    <Select label="For" value={act.studentId} onChange={(x) => setAct({ ...act, studentId: x })} options={[{ value: "", label: "All involved" }, ...i.students.filter((s) => s.role === "did").map((s) => ({ value: s.studentId, label: s.name }))]} />
                  </div>
                  {chosen?.dates && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="From" type="date" value={act.fromDate} onChange={(e) => setAct({ ...act, fromDate: e.target.value })} />
                      <Input label="To" type="date" value={act.toDate} onChange={(e) => setAct({ ...act, toDate: e.target.value })} />
                    </div>
                  )}
                  <Input label="Note" value={act.note} onChange={(e) => setAct({ ...act, note: e.target.value })} />
                  {chosen?.approval && !opts.data.can.approve && <FormAlert tone="info">This needs the principal’s approval; they are told.</FormAlert>}
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                    <Button
                      disabled={!act.actionId}
                      onClick={async () => {
                        if (await run(() => disciplineApi.addAction(i.id, { actionId: act.actionId, studentId: act.studentId || null, note: act.note || null, fromDate: act.fromDate || null, toDate: act.toDate || null }), "Saved")) {
                          setAdding(false);
                          setAct({ actionId: "", studentId: "", note: "", fromDate: "", toDate: "" });
                        }
                      }}
                    >
                      Save action
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {i.can.resolve && (
            <div className="flex justify-end border-t border-outline-variant/20 pt-3">
              {i.status === "open" ? <Button onClick={() => run(() => disciplineApi.resolve(i.id, true), "Settled")}>Mark settled</Button> : <Button variant="tertiary" onClick={() => run(() => disciplineApi.resolve(i.id, false), "Reopened")}>Reopen</Button>}
            </div>
          )}
        </div>
      )}
      {conduct && <ConductModal studentId={conduct} onClose={() => setConduct(null)} />}
    </Modal>
  );
}
