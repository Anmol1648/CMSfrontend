"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { EXAM_STATUS, examsApi, MarkStatus } from "@/lib/api/exams";
import { useExamLabels } from "@/components/exams/useExamLabels";
import { mastersApi } from "@/lib/api/masters";
import { exams2Api, Health } from "@/lib/api/exams2";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type Row = { status: MarkStatus; marks: Record<string, string> };

/** One subject of one section: a mark (or grade) per student, part by part. */
function MarksSheet({ subject, section, onBack }: { subject: string; section: string; onBack: () => void }) {
  const labels = useExamLabels();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["exam-sheet", subject, section], queryFn: () => examsApi.sheet(subject, section) });
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = q.data;
  useEffect(() => {
    if (s) setRows(Object.fromEntries(s.students.map((st) => [st.id, { status: st.status, marks: Object.fromEntries(Object.entries(st.marks).map(([k, v]) => [k, v == null ? "" : String(v)])) }])));
  }, [s]);
  const original = useMemo(() => (s ? JSON.stringify(Object.fromEntries(s.students.map((st) => [st.id, { status: st.status, marks: Object.fromEntries(Object.entries(st.marks).map(([k, v]) => [k, v == null ? "" : String(v)])) }]))) : ""), [s]);
  const dirty = !!s && JSON.stringify(rows) !== original;
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!s) return <PageLoader />;
  const can = s.edit.can;
  const set = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const totalOf = (r: Row) => {
    const vals = s.parts.map((p) => r.marks[p.key]).filter((x) => x !== "" && x != null).map(Number);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const saved = await examsApi.saveSheet(
        subject,
        section,
        s.students.map((st) => {
          const r = rows[st.id];
          return { studentId: st.id, status: r.status, marks: s.descriptive ? { grade: r.marks.grade || null } : Object.fromEntries(s.parts.map((p) => [p.key, r.marks[p.key] === "" || r.marks[p.key] == null ? null : Number(r.marks[p.key])])) };
        })
      );
      queryClient.setQueryData(["exam-sheet", subject, section], saved);
      queryClient.invalidateQueries({ queryKey: ["exam-sheets"] });
      showToast(`${s.subject} · ${s.section}: saved`, "success");
    } catch (err) {
      const e = err as { fieldErrors?: () => Record<string, string> };
      if (typeof e.fieldErrors === "function") setErrors(e.fieldErrors());
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const filled = s.students.filter((st) => {
    const r = rows[st.id];
    return r && (r.status !== "P" || (s.descriptive ? !!r.marks.grade : s.parts.some((p) => r.marks[p.key] !== "" && r.marks[p.key] != null)));
  }).length;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        My sheets
      </button>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-primary">
            {s.subject} · {s.section}
          </h2>
          <p className="text-sm text-on-surface-variant/70">
            {s.exam.name} · {s.descriptive ? "grades" : `${s.parts.map((p) => `${p.label} ${p.max}`).join(" + ")} = ${s.max}`} · pass {s.passPercent}% · {filled} of {s.students.length} filled
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exams2Api.sheetExcel(subject, section).catch((e) => showToast(errorMessage(e), "error"))}>
            <span className="material-symbols-outlined text-lg">download</span> Excel
          </Button>
          {can && (
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <span className="material-symbols-outlined text-lg">upload</span> Fill from Excel
            </Button>
          )}
          {s.lock?.canUnlock && (
            <Button variant="secondary" onClick={() => exams2Api.unlockSheet(subject, section).then(() => { void q.refetch(); queryClient.invalidateQueries({ queryKey: ["exam-sheets"] }); showToast("Unlocked", "success"); }).catch((e) => showToast(errorMessage(e), "error"))}>
              Unlock
            </Button>
          )}
          {can && !s.lock && !dirty && s.students.length > 0 && (
            <Button variant="secondary" onClick={() => exams2Api.submitSheet(subject, section).then(() => { void q.refetch(); queryClient.invalidateQueries({ queryKey: ["exam-sheets"] }); showToast("Submitted: the marks are locked", "success"); }).catch((e) => showToast(errorMessage(e), "error"))}>
              <span className="material-symbols-outlined text-lg">lock</span> Submit marks
            </Button>
          )}
          <Button onClick={save} loading={busy} disabled={!can || !dirty}>
            {dirty ? "Save" : "Saved"}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const r = await exams2Api.readSheetExcel(subject, section, f);
              setRows((cur) => {
                const next = { ...cur };
                for (const x of r.rows) next[x.studentId] = { status: x.status, marks: Object.fromEntries(Object.entries(x.marks).map(([k, v]) => [k, v == null ? "" : String(v)])) };
                return next;
              });
              setImportIssues(r.issues);
              showToast(`${r.rows.length} row(s) filled from the file: check them and Save`, r.issues.length ? "error" : "success");
            } catch (er) {
              showToast(errorMessage(er), "error");
            }
          }}
        />
      </Card>
      {s.lock && <FormAlert tone="info">Submitted by {s.lock.by} on {new Date(s.lock.at).toLocaleString("en-IN")}.{s.lock.canUnlock ? " You can unlock it to change." : ""}</FormAlert>}
      {importIssues.length > 0 && <FormAlert tone="warning">From the file: {importIssues.slice(0, 6).join("; ")}{importIssues.length > 6 ? "…" : ""}</FormAlert>}
      {s.edit.why && <FormAlert tone={can ? "warning" : "info"}>{s.edit.why}</FormAlert>}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                <th className="px-4 py-3 font-bold">Roll</th>
                <th className="px-4 py-3 font-bold">Student</th>
                <th className="px-4 py-3 font-bold">Present?</th>
                {s.descriptive ? (
                  <th className="px-4 py-3 font-bold">Grade</th>
                ) : (
                  s.parts.map((p) => (
                    <th key={p.key} className="px-4 py-3 font-bold">
                      {p.label} <span className="normal-case tracking-normal font-medium">/{p.max}</span>
                    </th>
                  ))
                )}
                {!s.descriptive && <th className="px-4 py-3 font-bold">Total /{s.max}</th>}
              </tr>
            </thead>
            <tbody>
              {s.students.map((st, i) => {
                const r = rows[st.id] ?? { status: "P", marks: {} };
                const t = totalOf(r);
                const low = t != null && s.max && (t / s.max) * 100 < s.passPercent;
                return (
                  <tr key={st.id} className={cn("border-t border-outline-variant/10", r.status !== "P" && "bg-surface-container-low/60")}>
                    <td className="px-4 py-1.5 text-xs">{st.roll ?? "—"}</td>
                    <td className="px-4 py-1.5">
                      <p className="font-semibold">{st.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{st.admissionNo}</p>
                    </td>
                    <td className="px-4 py-1.5">
                      <select aria-label={`${st.name} present`} value={r.status} disabled={!can} onChange={(e) => set(st.id, { status: e.target.value as MarkStatus })} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-xs font-bold text-primary outline-none disabled:opacity-60">
                        <option value="P">{labels.present}</option>
                        {labels.statuses
                          .filter((x) => x.active || x.code === r.status)
                          .map((x) => (
                            <option key={x.code} value={x.code}>
                              {x.name} ({x.code})
                            </option>
                          ))}
                      </select>
                    </td>
                    {s.descriptive ? (
                      <td className="px-4 py-1.5">
                        <select aria-label={`${st.name} grade`} value={r.marks.grade ?? ""} disabled={!can || r.status !== "P"} onChange={(e) => set(st.id, { marks: { grade: e.target.value } })} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-sm outline-none disabled:opacity-60">
                          <option value="">—</option>
                          {s.grades.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      s.parts.map((p) => {
                        const err = errors[`rows.${i}.${p.key}`];
                        const v = r.marks[p.key] ?? "";
                        const over = v !== "" && (Number(v) > p.max || Number(v) < 0);
                        return (
                          <td key={p.key} className="px-4 py-1.5">
                            <input
                              aria-label={`${st.name} ${p.label}`}
                              inputMode="decimal"
                              value={v}
                              disabled={!can || r.status !== "P"}
                              onChange={(e) => set(st.id, { marks: { ...r.marks, [p.key]: e.target.value.replace(/[^0-9.]/g, "") } })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "ArrowDown") {
                                  e.preventDefault();
                                  (document.querySelector(`[data-cell="${i + 1}-${p.key}"]`) as HTMLInputElement | null)?.focus();
                                }
                                if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  (document.querySelector(`[data-cell="${i - 1}-${p.key}"]`) as HTMLInputElement | null)?.focus();
                                }
                              }}
                              data-cell={`${i}-${p.key}`}
                              className={cn("w-20 rounded-lg bg-surface-container-low px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50", (over || err) && "ring-2 ring-error/60")}
                              title={err ?? (over ? `0 to ${p.max}` : undefined)}
                            />
                          </td>
                        );
                      })
                    )}
                    {!s.descriptive && <td className={cn("px-4 py-1.5 font-bold", low ? "text-error" : "text-on-surface")}>{r.status === "P" ? (t ?? "—") : r.status}</td>}
                  </tr>
                );
              })}
              {!s.students.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-on-surface-variant/70">
                    No students take this subject in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-on-surface-variant/60">Enter or ↓ moves down a column. Leave a mark empty if it isn’t known yet; Absent counts as 0, Medical and Not taking are left out.</p>
    </div>
  );
}

