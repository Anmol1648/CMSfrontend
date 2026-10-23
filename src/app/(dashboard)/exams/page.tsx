"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { academicApi } from "@/lib/api/academic";
import { mastersApi } from "@/lib/api/masters";
import { useExamLabels } from "@/components/exams/useExamLabels";
import { Exam, EXAM_STATUS, ExamInput, ExamStatus, examsApi, ExamSubjectRow, Part } from "@/lib/api/exams";
import { cn } from "@/lib/utils";

const fmt = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "—");
const partsText = (ps: Part[]) => ps.map((p) => `${p.label} ${p.max}`).join(" + ");
/** "Written 80, Internal 20" (an exam type's parts in Masters) → parts. */
const parseParts = (text: string): Part[] =>
  text
    .split(/[,+]/)
    .map((x) => x.trim().match(/^(.*?)\s+(\d+(?:\.\d+)?)$/))
    .filter((m): m is RegExpMatchArray => !!m && !!m[1])
    .map((m, i) => ({ key: slug(m[1]) || `p${i + 1}`, label: m[1], max: Number(m[2]) }));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 10) || "p";

/** The parts of a subject (Written 80 + Internal 20): add, remove, rename, change maximum. */
function PartsEditor({ value, onChange, disabled }: { value: Part[]; onChange: (p: Part[]) => void; disabled?: boolean }) {
  const set = (i: number, patch: Partial<Part>) => onChange(value.map((p, k) => (k === i ? { ...p, ...patch, ...(patch.label !== undefined && !p.key ? { key: slug(patch.label) } : {}) } : p)));
  return (
    <div className="space-y-2">
      {value.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2 items-end">
          <Input label={i === 0 ? "Part" : undefined} value={p.label} onChange={(e) => set(i, { label: e.target.value })} disabled={disabled} maxLength={30} />
          <Input label={i === 0 ? "Max marks" : undefined} type="number" min={1} value={String(p.max)} onChange={(e) => set(i, { max: Number(e.target.value) })} disabled={disabled} />
          <button type="button" disabled={disabled || value.length === 1} onClick={() => onChange(value.filter((_, k) => k !== i))} className="pb-3 text-xs font-bold uppercase tracking-widest text-error disabled:opacity-30">
            Remove
          </button>
        </div>
      ))}
      {value.length < 6 && (
        <button type="button" disabled={disabled} onClick={() => onChange([...value, { key: `p${value.length + 1}`, label: "", max: 20 }])} className="text-xs font-bold uppercase tracking-widest text-primary">
          + Part
        </button>
      )}
      <p className="text-[11px] text-on-surface-variant/70">Total: {value.reduce((a, p) => a + (Number(p.max) || 0), 0)} marks</p>
    </div>
  );
}

