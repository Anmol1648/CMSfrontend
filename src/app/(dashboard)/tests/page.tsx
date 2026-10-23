"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { questionsApi, QUESTION_TYPES, TYPE_SHORT } from "@/lib/api/questions";
import { AttemptFull, showAnswer, STATE, TestFull, TestInput, testsApi, toLocalInput, when } from "@/lib/api/tests";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const toggle = <T,>(list: T[], x: T, on: boolean) => (on ? (list.includes(x) ? list : [...list, x]) : list.filter((y) => y !== x));
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

function TestForm({ test, onClose }: { test: TestFull | null; onClose: (id?: string) => void }) {
  const queryClient = useQueryClient();
  const opts = useQuery({ queryKey: ["test-options"], queryFn: testsApi.options });
  const [classId, setClassId] = useState(test?.classId ?? "");
  const [v, setV] = useState<TestInput | null>(test ? { sectionIds: test.sectionIds, subjectId: test.subjectId, chapterIds: test.chapterIds, title: test.title, instructions: test.instructions, durationMin: test.durationMin, startsAt: test.startsAt, endsAt: test.endsAt, shuffleQuestions: test.shuffleQuestions, shuffleOptions: test.shuffleOptions, showResult: test.showResult, negativeMarks: test.negativeMarks } : null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!v && opts.data?.defaults) {
      const d = opts.data.defaults;
      setV({ sectionIds: [], subjectId: "", chapterIds: [], title: "", instructions: "", durationMin: d.durationMin, startsAt: inHours(24), endsAt: inHours(32), shuffleQuestions: d.shuffleQuestions, shuffleOptions: d.shuffleOptions, showResult: d.showResult, negativeMarks: d.negativeMarks });
      if (!classId && opts.data.classes.length) setClassId(opts.data.classes[0].id);
    }
  }, [opts.data, v, classId]);
  const cls = opts.data?.classes.find((c) => c.id === classId);
  const subject = cls?.subjects.find((s) => s.id === v?.subjectId);
  const chapters = useQuery({ queryKey: ["chapters", classId, v?.subjectId], queryFn: () => questionsApi.chapters(classId, v!.subjectId), enabled: !!classId && !!v?.subjectId });
  if (!opts.data || !v) return <Modal isOpen onClose={() => onClose()} title="Online test"><PageLoader /></Modal>;
  const set = (patch: Partial<TestInput>) => setV({ ...v, ...patch });
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = test ? await testsApi.update(test.id, v) : await testsApi.create(v);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      onClose(r.id);
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={() => onClose()} title={test ? "Edit test" : "Make an online test"} width="max-w-3xl">
      {!opts.data.classes.length ? (
        <FormAlert tone="info">You have no sections to make tests for (Staff → Subject Teachers).</FormAlert>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Class" value={classId} onChange={(c) => { setClassId(c); set({ subjectId: "", sectionIds: [], chapterIds: [] }); }} options={opts.data.classes.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Subject" value={v.subjectId} onChange={(s) => set({ subjectId: s, sectionIds: cls?.subjects.find((x) => x.id === s)?.sectionIds ?? [], chapterIds: [] })} error={fieldErrors.subjectId} options={[{ value: "", label: "Choose…" }, ...(cls?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
          </div>
          {subject && (
            <div className="space-y-2">
              <p className={label}>Sections</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {cls!.sections.filter((s) => subject.sectionIds.includes(s.id)).map((s) => (
                  <Checkbox key={s.id} label={s.label} checked={v.sectionIds.includes(s.id)} onChange={(c) => set({ sectionIds: toggle(v.sectionIds, s.id, c) })} />
                ))}
              </div>
              {fieldErrors.sectionIds && <p className="text-xs text-error">{fieldErrors.sectionIds}</p>}
            </div>
          )}
          {!!chapters.data?.chapters.length && (
            <div className="space-y-2">
              <p className={label}>Chapters (questions come from these; none ticked = whole subject)</p>
              <div className="flex flex-wrap gap-2">
                {chapters.data.chapters.filter((c) => c.isActive).map((c) => (
                  <button key={c.id} type="button" onClick={() => set({ chapterIds: toggle(v.chapterIds, c.id, !v.chapterIds.includes(c.id)) })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", v.chapterIds.includes(c.id) ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
                    {c.name} <span className="opacity-70">({c.approved})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Input label="Title" value={v.title} onChange={(e) => set({ title: e.target.value })} error={fieldErrors.title} maxLength={200} placeholder="Science test: Nutrition in Plants" />
          <TextArea label="Instructions for students (optional)" rows={2} value={v.instructions} onChange={(e) => set({ instructions: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className={label}>Opens</span>
              <input type="datetime-local" value={toLocalInput(v.startsAt)} onChange={(e) => e.target.value && set({ startsAt: new Date(e.target.value).toISOString() })} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Opens" />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Closes</span>
              <input type="datetime-local" value={toLocalInput(v.endsAt)} onChange={(e) => e.target.value && set({ endsAt: new Date(e.target.value).toISOString() })} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Closes" />
              {fieldErrors.endsAt && <span className="text-xs text-error">{fieldErrors.endsAt}</span>}
            </label>
            <Input label="Time once started (minutes)" type="number" min={1} max={600} value={String(v.durationMin)} onChange={(e) => set({ durationMin: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Students see their result" value={v.showResult} onChange={(x) => set({ showResult: x as TestInput["showResult"] })} options={[{ value: "after_review", label: "When I publish the results" }, { value: "instant", label: "As soon as they submit (objective only)" }]} />
            <Input label="Marks off for a wrong objective answer" type="number" min={0} step={0.25} value={String(v.negativeMarks)} onChange={(e) => set({ negativeMarks: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Checkbox label="Different order of questions for each student" checked={v.shuffleQuestions} onChange={(c) => set({ shuffleQuestions: c })} />
            <Checkbox label="Shuffle the choices" checked={v.shuffleOptions} onChange={(c) => set({ shuffleOptions: c })} />
          </div>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {test ? "Save" : "Make it, then add questions"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AddFromBank({ test, onClose }: { test: TestFull; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [f, setF] = useState({ chapter: "", type: "", difficulty: "", search: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const difficulty = useQuery({ queryKey: ["master-options", "question_difficulty"], queryFn: () => mastersApi.options("question_difficulty"), staleTime: 5 * 60_000 });
  const chapters = useQuery({ queryKey: ["chapters", test.classId, test.subjectId], queryFn: () => questionsApi.chapters(test.classId, test.subjectId) });
  const bank = useQuery({ queryKey: ["test-bank", test.id, f], queryFn: () => testsApi.bank(test.id, f), placeholderData: keepPreviousData });
  const add = async () => {
    try {
      queryClient.setQueryData(["test", test.id], await testsApi.addQuestions(test.id, picked));
      showToast(`${picked.length} added`, "success");
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Add questions from the bank" width="max-w-4xl">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Select label="Chapter" value={f.chapter} onChange={(chapter) => setF({ ...f, chapter })} className="w-full sm:w-56" options={[{ value: "", label: test.chapters.length ? "The test’s chapters" : "All" }, ...(chapters.data?.chapters ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Kind" value={f.type} onChange={(type) => setF({ ...f, type })} className="w-full sm:w-40" options={[{ value: "", label: "All" }, ...QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_SHORT[t] }))]} />
          <Select label="Difficulty" value={f.difficulty} onChange={(d) => setF({ ...f, difficulty: d })} className="w-full sm:w-36" options={[{ value: "", label: "All" }, ...(difficulty.data ?? []).map((d) => ({ value: d.id, label: d.name }))]} />
          <Input label="Search" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} className="sm:w-48" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-outline-variant/20">
          {(bank.data ?? []).map((q) => (
            <label key={q.id} className={cn("flex gap-3 px-4 py-2.5 border-b border-outline-variant/10", q.inTest ? "opacity-50" : "cursor-pointer hover:bg-surface-container-low")}>
              <input type="checkbox" disabled={q.inTest} checked={q.inTest || picked.includes(q.id)} onChange={(e) => setPicked(toggle(picked, q.id, e.target.checked))} className="mt-1 accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{q.text}</span>
                <span className="block text-[11px] text-on-surface-variant/70">
                  {TYPE_SHORT[q.type]} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                  {q.chapter ? ` · ${q.chapter}` : ""}
                  {q.difficulty ? ` · ${q.difficulty}` : ""}
                  {q.inTest ? " · already in the test" : ""}
                </span>
              </span>
            </label>
          ))}
          {bank.data && !bank.data.length && <p className="px-4 py-6 text-sm text-on-surface-variant/70">No approved questions here. Add or approve some in the Question Bank.</p>}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={add} disabled={!picked.length}>
            Add {picked.length || ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AutoPick({ test, onClose }: { test: TestFull; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const difficulty = useQuery({ queryKey: ["master-options", "question_difficulty"], queryFn: () => mastersApi.options("question_difficulty"), staleTime: 5 * 60_000 });
  const [rules, setRules] = useState([{ count: 10, type: "mcq", difficultyId: "" }]);
  const go = async () => {
    try {
      const r = await testsApi.auto(test.id, rules.map((x) => ({ count: x.count, type: x.type || null, difficultyId: x.difficultyId || null })));
      queryClient.setQueryData(["test", test.id], r.test);
      showToast(`${r.added} questions added${r.short.length ? ` (not enough questions for some rules)` : ""}`, r.short.length ? "info" : "success");
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Draw questions by rules" width="max-w-2xl">
      <div className="space-y-3">
        <p className="text-sm text-on-surface-variant/80">Random approved questions from {test.chapters.length ? "the test’s chapters" : "the whole subject"}, e.g. 10 easy MCQ + 2 hard short answers.</p>
        {rules.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <Input label="How many" type="number" min={1} max={100} value={String(r.count)} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, count: Math.max(1, Number(e.target.value) || 1) } : x)))} className="w-24" />
            <Select label="Kind" value={r.type} onChange={(type) => setRules(rules.map((x, j) => (j === i ? { ...x, type } : x)))} className="w-44" options={[{ value: "", label: "Any" }, ...QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_SHORT[t] }))]} />
            <Select label="Difficulty" value={r.difficultyId} onChange={(d) => setRules(rules.map((x, j) => (j === i ? { ...x, difficultyId: d } : x)))} className="w-36" options={[{ value: "", label: "Any" }, ...(difficulty.data ?? []).map((d) => ({ value: d.id, label: d.name }))]} />
            {rules.length > 1 && (
              <button type="button" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label="Remove rule" className="p-2 text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setRules([...rules, { count: 2, type: "short", difficultyId: "" }])} className="text-xs font-bold text-primary">
          + Add a rule
        </button>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={go}>Draw them</Button>
        </div>
      </div>
    </Modal>
  );
}

function MarkAttempt({ attemptId, onClose }: { attemptId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["attempt", attemptId], queryFn: () => testsApi.attempt(attemptId) });
  const [marks, setMarks] = useState<Record<string, { marks: string; note: string }>>({});
  const [hint, setHint] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const a = q.data;
  useEffect(() => {
    if (a) setMarks(Object.fromEntries(a.questions.filter((x) => x.type === "short" || x.type === "long").map((x) => [x.id, { marks: x.got === null ? "" : String(x.got), note: x.note ?? "" }])));
  }, [a]);
  if (!a) return <Modal isOpen onClose={onClose} title="Answer sheet"><PageLoader /></Modal>;
  const suggest = async (tqId: string) => {
    setBusy(tqId);
    try {
      const r = await testsApi.suggest(a.id, tqId);
      setMarks((m) => ({ ...m, [tqId]: { marks: String(r.marks), note: m[tqId]?.note ?? "" } }));
      setHint((h) => ({ ...h, [tqId]: r.reason }));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    try {
      const r: AttemptFull = await testsApi.mark(a.id, Object.fromEntries(Object.entries(marks).map(([k, m]) => [k, { marks: m.marks === "" ? null : Number(m.marks), note: m.note || null }])));
      queryClient.setQueryData(["attempt", attemptId], r);
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={a.student} width="max-w-3xl">
      <div className="space-y-4">
        <p className="text-sm">
          Score <b>{a.score ?? "—"}</b> / {a.totalMarks} · {a.status === "marked" ? "marked" : a.status === "submitted" ? "written answers to mark" : "taking it"}
        </p>
        {a.questions.map((x, i) => {
          const written = x.type === "short" || x.type === "long";
          return (
            <div key={x.id} className="rounded-xl border border-outline-variant/20 p-3 space-y-1.5">
              <p className="text-sm font-semibold">
                {i + 1}. {x.text} <span className="text-[11px] font-normal text-on-surface-variant/70">({x.marks} marks)</span>
              </p>
              <p className="text-sm">
                <span className="text-on-surface-variant/70">Answer: </span>
                {showAnswer(x, x.given)}
              </p>
              {!written && (
                <p className={cn("text-xs font-bold", (x.got ?? 0) >= x.marks ? "text-emerald-700" : "text-error")}>
                  {x.got ?? 0} / {x.marks} · correct: {x.type === "mcq" || x.type === "multi" ? x.options.map((o, k) => (o.correct ? String.fromCharCode(65 + k) : null)).filter(Boolean).join(", ") : x.type === "true_false" ? (x.answer === "true" ? "True" : "False") : x.answer?.split("|").join(" / ")}
                </p>
              )}
              {written && (
                <div className="space-y-2 pt-1">
                  {x.answer && <p className="text-[11px] text-on-surface-variant/70">Model answer: {x.answer}</p>}
                  <div className="flex flex-wrap items-end gap-3">
                    <Input label={`Marks (of ${x.marks})`} type="number" min={0} max={x.marks} step={0.5} value={marks[x.id]?.marks ?? ""} onChange={(e) => setMarks({ ...marks, [x.id]: { ...marks[x.id], marks: e.target.value } })} disabled={!a.canMark} className="w-28" />
                    <Input label="Remark" value={marks[x.id]?.note ?? ""} onChange={(e) => setMarks({ ...marks, [x.id]: { ...marks[x.id], note: e.target.value } })} disabled={!a.canMark} className="w-64" />
                    {a.canMark && a.aiMarking && (
                      <Button variant="secondary" onClick={() => suggest(x.id)} disabled={busy === x.id}>
                        {busy === x.id ? "Asking…" : "AI suggestion"}
                      </Button>
                    )}
                  </div>
                  {hint[x.id] && <p className="text-[11px] text-primary">AI: {hint[x.id]}</p>}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {a.canMark && !!Object.keys(marks).length && <Button onClick={save}>Save marks</Button>}
        </div>
      </div>
    </Modal>
  );
}

function ToExam({ id, onClose }: { id: string; onClose: () => void }) {
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["test-exam-targets", id], queryFn: () => testsApi.examTargets(id) });
  const [target, setTarget] = useState("");
  const [part, setPart] = useState("");
  const t = q.data?.find((x) => x.examSubjectId === target);
  const go = async () => {
    try {
      const r = await testsApi.toExam(id, target, part);
      showToast(`${r.students} students’ marks put into ${r.exam} (${r.part})`, "success");
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Put the scores into an exam">
      {!q.data ? (
        <PageLoader />
      ) : !q.data.length ? (
        <FormAlert tone="info">No exam of this class and subject is open for marks.</FormAlert>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant/80">Each student’s score is scaled to the part’s maximum (e.g. 18 of 25 → 7 of 10).</p>
          <Select label="Exam" value={target} onChange={(x) => { setTarget(x); setPart(""); }} options={[{ value: "", label: "Choose…" }, ...q.data.map((x) => ({ value: x.examSubjectId, label: x.exam }))]} />
          {t && <Select label="Part" value={part} onChange={setPart} options={[{ value: "", label: "Choose…" }, ...t.parts.map((p) => ({ value: p.key, label: `${p.label} (out of ${p.max})` }))]} />}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={go} disabled={!target || !part}>
              Put them in
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Results({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["test-results", id], queryFn: () => testsApi.results(id), refetchInterval: 30_000 });
  const [open, setOpen] = useState<string | null>(null);
  const [toExam, setToExam] = useState(false);
  const d = q.data;
  if (!d) return <PageLoader />;
  const publish = async (on: boolean) => {
    if (!(await confirm({ title: on ? "Publish the results?" : "Hide the results again?", message: on ? "Students and parents see their scores and the right answers." : "Students no longer see them.", confirmLabel: on ? "Publish" : "Hide" }))) return;
    try {
      queryClient.setQueryData(["test-results", id], await testsApi.publishResults(id, on));
      queryClient.invalidateQueries({ queryKey: ["test", id] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const STATUS: Record<string, { label: string; tone: "neutral" | "warning" | "primary" | "success" | "danger" }> = { not_started: { label: "Not started", tone: "neutral" }, absent: { label: "Didn’t take it", tone: "danger" }, in_progress: { label: "Taking it", tone: "primary" }, submitted: { label: "To mark", tone: "warning" }, marked: { label: "Marked", tone: "success" } };
  return (
    <div className="space-y-3">
      {d.canMark && (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" onClick={() => setToExam(true)}>
            Put scores into an exam
          </Button>
          {d.test.status === "results" ? (
            <Button variant="secondary" onClick={() => publish(false)}>
              Hide results
            </Button>
          ) : (
            <Button onClick={() => publish(true)}>Publish results</Button>
          )}
        </div>
      )}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                <th className="px-4 py-3 font-bold">Roll</th>
                <th className="px-4 py-3 font-bold">Student</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {d.students.map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/10">
                  <td className="px-4 py-2 text-xs">{s.roll ?? "—"}</td>
                  <td className="px-4 py-2">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-[10px] text-on-surface-variant/60">
                      {s.section} · {s.admissionNo}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <Pill tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Pill>
                  </td>
                  <td className="px-4 py-2 font-bold">{s.score === null ? "—" : `${s.score} / ${d.test.totalMarks}`}</td>
                  <td className="px-4 py-2 text-right">
                    {s.attemptId && (
                      <button type="button" onClick={() => setOpen(s.attemptId)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                        {s.status === "submitted" && d.canMark ? "Mark" : "See"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {open && <MarkAttempt attemptId={open} onClose={() => setOpen(null)} />}
      {toExam && <ToExam id={id} onClose={() => setToExam(false)} />}
    </div>
  );
}

function AnalysisView({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["test-analysis", id], queryFn: () => testsApi.analysis(id) });
  const a = q.data;
  if (!a) return <PageLoader />;
  if (!a.taken) return <Card className="text-center text-sm text-on-surface-variant/70">Nobody has taken it yet.</Card>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Took it", value: a.taken },
          { label: "Average", value: `${a.average} / ${a.totalMarks}` },
          { label: "Highest", value: a.highest },
          { label: "Lowest", value: a.lowest },
        ].map((x) => (
          <Card key={x.label} padding="sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{x.label}</p>
            <p className="text-2xl font-extrabold text-primary">{x.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card padding="none" className="overflow-hidden">
          <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">Questions (hardest first)</h3>
          <table className="w-full text-sm mt-2">
            <tbody>
              {[...a.questions].sort((x, y) => (x.percent ?? 0) - (y.percent ?? 0)).map((x) => (
                <tr key={x.id} className="border-t border-outline-variant/10">
                  <td className="px-5 py-2 text-xs">{x.n}.</td>
                  <td className="px-2 py-2">
                    <p className="text-sm line-clamp-2">{x.text}</p>
                    <p className="text-[10px] text-on-surface-variant/60">
                      {TYPE_SHORT[x.type]}
                      {x.chapter ? ` · ${x.chapter}` : ""}
                    </p>
                  </td>
                  <td className={cn("px-5 py-2 text-right font-bold whitespace-nowrap", (x.percent ?? 0) < 50 ? "text-error" : "text-emerald-700")}>{x.percent === null ? "—" : `${x.percent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-2">Chapters (weakest first)</h3>
            {a.chapters.map((c) => (
              <p key={c.chapter} className="flex justify-between text-sm py-1">
                <span>{c.chapter}</span>
                <b className={(c.percent ?? 0) < 50 ? "text-error" : ""}>{c.percent ?? "—"}%</b>
              </p>
            ))}
          </Card>
          <Card>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-2">Scores</h3>
            {a.bands.map((b) => (
              <p key={b.label} className="flex justify-between text-sm py-1">
                <span>{b.label}</span>
                <b>{b.count}</b>
              </p>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["test", id], queryFn: () => testsApi.get(id) });
  const [tab, setTab] = useState("questions");
  const [editing, setEditing] = useState(false);
  const [bank, setBank] = useState(false);
  const [auto, setAuto] = useState(false);
  const t = q.data;
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!t) return <PageLoader />;
  const set = (x: TestFull) => queryClient.setQueryData(["test", id], x);
  const act = async (fn: () => Promise<TestFull>) => {
    try {
      set(await fn());
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete “${t.title}”?`, message: "Only a test nobody has taken can be deleted.", confirmLabel: "Delete" }))) return;
    try {
      await testsApi.remove(id);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      onBack();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const editable = t.canEdit && !t.locked;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-primary flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span> Online tests
      </button>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-primary">{t.title}</h2>
            <p className="text-sm text-on-surface-variant/70">
              {t.className} · {t.subject} · {t.sections.map((s) => s.label).join(", ")} · {t.questions.length} questions, {t.totalMarks} marks · {t.durationMin} min
            </p>
            <p className="text-sm text-on-surface-variant/70">
              Opens {when(t.startsAt)} · closes {when(t.endsAt)}
              {t.negativeMarks ? ` · −${t.negativeMarks} for a wrong answer` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STATE[t.state].tone}>{STATE[t.state].label}</Pill>
            {t.canEdit && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                {t.status === "draft" ? (
                  <Button onClick={() => act(() => testsApi.publish(id, true))}>Publish</Button>
                ) : (
                  !t.locked && (
                    <Button variant="secondary" onClick={() => act(() => testsApi.publish(id, false))}>
                      Back to draft
                    </Button>
                  )
                )}
                {!t.locked && (
                  <Button variant="secondary" onClick={remove}>
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {t.locked && t.canEdit && <p className="text-[11px] text-on-surface-variant/70">Students have started it: its questions can’t change.</p>}
      </Card>
      <Tabs
        tabs={[
          { id: "questions", label: `Questions (${t.questions.length})` },
          { id: "results", label: "Students & marking" },
          { id: "analysis", label: "Analysis" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      {tab === "questions" && (
        <div className="space-y-3">
          {editable && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="secondary" onClick={() => setAuto(true)}>
                Draw by rules
              </Button>
              <Button onClick={() => setBank(true)}>Add from the bank</Button>
            </div>
          )}
          {t.questions.map((x, i) => (
            <Card key={x.id} className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-semibold whitespace-pre-line">{x.text}</p>
                {(x.type === "mcq" || x.type === "multi") && (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {x.options.map((o, k) => (
                      <li key={k} className={cn("text-xs rounded-lg px-2.5 py-1", o.correct ? "bg-emerald-50 text-emerald-800 font-bold" : "bg-surface-container-low")}>
                        {String.fromCharCode(65 + k)}. {o.text}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-on-surface-variant/70">
                  {TYPE_SHORT[x.type]}
                  {x.chapter ? ` · ${x.chapter}` : ""}
                  {x.type === "true_false" ? ` · answer: ${x.answer === "true" ? "True" : "False"}` : x.type === "fill" ? ` · answer: ${x.answer?.split("|").join(" / ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editable ? (
                  <>
                    <input aria-label="Marks" type="number" min={0.5} step={0.5} defaultValue={x.marks} onBlur={(e) => Number(e.target.value) !== x.marks && act(() => testsApi.editQuestion(id, x.id, { marks: Number(e.target.value) || x.marks }))} className="w-16 rounded-lg bg-surface-container-low px-2 py-1.5 text-sm text-center outline-none" />
                    <button type="button" onClick={() => act(() => testsApi.editQuestion(id, x.id, { move: "up" }))} disabled={i === 0} aria-label="Up" className="p-1 rounded-full hover:bg-surface-container-high disabled:opacity-30">
                      <span className="material-symbols-outlined text-lg">arrow_upward</span>
                    </button>
                    <button type="button" onClick={() => act(() => testsApi.editQuestion(id, x.id, { move: "down" }))} disabled={i === t.questions.length - 1} aria-label="Down" className="p-1 rounded-full hover:bg-surface-container-high disabled:opacity-30">
                      <span className="material-symbols-outlined text-lg">arrow_downward</span>
                    </button>
                    <button type="button" onClick={() => act(() => testsApi.removeQuestion(id, x.id))} aria-label="Remove" className="p-1 rounded-full hover:bg-surface-container-high text-error">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </>
                ) : (
                  <span className="text-sm font-bold text-primary">{x.marks} m</span>
                )}
              </div>
            </Card>
          ))}
          {!t.questions.length && <Card className="text-center text-sm text-on-surface-variant/70">No questions yet. Add them from the bank, or draw them by rules.</Card>}
        </div>
      )}
      {tab === "results" && <Results id={id} />}
      {tab === "analysis" && <AnalysisView id={id} />}
      {editing && <TestForm test={t} onClose={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ["test", id] }); }} />}
      {bank && <AddFromBank test={t} onClose={() => setBank(false)} />}
      {auto && <AutoPick test={t} onClose={() => setAuto(false)} />}
    </div>
  );
}

function List() {
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("open");
  const [f, setF] = useState({ mine: "1", state: "", page: 1 });
  const [making, setMaking] = useState(false);
  const q = useQuery({ queryKey: ["tests", f], queryFn: () => testsApi.list({ mine: f.mine as "1" | "0", state: f.state || undefined, page: f.page }), placeholderData: keepPreviousData, enabled: !open });
  if (open) return <Detail id={open} onBack={() => router.push("/tests")} />;
  const d = q.data;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Select label="Show" value={f.mine} onChange={(mine) => setF({ ...f, mine, page: 1 })} className="w-full sm:w-44" options={[{ value: "1", label: "Tests I made" }, { value: "0", label: "All I can see" }]} />
        <Select label="Status" value={f.state} onChange={(state) => setF({ ...f, state, page: 1 })} className="w-full sm:w-40" options={[{ value: "", label: "All" }, ...(Object.keys(STATE) as (keyof typeof STATE)[]).map((s) => ({ value: s, label: STATE[s].label }))]} />
        {d?.canCreate && (
          <Button className="sm:ml-auto" onClick={() => setMaking(true)}>
            Make a test
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
                  <th className="px-4 py-3 font-bold">Test</th>
                  <th className="px-4 py-3 font-bold">Window</th>
                  <th className="px-4 py-3 font-bold">Taken</th>
                  <th className="px-4 py-3 font-bold">To mark</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((t) => (
                  <tr key={t.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low cursor-pointer" onClick={() => router.push(`/tests?open=${t.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-primary">{t.title}</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        {t.sections.join(", ")} · {t.subject} · {t.questions} questions, {t.totalMarks} marks · {t.durationMin} min{!t.mine && t.by ? ` · ${t.by}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {when(t.startsAt)} –<br />
                      {when(t.endsAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">{t.taken}</td>
                    <td className="px-4 py-3 text-xs">{t.toMark ? <b className="text-amber-700">{t.toMark}</b> : "—"}</td>
                    <td className="px-4 py-3">
                      <Pill tone={STATE[t.state].tone}>{STATE[t.state].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.rows.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">No tests here.</p>}
          </div>
        </Card>
      )}
      {d && d.pages > 1 && <Pagination currentPage={f.page} totalPage={d.pages} onPageChange={(page) => setF({ ...f, page })} />}
      {making && <TestForm test={null} onClose={(id) => { setMaking(false); if (id) router.push(`/tests?open=${id}`); }} />}
    </div>
  );
}

export default function TestsPage() {
  return (
    <>
      <PageHeader title="Online Tests" description="Tests from the question bank, taken online in a time window; marked by themselves (objective) or by you (written), with the class analysis." />
      <Suspense fallback={<PageLoader />}>
        <List />
      </Suspense>
    </>
  );
}