/** The class teacher's sheet: co-scholastic grades, discipline and a remark per student. */
function ClassSheet({ examId, section, onBack }: { examId: string; section: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["exam-class-sheet", examId, section], queryFn: () => examsApi.classSheet(examId, section) });
  const remarks = useQuery({ queryKey: ["master-options", "report_remark"], queryFn: () => mastersApi.options("report_remark"), staleTime: 5 * 60_000 });
  const [rows, setRows] = useState<Record<string, { coGrades: Record<string, string>; discipline: string; remark: string }>>({});
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const s = q.data;
  useEffect(() => {
    if (s) setRows(Object.fromEntries(s.students.map((st) => [st.id, { coGrades: st.coGrades, discipline: st.discipline, remark: st.remark }])));
  }, [s]);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!s) return <PageLoader />;
  const save = async () => {
    setBusy(true);
    try {
      queryClient.setQueryData(["exam-class-sheet", examId, section], await examsApi.saveClassSheet(examId, section, s.students.map((st) => ({ studentId: st.id, coGrades: rows[st.id]?.coGrades ?? {}, discipline: rows[st.id]?.discipline || null, remark: rows[st.id]?.remark || null }))));
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const grade = (value: string, onChange: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} disabled={!s.edit.can} onChange={(e) => onChange(e.target.value)} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-sm outline-none disabled:opacity-60">
      <option value="">—</option>
      {s.grades.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        My sheets
      </button>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-primary">{s.section}: co-scholastic and remarks</h2>
          <p className="text-sm text-on-surface-variant/70">{s.exam.name}</p>
        </div>
        <Button onClick={save} loading={busy} disabled={!s.edit.can}>
          Save
        </Button>
      </Card>
      {s.edit.why && <FormAlert tone="info">{s.edit.why}</FormAlert>}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                <th className="px-4 py-3 font-bold">Student</th>
                {s.areas.map((a) => (
                  <th key={a.id} className="px-4 py-3 font-bold">
                    {a.name}
                  </th>
                ))}
                <th className="px-4 py-3 font-bold">Discipline</th>
                <th className="px-4 py-3 font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {s.students.map((st) => {
                const r = rows[st.id] ?? { coGrades: {}, discipline: "", remark: "" };
                const set = (patch: Partial<typeof r>) => setRows((x) => ({ ...x, [st.id]: { ...r, ...patch } }));
                return (
                  <tr key={st.id} className="border-t border-outline-variant/10">
                    <td className="px-4 py-1.5 font-semibold whitespace-nowrap">
                      {st.roll ? `${st.roll}. ` : ""}
                      {st.name}
                    </td>
                    {s.areas.map((a) => (
                      <td key={a.id} className="px-4 py-1.5">
                        {grade(r.coGrades[a.id] ?? "", (v) => set({ coGrades: { ...r.coGrades, [a.id]: v } }), `${st.name} ${a.name}`)}
                      </td>
                    ))}
                    <td className="px-4 py-1.5">{grade(r.discipline, (v) => set({ discipline: v }), `${st.name} discipline`)}</td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1">
                        <input aria-label={`${st.name} remark`} list="report-remarks" value={r.remark} disabled={!s.edit.can} maxLength={300} onChange={(e) => set({ remark: e.target.value })} className="w-64 rounded-lg bg-surface-container-low px-2 py-1.5 text-sm outline-none disabled:opacity-60" placeholder="e.g. Sincere and regular" />
                        {s.edit.can && (
                          <button
                            type="button"
                            title="Suggest a remark with AI from the student’s result"
                            className="p-1 text-primary disabled:opacity-40"
                            disabled={aiBusy === st.id}
                            onClick={async () => {
                              setAiBusy(st.id);
                              try {
                                set({ remark: (await exams2Api.aiRemark("exam", examId, section, st.id)).remark.slice(0, 300) });
                              } catch (e) {
                                showToast(errorMessage(e), "error");
                              } finally {
                                setAiBusy(null);
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-lg">{aiBusy === st.id ? "hourglass_top" : "auto_awesome"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Ready remarks (Masters → Report card remarks): typed or picked. */}
      <datalist id="report-remarks">
        {(remarks.data ?? []).map((m) => (
          <option key={m.id} value={m.name} />
        ))}
      </datalist>
      {!s.areas.length && <p className="text-xs text-on-surface-variant/70">No co-scholastic subjects for this class (Academic → Subjects: Art, Work Education, PE…).</p>}
    </div>
  );
}

function Entry() {
  const { can } = useAuth();
  const [yearId, setYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [open, setOpen] = useState<{ kind: "marks"; subject: string; section: string } | { kind: "class"; section: string } | null>(null);
  const exams = useQuery({ queryKey: ["exam-entry", yearId], queryFn: () => examsApi.entryExams(yearId), enabled: !!yearId });
  useEffect(() => {
    if (!examId && exams.data?.length) setExamId((exams.data.find((e) => e.status === "open") ?? exams.data[exams.data.length - 1]).id);
  }, [exams.data, examId]);
  const sheets = useQuery({ queryKey: ["exam-sheets", examId], queryFn: () => examsApi.sheets(examId), enabled: !!examId });
  const d = sheets.data;
  const [healthFor, setHealthFor] = useState<{ sectionId: string; section: string } | null>(null);
  return (
    <>
      <PageHeader title="Enter Marks" description={can("exam.marks_any") ? "Every section and subject (you can enter for anyone)." : "The subjects you teach (Staff → Subject Teachers), and, as class teacher, co-scholastic grades and remarks."} />
      {open?.kind === "marks" ? (
        <MarksSheet subject={open.subject} section={open.section} onBack={() => setOpen(null)} />
      ) : open?.kind === "class" ? (
        <ClassSheet examId={examId} section={open.section} onBack={() => setOpen(null)} />
      ) : (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-56">
              <YearSelect value={yearId} onChange={(id) => { setYearId(id); setExamId(""); }} />
            </div>
            <Select label="Exam" value={examId} onChange={setExamId} options={[{ value: "", label: exams.data?.length ? "Choose…" : "No exam open" }, ...(exams.data ?? []).map((e) => ({ value: e.id, label: `${e.name} · ${EXAM_STATUS[e.status].label}` }))]} className="w-full sm:w-80" />
          </Card>
          {d?.edit.why && <FormAlert tone="info">{d.edit.why}</FormAlert>}
          {examId && !d && !sheets.isError && <PageLoader />}
          {sheets.isError && <FormAlert>{errorMessage(sheets.error)}</FormAlert>}
          {d && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {d.sheets.map((sh) => (
                  <button key={`${sh.examSubjectId}-${sh.sectionId}`} type="button" onClick={() => setOpen({ kind: "marks", subject: sh.examSubjectId, section: sh.sectionId })} className="text-left">
                    <Card padding="sm" className="hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{sh.subject}</p>
                          <p className="text-xs text-on-surface-variant/70">
                            {sh.section} · out of {sh.max}
                          </p>
                        </div>
                        <span className="flex gap-1">
                          {sh.submitted && <Pill tone="success">Submitted</Pill>}
                          {sh.mine && <Pill tone="primary">Mine</Pill>}
                        </span>
                      </div>
                      <p className={cn("text-xs font-bold mt-2", sh.entered ? "text-emerald-700" : "text-amber-700")}>{sh.entered ? `${sh.entered} marks entered` : "Not started"}</p>
                    </Card>
                  </button>
                ))}
              </div>
              {!d.sheets.length && <Card className="text-center text-on-surface-variant/70 py-10">No subjects for you in this exam. Subject teachers are set in Staff → Subject Teachers.</Card>}
              {d.classTeacherOf.length > 0 && (
                <Card className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary">Co-scholastic grades and remarks</h3>
                  <div className="flex flex-wrap gap-2">
                    {d.classTeacherOf.map((c) => (
                      <Button key={c.sectionId} variant="secondary" onClick={() => setOpen({ kind: "class", section: c.sectionId })}>
                        {c.section}
                      </Button>
                    ))}
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary pt-2">Health and activities (report card)</h3>
                  <div className="flex flex-wrap gap-2">
                    {d.classTeacherOf.map((c) => (
                      <Button key={c.sectionId} variant="secondary" onClick={() => setHealthFor(c)}>
                        {c.section}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
      {healthFor && <HealthSheet sectionId={healthFor.sectionId} label={healthFor.section} onClose={() => setHealthFor(null)} />}
    </>
  );
}

/** Height, weight, vision and activities of a section for a term (shown on the report card). */
function HealthSheet({ sectionId, label, onClose }: { sectionId: string; label: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [term, setTerm] = useState("year");
  const q = useQuery({ queryKey: ["exams2", "health", sectionId, term], queryFn: () => exams2Api.health(sectionId, term) });
  const [rows, setRows] = useState<Health["students"]>([]);
  useEffect(() => {
    if (q.data) setRows(q.data.students);
  }, [q.data]);
  const set = (id: string, patch: Partial<Health["students"][number]>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const num = (v: string) => (v.trim() === "" ? null : Number(v) || null);
  return (
    <Modal isOpen onClose={onClose} title={`Health and activities · ${label}`} width="max-w-5xl">
      <div className="space-y-3">
        <Select className="max-w-xs" label="For" value={term} onChange={setTerm} options={[{ value: "year", label: "The whole session" }, ...(q.data?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
        {q.isLoading ? (
          <PageLoader />
        ) : q.error ? (
          <FormAlert>{errorMessage(q.error)}</FormAlert>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                  <th className="py-1">Student</th>
                  <th>Height (cm)</th>
                  <th>Weight (kg)</th>
                  <th>Vision</th>
                  <th>Activities / sports / clubs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10">
                    <td className="py-1 font-semibold whitespace-nowrap">
                      {r.roll ? `${r.roll}. ` : ""}
                      {r.name}
                    </td>
                    <td><input inputMode="decimal" value={r.heightCm ?? ""} onChange={(e) => set(r.id, { heightCm: num(e.target.value) })} className="w-20 rounded-lg bg-surface-container-low px-2 py-1" aria-label={`${r.name} height`} /></td>
                    <td><input inputMode="decimal" value={r.weightKg ?? ""} onChange={(e) => set(r.id, { weightKg: num(e.target.value) })} className="w-20 rounded-lg bg-surface-container-low px-2 py-1" aria-label={`${r.name} weight`} /></td>
                    <td><input value={r.vision} onChange={(e) => set(r.id, { vision: e.target.value })} maxLength={40} className="w-20 rounded-lg bg-surface-container-low px-2 py-1" aria-label={`${r.name} vision`} /></td>
                    <td><input value={r.activities} onChange={(e) => set(r.id, { activities: e.target.value })} maxLength={300} className="w-full min-w-48 rounded-lg bg-surface-container-low px-2 py-1" aria-label={`${r.name} activities`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={async () => {
              try {
                await exams2Api.saveHealth(sectionId, term, rows.map((r) => ({ studentId: r.id, heightCm: r.heightCm, weightKg: r.weightKg, vision: r.vision, activities: r.activities })));
                showToast("Saved", "success");
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

export default function EnterMarksPage() {
  const { can } = useAuth();
  if (!can("exam.marks") && !can("exam.marks_any") && !can("exam.moderate")) return <Card className="max-w-lg mx-auto mt-20 text-center">You don&apos;t have access to marks entry.</Card>;
  return <Entry />;
}