function ExamForm({ yearId, exam, onClose }: { yearId: string; exam: Exam | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const classes = useQuery({ queryKey: ["academic-class-options", yearId], queryFn: () => academicApi.classOptions(yearId) });
  const terms = useQuery({ queryKey: ["exam-terms", yearId], queryFn: () => examsApi.terms(yearId) });
  const types = useQuery({ queryKey: ["master-options", "exam_type"], queryFn: () => mastersApi.options("exam_type"), staleTime: 5 * 60_000 });
  const [typeId, setTypeId] = useState("");
  const [v, setV] = useState<ExamInput>(
    exam
      ? { name: exam.name, shortName: exam.shortName, termId: exam.termId, classIds: exam.classIds, components: exam.components, weightage: exam.weightage, countsInResult: exam.countsInResult, entryDeadline: exam.entryDeadline }
      : { name: "", shortName: null, termId: null, classIds: [], components: [{ key: "th", label: "Written", max: 80 }, { key: "ia", label: "Internal", max: 20 }], weightage: 0, countsInResult: true, entryDeadline: null }
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!exam && classes.data && !v.classIds.length) setV((x) => ({ ...x, classIds: classes.data.map((c) => c.id) }));
  }, [classes.data, exam, v.classIds.length]);
  const set = (patch: Partial<ExamInput>) => setV((x) => ({ ...x, ...patch }));
  /** An exam type (Masters → Exam types) fills in the name, parts and weightage. */
  const chooseType = (id: string) => {
    setTypeId(id);
    const t = types.data?.find((x) => x.id === id);
    if (!t) return;
    const parts = parseParts(String(t.extra.parts ?? ""));
    setV((x) => ({ ...x, name: x.name || t.name, shortName: x.shortName || t.code || null, ...(parts.length ? { components: parts } : {}), ...(t.extra.weightage != null && t.extra.weightage !== "" ? { weightage: Number(t.extra.weightage) } : {}) }));
  };
  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const input = { ...v, components: v.components.map((p, i) => ({ ...p, key: p.key || slug(p.label) || `p${i + 1}`, max: Number(p.max) })) };
      if (exam) await examsApi.save(exam.id, input);
      else await examsApi.create(yearId, input);
      showToast(`${v.name} saved: its subjects come from each class’s subjects`, "success");
      queryClient.invalidateQueries({ queryKey: ["exams", yearId] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={exam ? `Edit ${exam.name}` : "Add an exam"} width="max-w-3xl">
      <div className="space-y-4">
        {!exam && !!types.data?.length && (
          <Select label="Type (fills in the parts and weightage; Masters → Exam types)" value={typeId} onChange={chooseType} options={[{ value: "", label: "Choose…" }, ...types.data.map((t) => ({ value: t.id, label: `${t.name}${t.extra.parts ? ` · ${String(t.extra.parts)}` : ""}` }))]} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-4">
          <Input label="Exam" value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Half-Yearly" maxLength={60} />
          <Input label="Short name (report card)" value={v.shortName ?? ""} onChange={(e) => set({ shortName: e.target.value || null })} placeholder="HY" maxLength={12} />
          <Select label="Term" value={v.termId ?? ""} onChange={(x) => set({ termId: x || null })} options={[{ value: "", label: "No term" }, ...(terms.data ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input label="Weightage in the result (%)" type="number" min={0} max={100} value={String(v.weightage)} onChange={(e) => set({ weightage: Number(e.target.value) })} />
          <Input label="Last date for marks" type="date" value={v.entryDeadline ?? ""} onChange={(e) => set({ entryDeadline: e.target.value || null })} />
          <div className="pb-3">
            <Checkbox label="Counts in the result" checked={v.countsInResult} onChange={(c) => set({ countsInResult: c })} />
          </div>
        </div>
        <div className="rounded-xl bg-surface-container-low p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Each subject’s parts (a subject can be changed later, e.g. Science with a practical)</p>
          <PartsEditor value={v.components} onChange={(components) => set({ components })} />
        </div>
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Classes taking it</span>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 rounded-xl bg-surface-container-low p-3">
            {(classes.data ?? []).map((c) => (
              <Checkbox key={c.id} label={c.name} checked={v.classIds.includes(c.id)} onChange={(on) => set({ classIds: on ? [...v.classIds, c.id] : v.classIds.filter((x) => x !== c.id) })} />
            ))}
          </div>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={v.name.trim().length < 2 || !v.classIds.length}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** One exam: its subjects per class (parts, date sheet), progress of marks entry, and its status. */
function ExamDetail({ exam, onBack }: { exam: Exam; onBack: () => void }) {
  const labels = useExamLabels();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("subjects");
  const q = useQuery({ queryKey: ["exam-subjects", exam.id], queryFn: () => examsApi.subjects(exam.id) });
  const prog = useQuery({ queryKey: ["exam-progress", exam.id], queryFn: () => examsApi.progress(exam.id), enabled: tab === "progress" });
  const [edits, setEdits] = useState<Record<string, Partial<ExamSubjectRow>>>({});
  const [parts, setParts] = useState<ExamSubjectRow | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const d = q.data;
  const locked = exam.status === "published";
  const row = (r: ExamSubjectRow) => ({ ...r, ...edits[r.id] });
  const change = (id: string, patch: Partial<ExamSubjectRow>) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await examsApi.saveSubjects(
        exam.id,
        Object.entries(edits).map(([id, p]) => ({ id, ...p }))
      );
      setWarnings(r.warnings ?? []);
      setEdits({});
      queryClient.setQueryData(["exam-subjects", exam.id], r);
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const publishSheet = async () => {
    if (!(await confirm({ title: `Publish the date sheet of ${exam.name}?`, message: "It goes on the School Calendar and as a notice to the students, parents and staff of these classes.", confirmLabel: "Publish" }))) return;
    try {
      queryClient.setQueryData(["exam-subjects", exam.id], await examsApi.publishDatesheet(exam.id));
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      showToast("Date sheet published", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const dirty = Object.keys(edits).length;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        All exams
      </button>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-primary">{exam.name}</h2>
          <p className="text-sm text-on-surface-variant/70">
            {exam.term ?? "No term"} · {partsText(exam.components)} · weightage {exam.weightage}% · marks by {fmt(exam.entryDeadline)}
          </p>
        </div>
        <Pill tone={EXAM_STATUS[exam.status].tone}>{labels.stage(exam.status)}</Pill>
      </Card>
      <Tabs
        tabs={[
          { id: "subjects", label: "Subjects & date sheet" },
          { id: "progress", label: "Marks entry progress" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      {tab === "subjects" && (
        <>
          {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
          {!d && !q.isError && <PageLoader />}
          {warnings.length > 0 && <FormAlert tone="warning">{warnings.join(" · ")}</FormAlert>}
          {d && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-on-surface-variant/70">{d.exam.datesheetPublished ? "Date sheet published (publish again after changes)." : "Give each paper its date and time, then publish the date sheet."}</p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={publishSheet} disabled={!!dirty}>
                    Publish date sheet
                  </Button>
                  <Button onClick={save} loading={busy} disabled={!dirty || locked}>
                    Save{dirty ? ` (${dirty})` : ""}
                  </Button>
                </div>
              </div>
              {d.classes.map((c) => (
                <Card key={c.id} padding="none" className="overflow-hidden">
                  <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">{c.name}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm mt-2">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                          <th className="px-4 py-2 font-bold">Subject</th>
                          <th className="px-4 py-2 font-bold">Parts (marks)</th>
                          <th className="px-4 py-2 font-bold">Date</th>
                          <th className="px-4 py-2 font-bold">From</th>
                          <th className="px-4 py-2 font-bold">To</th>
                          <th className="px-4 py-2 font-bold">Room</th>
                          <th className="px-4 py-2 font-bold">Marks in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.subjects.map((s0) => {
                          const s = row(s0);
                          const cell = "rounded-lg bg-surface-container-low px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-60";
                          return (
                            <tr key={s.id} className={cn("border-t border-outline-variant/10", edits[s.id] && "bg-amber-50/40")}>
                              <td className="px-4 py-2 font-semibold whitespace-nowrap">{s.subject}</td>
                              <td className="px-4 py-2 text-xs whitespace-nowrap">
                                <button type="button" disabled={locked} onClick={() => setParts(s)} className="text-left hover:text-primary">
                                  {partsText(s.components)} <span className="text-on-surface-variant/60">= {s.components.reduce((a, p) => a + p.max, 0)}</span>
                                </button>
                              </td>
                              <td className="px-4 py-2">
                                <input type="date" aria-label={`${s.subject} date`} value={s.date ?? ""} disabled={locked} onChange={(e) => change(s.id, { date: e.target.value || null })} className={cell} />
                              </td>
                              <td className="px-4 py-2">
                                <input type="time" aria-label={`${s.subject} start`} value={s.startTime ?? ""} disabled={locked} onChange={(e) => change(s.id, { startTime: e.target.value || null })} className={cell} />
                              </td>
                              <td className="px-4 py-2">
                                <input type="time" aria-label={`${s.subject} end`} value={s.endTime ?? ""} disabled={locked} onChange={(e) => change(s.id, { endTime: e.target.value || null })} className={cell} />
                              </td>
                              <td className="px-4 py-2">
                                <input aria-label={`${s.subject} room`} value={s.room ?? ""} disabled={locked} maxLength={30} onChange={(e) => change(s.id, { room: e.target.value || null })} className={cn(cell, "w-20")} />
                              </td>
                              <td className="px-4 py-2 text-xs">{s0.marksEntered || "—"}</td>
                            </tr>
                          );
                        })}
                        {!c.subjects.length && (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-on-surface-variant/70">
                              No subjects: add the class’s subjects in Academic → Subjects.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}
      {tab === "progress" && (
        <>
          {!prog.data ? (
            <PageLoader />
          ) : (
            <Card padding="none" className="overflow-hidden">
              <p className="px-5 pt-4 text-sm">
                <b>{prog.data.totals.complete}</b> of {prog.data.totals.sheets} subject sheets complete · {prog.data.totals.entered} of {prog.data.totals.students} marks
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                      <th className="px-5 py-2 font-bold">Section</th>
                      <th className="px-5 py-2 font-bold">Subject</th>
                      <th className="px-5 py-2 font-bold">Teacher</th>
                      <th className="px-5 py-2 font-bold">Entered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prog.data.rows.map((r) => (
                      <tr key={`${r.sectionId}-${r.examSubjectId}`} className="border-t border-outline-variant/10">
                        <td className="px-5 py-2">{r.section}</td>
                        <td className="px-5 py-2">{r.subject}</td>
                        <td className="px-5 py-2 text-xs">{r.teacher ?? <span className="text-amber-700">no teacher assigned</span>}</td>
                        <td className={cn("px-5 py-2 font-semibold", r.students && r.entered >= r.students ? "text-emerald-700" : r.entered ? "text-amber-700" : "text-error")}>
                          {r.entered}/{r.students}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
      {parts && (
        <Modal isOpen onClose={() => setParts(null)} title={`${parts.subject}: parts and marks`}>
          <PartsForSubject
            initial={row(parts).components}
            hasMarks={parts.marksEntered > 0}
            onDone={(components) => {
              change(parts.id, { components });
              setParts(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PartsForSubject({ initial, hasMarks, onDone }: { initial: Part[]; hasMarks: boolean; onDone: (p: Part[]) => void }) {
  const [p, setP] = useState(initial);
  return (
    <div className="space-y-4">
      {hasMarks && <FormAlert tone="info">Marks are entered: you can change the maximum marks, but not add or remove parts.</FormAlert>}
      <PartsEditor value={p} onChange={setP} />
      <div className="flex justify-end">
        <Button onClick={() => onDone(p.map((x, i) => ({ ...x, key: x.key || slug(x.label) || `p${i + 1}`, max: Number(x.max) })))}>Use these (then Save)</Button>
      </div>
    </div>
  );
}

function TermsBar({ yearId }: { yearId: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const terms = useQuery({ queryKey: ["exam-terms", yearId], queryFn: () => examsApi.terms(yearId) });
  const [edit, setEdit] = useState<{ id: string | null; name: string; startDate: string; endDate: string } | null>(null);
  const save = async () => {
    if (!edit) return;
    try {
      queryClient.setQueryData(["exam-terms", yearId], await examsApi.saveTerm(yearId, edit.id, { name: edit.name, startDate: edit.startDate || null, endDate: edit.endDate || null }));
      setEdit(null);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Card className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Terms</span>
      {(terms.data ?? []).map((t) => (
        <button key={t.id} type="button" onClick={() => setEdit({ id: t.id, name: t.name, startDate: t.startDate ?? "", endDate: t.endDate ?? "" })} className="rounded-xl bg-surface-container-low px-3 py-1.5 text-sm hover:bg-surface-container">
          <b>{t.name}</b> <span className="text-[11px] text-on-surface-variant/70">{t.startDate ? `${fmt(t.startDate)} – ${fmt(t.endDate)}` : ""}</span>
        </button>
      ))}
      <button type="button" onClick={() => setEdit({ id: null, name: `Term ${(terms.data?.length ?? 0) + 1}`, startDate: "", endDate: "" })} className="text-xs font-bold uppercase tracking-widest text-primary">
        + Term
      </button>
      {edit && (
        <Modal isOpen onClose={() => setEdit(null)} title={edit.id ? `Edit ${edit.name}` : "Add a term"}>
          <div className="space-y-4">
            <Input label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={40} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="From (for attendance)" type="date" value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} />
              <Input label="To" type="date" value={edit.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} />
            </div>
            <div className="flex justify-between gap-3">
              {edit.id ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      queryClient.setQueryData(["exam-terms", yearId], await examsApi.deleteTerm(edit.id!));
                      setEdit(null);
                    } catch (err) {
                      showToast(errorMessage(err), "error");
                    }
                  }}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={save} disabled={!edit.name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

const NEXT: Record<ExamStatus, { to: ExamStatus; label: string; message: string; perm: string }[]> = {
  draft: [{ to: "open", label: "Open marks entry", message: "Subject teachers can enter marks until the last date.", perm: "exam.setup" }],
  open: [{ to: "locked", label: "Lock entry", message: "Teachers can no longer change marks (moderation still can).", perm: "exam.setup" }, { to: "draft", label: "Back to set-up", message: "Marks entry closes until it is opened again.", perm: "exam.setup" }],
  locked: [{ to: "published", label: "Publish results", message: "Students and parents can see the results and report cards.", perm: "exam.publish" }, { to: "open", label: "Reopen entry", message: "Teachers can change marks again.", perm: "exam.setup" }],
  published: [{ to: "locked", label: "Unpublish", message: "Students and parents no longer see these results.", perm: "exam.publish" }],
};
/** With locking optional (System Settings → Exams), results can be published straight from entry. */
const stepsOf = (status: ExamStatus, lockBeforePublish: boolean) =>
  status === "open" && !lockBeforePublish ? [...NEXT.open, { ...NEXT.locked[0], message: "Marks entry closes, and students and parents can see the results and report cards." }] : NEXT[status];

function ExamsScreen() {
  const labels = useExamLabels();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const [yearId, setYearId] = useState("");
  const [editing, setEditing] = useState<Exam | "new" | null>(null);
  const [open, setOpen] = useState<Exam | null>(null);
  const list = useQuery({ queryKey: ["exams", yearId], queryFn: () => examsApi.list(yearId), enabled: !!yearId });
  const step = async (e: Exam, s: (typeof NEXT)[ExamStatus][number]) => {
    if (!(await confirm({ title: `${s.label}: ${e.name}?`, message: s.message, confirmLabel: s.label }))) return;
    try {
      await examsApi.status(e.id, s.to);
      queryClient.invalidateQueries({ queryKey: ["exams", yearId] });
      showToast(`${e.name}: ${labels.stage(s.to)}`, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async (e: Exam) => {
    if (!(await confirm({ title: `Delete ${e.name}?`, message: "Only an exam without marks can be deleted.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await examsApi.remove(e.id);
      queryClient.invalidateQueries({ queryKey: ["exams", yearId] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const current = open ? (list.data ?? []).find((e) => e.id === open.id) ?? open : null;
  return (
    <>
      <PageHeader
        title="Exams & Date Sheets"
        description="Terms and exams of a session, each exam’s subjects with their parts and maximum marks, the date sheet, and marks entry from opening to published results."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/exams/setup" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Grading & result rules
            </Link>
            <Button onClick={() => setEditing("new")} disabled={!yearId}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Add exam
            </Button>
          </div>
        }
      />
      <div className="space-y-4">
        <div className="w-full sm:w-72">
          <YearSelect value={yearId} onChange={(id) => { setYearId(id); setOpen(null); }} />
        </div>
        {yearId && <TermsBar yearId={yearId} />}
        {current ? (
          <ExamDetail exam={current} onBack={() => setOpen(null)} />
        ) : (
          <>
            {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
            {yearId && !list.data && !list.isError && <PageLoader />}
            {list.data && (
              <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                        <th className="px-5 py-3 font-bold">Exam</th>
                        <th className="px-5 py-3 font-bold">Term</th>
                        <th className="px-5 py-3 font-bold">Marks</th>
                        <th className="px-5 py-3 font-bold">Weightage</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {list.data.map((e) => (
                        <tr key={e.id} className="border-t border-outline-variant/10 align-top">
                          <td className="px-5 py-3">
                            <button type="button" className="font-semibold text-left hover:text-primary" onClick={() => setOpen(e)}>
                              {e.name}
                            </button>
                            <p className="text-[11px] text-on-surface-variant/70">
                              {e.classIds.length} classes · {e.subjects} subject papers{e.datesheetPublished ? " · date sheet out" : ""}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-xs">{e.term ?? "—"}</td>
                          <td className="px-5 py-3 text-xs">{partsText(e.components)}</td>
                          <td className="px-5 py-3 text-xs">{e.countsInResult ? `${e.weightage}%` : "not counted"}</td>
                          <td className="px-5 py-3">
                            <Pill tone={EXAM_STATUS[e.status].tone}>{labels.stage(e.status)}</Pill>
                            {e.entryDeadline && e.status === "open" && <p className="text-[11px] text-on-surface-variant/70 mt-1">marks by {fmt(e.entryDeadline)}</p>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
                              {stepsOf(e.status, labels.lockBeforePublish).filter((s) => can(s.perm)).map((s) => (
                                <button key={s.to} type="button" onClick={() => step(e, s)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                                  {s.label}
                                </button>
                              ))}
                              <button type="button" onClick={() => setOpen(e)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                                Subjects
                              </button>
                              {e.status !== "published" && (
                                <button type="button" onClick={() => setEditing(e)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                                  Edit
                                </button>
                              )}
                              {e.status === "draft" && (
                                <button type="button" onClick={() => remove(e)} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!list.data.length && (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-on-surface-variant/70">
                            No exams in this session yet. Add terms, then exams (Periodic Test 1, Half-Yearly…).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
      {editing && <ExamForm yearId={yearId} exam={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function ExamsPage() {
  return (
    <RequirePermission permission="exam.setup">
      <ExamsScreen />
    </RequirePermission>
  );
}
