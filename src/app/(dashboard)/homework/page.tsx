"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { FileLinks, FilePicker } from "@/components/homework/HomeworkFiles";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { GiveInput, HomeworkFull, homeworkApi, HomeworkStudent, showDate, STATUS_LABEL, STATUS_TONE, SubmissionStatus } from "@/lib/api/homework";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const STATE: Record<string, { label: string; tone: "neutral" | "warning" | "success" }> = { draft: { label: "Draft", tone: "neutral" }, scheduled: { label: "Scheduled", tone: "warning" }, published: { label: "Published", tone: "success" } };

function GiveForm({ homework, onClose }: { homework: HomeworkFull | null; onClose: (id?: string) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const opts = useQuery({ queryKey: ["homework-options"], queryFn: homeworkApi.options });
  const [v, setV] = useState<GiveInput>(
    homework
      ? { sectionIds: [homework.sectionId], subjectId: homework.subjectId, typeId: homework.typeId, title: homework.title, details: homework.details, attachmentIds: homework.attachments.map((a) => a.id), givenOn: homework.givenOn, dueOn: homework.dueOn, mode: homework.mode, publish: homework.state === "draft" ? "draft" : homework.state === "scheduled" ? "later" : "now", publishAt: homework.publishAt }
      : { sectionIds: [], subjectId: "", typeId: null, title: "", details: "", attachmentIds: [], givenOn: today(), dueOn: plusDays(today(), 1), mode: "online", publish: "now", publishAt: null }
  );
  const [files, setFiles] = useState<{ id: string; name: string }[]>(homework?.attachments ?? []);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<GiveInput>) => setV((x) => ({ ...x, ...patch }));
  const sections = opts.data?.sections ?? [];
  // Subjects taught in every chosen section.
  const chosen = sections.filter((s) => v.sectionIds.includes(s.id));
  const subjects = chosen.length ? chosen[0].subjects.filter((x) => chosen.every((c) => c.subjects.some((y) => y.id === x.id))) : [];
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const input = { ...v, attachmentIds: files.map((f) => f.id), publishAt: v.publish === "later" && v.publishAt ? new Date(v.publishAt).toISOString() : null };
      if (homework) {
        const { sectionIds: _s, ...rest } = input;
        await homeworkApi.update(homework.id, rest);
      } else await homeworkApi.give(input);
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      showToast(homework ? "Saved" : v.publish === "draft" ? "Saved as draft" : `Given to ${v.sectionIds.length} section${v.sectionIds.length > 1 ? "s" : ""}`, "success");
      onClose(homework?.id);
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={() => onClose()} title={homework ? "Edit homework" : "Give homework"} width="max-w-3xl">
      {!opts.data ? (
        <PageLoader />
      ) : !sections.length ? (
        <FormAlert tone="info">You have no sections to give homework to (Staff → Subject Teachers, or class teacher of a section).</FormAlert>
      ) : (
        <div className="space-y-4">
          {!homework && (
            <div className="space-y-2">
              <p className={label}>Sections</p>
              <div className="flex flex-wrap gap-2">
                {sections.map((s) => (
                  <button key={s.id} type="button" onClick={() => set({ sectionIds: v.sectionIds.includes(s.id) ? v.sectionIds.filter((x) => x !== s.id) : [...v.sectionIds, s.id], subjectId: "" })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", v.sectionIds.includes(s.id) ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high")}>
                    {s.label}
                  </button>
                ))}
              </div>
              {fieldErrors.sectionIds && <p className="text-xs text-error">{fieldErrors.sectionIds}</p>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {homework ? (
              <Input label="Section · subject" value={`${homework.section} · ${homework.subject}`} disabled />
            ) : (
              <Select label="Subject" value={v.subjectId} onChange={(x) => set({ subjectId: x })} error={fieldErrors.subjectId} options={[{ value: "", label: v.sectionIds.length ? (subjects.length ? "Choose…" : "No subject common to these sections") : "Choose sections first" }, ...subjects.map((x) => ({ value: x.id, label: x.name }))]} />
            )}
            <MasterSelect master="homework_type" label="Type" value={v.typeId ?? ""} onChange={(id) => set({ typeId: id || null })} />
          </div>
          <Input label="Homework" value={v.title} onChange={(e) => set({ title: e.target.value })} error={fieldErrors.title} maxLength={200} placeholder="Exercise 4.2: questions 1 to 10" />
          <TextArea label="Details (optional)" rows={4} value={v.details} onChange={(e) => set({ details: e.target.value })} />
          <FilePicker files={files} onChange={setFiles} label="Attach a worksheet or picture" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Given on" type="date" value={v.givenOn} onChange={(e) => set({ givenOn: e.target.value })} error={fieldErrors.givenOn} />
            <Input label="Due on" type="date" value={v.dueOn} onChange={(e) => set({ dueOn: e.target.value })} error={fieldErrors.dueOn} />
            <Select label="How it’s done" value={v.mode} onChange={(m) => set({ mode: m as GiveInput["mode"] })} error={fieldErrors.mode} options={[{ value: "online", label: "Students hand it in online" }, { value: "class", label: "Checked in class" }]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Students see it" value={v.publish} onChange={(p) => set({ publish: p as GiveInput["publish"] })} options={[{ value: "now", label: "Now" }, { value: "later", label: "Later, at a time" }, { value: "draft", label: "Not yet (keep as draft)" }]} />
            {v.publish === "later" && (
              <label className="flex flex-col gap-2">
                <span className={label}>From</span>
                <input type="datetime-local" value={v.publishAt ? v.publishAt.slice(0, 16) : ""} onChange={(e) => set({ publishAt: e.target.value })} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Students see it from" />
                {fieldErrors.publishAt && <span className="text-xs text-error">{fieldErrors.publishAt}</span>}
              </label>
            )}
          </div>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {homework ? "Save" : v.publish === "draft" ? "Save draft" : "Give"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

type Row = { status: SubmissionStatus; gradeId: string; remark: string };

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["homework", "one", id], queryFn: () => homeworkApi.get(id) });
  const grades = useQuery({ queryKey: ["master-options", "homework_grade"], queryFn: () => mastersApi.options("homework_grade"), staleTime: 5 * 60_000 });
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const h = q.data;
  useEffect(() => {
    if (h) setRows(Object.fromEntries(h.students.map((s) => [s.id, { status: s.status, gradeId: s.gradeId ?? "", remark: s.remark ?? "" }])));
  }, [h]);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!h) return <PageLoader />;
  const changed = h.students.filter((s) => {
    const r = rows[s.id];
    return r && (r.status !== s.status || r.gradeId !== (s.gradeId ?? "") || r.remark !== (s.remark ?? ""));
  });
  const setRow = (s: HomeworkStudent, patch: Partial<Row>) => setRows((x) => ({ ...x, [s.id]: { ...x[s.id], ...patch } }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await homeworkApi.check(
        h.id,
        changed.map((s) => {
          const x = rows[s.id];
          // Giving a grade checks it.
          const status = x.gradeId && ["submitted", "late", "pending"].includes(x.status) ? "checked" : x.status;
          return { studentId: s.id, status: ["submitted", "late"].includes(status) ? "pending" : status, gradeId: x.gradeId || null, remark: x.remark || null };
        })
      );
      queryClient.setQueryData(["homework", "one", id], r);
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const allDone = () => setRows((x) => Object.fromEntries(Object.entries(x).map(([k, r]) => [k, { ...r, status: h.mode === "class" ? (r.status === "pending" ? "done" : r.status) : ["submitted", "late"].includes(r.status) ? "checked" : r.status }])));
  const remove = async () => {
    if (!(await confirm({ title: `Delete “${h.title}”?`, message: "Students no longer see it; what they handed in goes too.", confirmLabel: "Delete" }))) return;
    try {
      await homeworkApi.remove(h.id);
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      onBack();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const count = (st: SubmissionStatus[]) => h.students.filter((s) => st.includes(s.status)).length;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-primary flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span> Homework
      </button>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-primary">{h.title}</h2>
            <p className="text-sm text-on-surface-variant/70">
              {h.section} · {h.subject}
              {h.type ? ` · ${h.type}` : ""} · given {showDate(h.givenOn)} · due <b>{showDate(h.dueOn)}</b> · {h.mode === "online" ? "handed in online" : "checked in class"}
              {h.by ? ` · ${h.by}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={STATE[h.state].tone}>{STATE[h.state].label}</Pill>
            {h.canEdit && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={remove}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
        {h.details && <p className="text-sm whitespace-pre-line text-on-surface-variant">{h.details}</p>}
        <FileLinks homeworkId={h.id} files={h.attachments} />
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Students", value: h.students.length },
          { label: h.mode === "online" ? "Handed in" : "Done", value: count(["submitted", "late", "checked", "redo", "done"]) },
          { label: "To check", value: count(["submitted", "late"]) },
          { label: h.mode === "online" ? "Not handed in" : "Not done", value: count(["pending", "not_done"]) },
        ].map((x) => (
          <Card key={x.label} padding="sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{x.label}</p>
            <p className="text-2xl font-extrabold text-primary">{x.value}</p>
          </Card>
        ))}
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">Students</h3>
          {h.canCheck && (
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={allDone}>
                {h.mode === "class" ? "Mark the rest done" : "Mark handed-in as checked"}
              </Button>
              <Button onClick={save} disabled={busy || !changed.length}>
                Save{changed.length ? ` (${changed.length})` : ""}
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                <th className="px-4 py-2 font-bold">Roll</th>
                <th className="px-4 py-2 font-bold">Student</th>
                <th className="px-4 py-2 font-bold">Their work</th>
                <th className="px-4 py-2 font-bold">Status</th>
                <th className="px-4 py-2 font-bold">Grade</th>
                <th className="px-4 py-2 font-bold">Remark</th>
              </tr>
            </thead>
            <tbody>
              {h.students.map((s) => {
                const r = rows[s.id] ?? { status: s.status, gradeId: "", remark: "" };
                const statusOptions: SubmissionStatus[] = h.mode === "class" ? ["pending", "done", "not_done"] : s.submittedAt ? [s.status === "late" ? "late" : "submitted", "checked", "redo"] : ["pending", "checked", "not_done"];
                return (
                  <tr key={s.id} className="border-t border-outline-variant/10 align-top">
                    <td className="px-4 py-2 text-xs">{s.roll ?? "—"}</td>
                    <td className="px-4 py-2">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{s.admissionNo}</p>
                    </td>
                    <td className="px-4 py-2 max-w-xs">
                      {s.answer && <p className="text-xs whitespace-pre-line">{s.answer}</p>}
                      <FileLinks homeworkId={h.id} files={s.files} />
                      {s.submittedAt && <p className="text-[10px] text-on-surface-variant/60 mt-1">{new Date(s.submittedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                    </td>
                    <td className="px-4 py-2">
                      {h.canCheck ? (
                        <select aria-label={`${s.name} status`} value={r.status} onChange={(e) => setRow(s, { status: e.target.value as SubmissionStatus })} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-xs font-bold text-primary outline-none">
                          {Array.from(new Set([r.status, ...statusOptions])).map((x) => (
                            <option key={x} value={x}>
                              {STATUS_LABEL[x]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Pill tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Pill>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {h.canCheck ? (
                        <select aria-label={`${s.name} grade`} value={r.gradeId} onChange={(e) => setRow(s, { gradeId: e.target.value })} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-xs outline-none">
                          <option value="">—</option>
                          {(grades.data ?? []).map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs">{s.grade ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {h.canCheck ? <input aria-label={`${s.name} remark`} value={r.remark} onChange={(e) => setRow(s, { remark: e.target.value })} maxLength={500} className="w-44 rounded-lg bg-surface-container-low px-2 py-1.5 text-xs outline-none" /> : <span className="text-xs">{s.remark ?? ""}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!h.students.length && <p className="px-5 py-6 text-sm text-on-surface-variant/70">No students take this subject in the section.</p>}
        </div>
      </Card>
      {editing && <GiveForm homework={h} onClose={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ["homework", "one", id] }); }} />}
    </div>
  );
}

function List() {
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("open");
  const [f, setF] = useState({ section: "", mine: "1", status: "", from: "", to: "", page: 1 });
  const [giving, setGiving] = useState(false);
  const opts = useQuery({ queryKey: ["homework-options"], queryFn: homeworkApi.options });
  const sectionOpts = useQuery({ queryKey: ["homework-diary-sections"], queryFn: homeworkApi.diarySections });
  const q = useQuery({ queryKey: ["homework", f], queryFn: () => homeworkApi.list({ ...f, mine: f.mine as "1" | "0", page: f.page }), placeholderData: keepPreviousData, enabled: !open });
  if (open) return <Detail id={open} onBack={() => router.push("/homework")} />;
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch, page: patch.page ?? 1 }));
  const d = q.data;
  const sections = [...(opts.data?.sections ?? []).map((s) => ({ id: s.id, label: s.label })), ...(sectionOpts.data ?? [])].filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Select label="Show" value={f.mine} onChange={(mine) => set({ mine })} className="w-full sm:w-44" options={[{ value: "1", label: "Homework I gave" }, { value: "0", label: "All I can see" }]} />
        <Select label="Section" value={f.section} onChange={(section) => set({ section })} className="w-full sm:w-40" options={[{ value: "", label: "All" }, ...sections.map((s) => ({ value: s.id, label: s.label }))]} />
        <Select label="Status" value={f.status} onChange={(status) => set({ status })} className="w-full sm:w-40" options={[{ value: "", label: "All" }, { value: "published", label: "Published" }, { value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }]} />
        <Input label="Given from" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} className="sm:w-40" />
        <Input label="To" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} className="sm:w-40" />
        {d?.canGive && (
          <Button className="sm:ml-auto" onClick={() => setGiving(true)}>
            Give homework
          </Button>
        )}
      </Card>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3 font-bold">Homework</th>
                  <th className="px-4 py-3 font-bold">Given</th>
                  <th className="px-4 py-3 font-bold">Due</th>
                  <th className="px-4 py-3 font-bold">Handed in</th>
                  <th className="px-4 py-3 font-bold">To check</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((h) => (
                  <tr key={h.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low cursor-pointer" onClick={() => router.push(`/homework?open=${h.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-primary">{h.title}</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        {h.section} · {h.subject}
                        {h.type ? ` · ${h.type}` : ""}
                        {!h.mine && h.by ? ` · ${h.by}` : ""} · {h.mode === "online" ? "online" : "in class"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{showDate(h.givenOn)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap font-bold">{showDate(h.dueOn)}</td>
                    <td className="px-4 py-3 text-xs">
                      {h.handedIn} / {h.students}
                    </td>
                    <td className="px-4 py-3 text-xs">{h.toCheck ? <b className="text-amber-700">{h.toCheck}</b> : "—"}</td>
                    <td className="px-4 py-3">
                      <Pill tone={STATE[h.state].tone}>{STATE[h.state].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.rows.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">No homework here.</p>}
          </div>
        </Card>
      )}
      {d && d.pages > 1 && <Pagination currentPage={f.page} totalPage={d.pages} onPageChange={(page) => set({ page })} />}
      {giving && <GiveForm homework={null} onClose={() => setGiving(false)} />}
    </div>
  );
}

export default function HomeworkPage() {
  return (
    <>
      <PageHeader title="Homework" description="Give homework to your sections, see who handed it in, and check it." />
      <Suspense fallback={<PageLoader />}>
        <List />
      </Suspense>
    </>
  );
}
