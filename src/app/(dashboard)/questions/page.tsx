"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { ClassSubjectPicker } from "@/components/questions/ClassSubjectPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, authedImageUrl, errorMessage } from "@/lib/api/client";
import { Question, QuestionInput, QuestionQuery, questionsApi, QuestionType, QUESTION_TYPES, STATUS, TYPE_LABEL, TYPE_SHORT } from "@/lib/api/questions";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

function useChapters(classId: string, subjectId: string) {
  return useQuery({ queryKey: ["chapters", classId, subjectId], queryFn: () => questionsApi.chapters(classId, subjectId), enabled: !!classId && !!subjectId });
}

function QuestionForm({ question, start, onClose }: { question: Question | null; start: { classId: string; subjectId: string; chapterId: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const opts = useQuery({ queryKey: ["question-options", "questions"], queryFn: () => questionsApi.options("questions") });
  const [v, setV] = useState<QuestionInput>(
    question ?? { classId: start.classId, subjectId: start.subjectId, chapterId: start.chapterId || null, type: "mcq", text: "", imageFileId: null, options: [{ text: "", correct: true }, { text: "", correct: false }, { text: "", correct: false }, { text: "", correct: false }], answer: null, explanation: null, marks: 1, difficultyId: null, levelId: null }
  );
  const chapters = useChapters(v.classId, v.subjectId);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<QuestionInput>) => setV((x) => ({ ...x, ...patch }));
  const editable = { classes: (opts.data?.classes ?? []).map((c) => ({ ...c, subjects: c.subjects.filter((s) => s.canEdit) })).filter((c) => c.subjects.length), canEditAll: !!opts.data?.canEditAll };
  const setOption = (i: number, patch: Partial<{ text: string; correct: boolean }>) => set({ options: v.options.map((o, j) => (j === i ? { ...o, ...patch } : v.type === "mcq" && patch.correct ? { ...o, correct: false } : o)) });
  const save = async (draft: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const input = { ...v, options: v.options.filter((o) => o.text.trim()) };
      if (question) await questionsApi.update(question.id, input, draft);
      else await questionsApi.create(input, draft);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    try {
      set({ imageFileId: (await questionsApi.uploadImage(file)).id });
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={question ? "Edit question" : "Add a question"} width="max-w-3xl">
      {!opts.data ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <ClassSubjectPicker options={editable} classId={v.classId} subjectId={v.subjectId} onChange={(classId, subjectId) => set({ classId, subjectId, chapterId: null })} />
            <Select label="Chapter" value={v.chapterId ?? ""} onChange={(c) => set({ chapterId: c || null })} className="w-full sm:w-64" options={[{ value: "", label: "No chapter" }, ...(chapters.data?.chapters ?? []).filter((c) => c.isActive || c.id === v.chapterId).map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Select label="Kind" value={v.type} onChange={(t) => set({ type: t as QuestionType, answer: t === "true_false" ? "true" : null })} options={QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
            <Input label="Marks" type="number" min={0.5} step={0.5} value={String(v.marks)} onChange={(e) => set({ marks: Number(e.target.value) || 1 })} />
          </div>
          <TextArea label={v.type === "fill" ? "Question (write ____ for the blank)" : "Question"} rows={3} value={v.text} onChange={(e) => set({ text: e.target.value })} error={fieldErrors.text} />
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:opacity-70">
              <span className="material-symbols-outlined text-lg">image</span>
              {v.imageFileId ? "Change the picture" : "Add a picture (optional)"}
            </button>
            {v.imageFileId && (
              <button type="button" onClick={() => set({ imageFileId: null })} className="text-xs font-bold text-error">
                Remove picture
              </button>
            )}
          </div>
          {(v.type === "mcq" || v.type === "multi") && (
            <div className="space-y-2">
              <p className={label}>Choices · tick the correct {v.type === "mcq" ? "one" : "ones"}</p>
              {v.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type={v.type === "mcq" ? "radio" : "checkbox"} name="correct" aria-label={`Choice ${i + 1} correct`} checked={o.correct} onChange={(e) => setOption(i, { correct: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <span className="text-xs font-black text-on-surface-variant w-5">{String.fromCharCode(65 + i)}</span>
                  <input value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} maxLength={500} className="flex-1 rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none" aria-label={`Choice ${i + 1}`} />
                  {v.options.length > 2 && (
                    <button type="button" onClick={() => set({ options: v.options.filter((_, j) => j !== i) })} aria-label="Remove choice" className="p-1 text-on-surface-variant/60 hover:text-error">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                </div>
              ))}
              {v.options.length < 6 && (
                <button type="button" onClick={() => set({ options: [...v.options, { text: "", correct: false }] })} className="text-xs font-bold text-primary">
                  + Add a choice
                </button>
              )}
              {fieldErrors.options && <p className="text-xs text-error">{fieldErrors.options}</p>}
            </div>
          )}
          {v.type === "true_false" && <Select label="Correct answer" value={v.answer ?? "true"} onChange={(a) => set({ answer: a })} options={[{ value: "true", label: "True" }, { value: "false", label: "False" }]} />}
          {v.type === "fill" && <Input label="Answer (several accepted answers: separate with |)" value={v.answer ?? ""} onChange={(e) => set({ answer: e.target.value })} error={fieldErrors.answer} placeholder="autotrophs|autotrophic" />}
          {(v.type === "short" || v.type === "long") && <TextArea label="Model answer (helps marking)" rows={v.type === "long" ? 5 : 3} value={v.answer ?? ""} onChange={(e) => set({ answer: e.target.value })} />}
          <TextArea label="Explanation (shown after the test, optional)" rows={2} value={v.explanation ?? ""} onChange={(e) => set({ explanation: e.target.value || null })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <MasterSelect master="question_difficulty" label="Difficulty" value={v.difficultyId ?? ""} onChange={(id) => set({ difficultyId: id || null })} />
            <MasterSelect master="question_level" label="Thinking level" value={v.levelId ?? ""} onChange={(id) => set({ levelId: id || null })} />
          </div>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={busy}>
              Save as draft
            </Button>
            <Button onClick={() => save(false)} disabled={busy}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Generate({ start, onClose }: { start: { classId: string; subjectId: string; chapterId: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const opts = useQuery({ queryKey: ["question-options", "questions"], queryFn: () => questionsApi.options("questions") });
  const ai = useQuery({ queryKey: ["ai-status"], queryFn: questionsApi.aiStatus, staleTime: 60_000 });
  const [v, setV] = useState({ classId: start.classId, subjectId: start.subjectId, chapterId: start.chapterId, type: "mcq" as QuestionType, count: 5, marks: 1, difficultyId: "", levelId: "", instructions: "" });
  const chapters = useChapters(v.classId, v.subjectId);
  const [made, setMade] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editable = { classes: (opts.data?.classes ?? []).map((c) => ({ ...c, subjects: c.subjects.filter((s) => s.canEdit) })).filter((c) => c.subjects.length), canEditAll: !!opts.data?.canEditAll };
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await questionsApi.generate({ ...v, chapterId: v.chapterId || null, difficultyId: v.difficultyId || null, levelId: v.levelId || null, instructions: v.instructions || undefined });
      setMade(r.questions);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      showToast(`${r.made} question${r.made === 1 ? "" : "s"} written${r.skipped ? ` (${r.skipped} left out: not in the right form)` : ""}`, "success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const sendAll = async () => {
    if (!made?.length) return;
    try {
      const r = await questionsApi.send(made.map((q) => q.id));
      showToast(r.status === "approved" ? `${r.sent} approved` : `${r.sent} sent for review`, "success");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Write questions with AI" width="max-w-3xl">
      {!opts.data || !ai.data ? (
        <PageLoader />
      ) : !ai.data.ready ? (
        <FormAlert tone="info">{ai.data.why}</FormAlert>
      ) : made ? (
        <div className="space-y-4">
          <FormAlert tone="info">The AI’s questions are saved as {made[0]?.status === "draft" ? "drafts" : STATUS[made[0]?.status ?? "draft"].label.toLowerCase()}. Read each one: edit or delete it in the list, then send them on.</FormAlert>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {made.map((q, i) => (
              <QuestionView key={q.id} q={q} n={i + 1} />
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Close (read them in the list)
            </Button>
            {made[0]?.status === "draft" && <Button onClick={sendAll}>Send all on</Button>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <ClassSubjectPicker options={editable} classId={v.classId} subjectId={v.subjectId} onChange={(classId, subjectId) => setV({ ...v, classId, subjectId, chapterId: "" })} />
            <Select label="Chapter" value={v.chapterId} onChange={(c) => setV({ ...v, chapterId: c })} className="w-full sm:w-64" options={[{ value: "", label: "Whole subject" }, ...(chapters.data?.chapters ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Kind" value={v.type} onChange={(t) => setV({ ...v, type: t as QuestionType })} options={QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
            <Input label="How many" type="number" min={1} max={50} value={String(v.count)} onChange={(e) => setV({ ...v, count: Math.max(1, Number(e.target.value) || 1) })} />
            <Input label="Marks each" type="number" min={0.5} step={0.5} value={String(v.marks)} onChange={(e) => setV({ ...v, marks: Number(e.target.value) || 1 })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MasterSelect master="question_difficulty" label="Difficulty" value={v.difficultyId} onChange={(id) => setV({ ...v, difficultyId: id })} />
            <MasterSelect master="question_level" label="Thinking level" value={v.levelId} onChange={(id) => setV({ ...v, levelId: id })} />
          </div>
          <TextArea label="Note for the AI (optional)" rows={2} value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} placeholder="e.g. focus on photosynthesis; use everyday examples" />
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={go} disabled={busy || !v.subjectId}>
              {busy ? "Writing… (up to a minute)" : "Write them"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Picture({ q }: { q: Question }) {
  const img = useQuery({ queryKey: ["question-image", q.id, q.imageFileId], queryFn: () => authedImageUrl(`${questionsApi.imagePath(q.id)}?v=${q.imageFileId}`), enabled: !!q.imageFileId, staleTime: Infinity });
  // eslint-disable-next-line @next/next/no-img-element
  return img.data ? <img src={img.data} alt="" className="max-h-40 rounded-lg border border-outline-variant/20" /> : null;
}

function QuestionView({ q, n }: { q: Question; n?: number }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold whitespace-pre-line">
        {n ? `${n}. ` : ""}
        {q.text}
      </p>
      {q.imageFileId && <Picture q={q} />}
      {(q.type === "mcq" || q.type === "multi") && (
        <ul className="grid gap-1 sm:grid-cols-2">
          {q.options.map((o, i) => (
            <li key={i} className={cn("text-xs rounded-lg px-2.5 py-1.5", o.correct ? "bg-emerald-50 text-emerald-800 font-bold" : "bg-surface-container-low")}>
              {String.fromCharCode(65 + i)}. {o.text} {o.correct && "✓"}
            </li>
          ))}
        </ul>
      )}
      {q.type === "true_false" && <p className="text-xs">Answer: <b>{q.answer === "true" ? "True" : "False"}</b></p>}
      {q.type === "fill" && <p className="text-xs">Answer: <b>{q.answer?.split("|").join(" / ")}</b></p>}
      {(q.type === "short" || q.type === "long") && q.answer && <p className="text-xs text-on-surface-variant whitespace-pre-line">Model answer: {q.answer}</p>}
      {q.explanation && <p className="text-[11px] text-on-surface-variant/70">Why: {q.explanation}</p>}
    </div>
  );
}

function Bank() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const opts = useQuery({ queryKey: ["question-options", "questions"], queryFn: () => questionsApi.options("questions") });
  const [f, setF] = useState<QuestionQuery>({ class: params.get("class") ?? "", subject: params.get("subject") ?? "", chapter: params.get("chapter") ?? "", page: 1 });
  const set = (patch: Partial<QuestionQuery>) => setF((x) => ({ ...x, ...patch, page: patch.page ?? 1 }));
  const pick = useCallback((c: string, s: string) => setF((x) => ({ ...x, class: c, subject: s, chapter: "", page: 1 })), []);
  const chapters = useChapters(f.class ?? "", f.subject ?? "");
  const q = useQuery({ queryKey: ["questions", f], queryFn: () => questionsApi.list(f), placeholderData: keepPreviousData });
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [generating, setGenerating] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  if (!opts.data) return <PageLoader />;
  const refresh = () => {
    setPicked([]);
    queryClient.invalidateQueries({ queryKey: ["questions"] });
    queryClient.invalidateQueries({ queryKey: ["chapters"] });
  };
  const review = async (ids: string[], approve: boolean) => {
    try {
      const r = await questionsApi.review(ids, approve);
      showToast(`${r.reviewed} ${approve ? "approved" : "sent back"}`, "success");
      refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const send = async (ids: string[]) => {
    try {
      const r = await questionsApi.send(ids);
      showToast(r.status === "approved" ? `${r.sent} approved` : `${r.sent} sent for review`, "success");
      refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async (x: Question) => {
    if (!(await confirm({ title: "Delete this question?", message: x.text.slice(0, 120), confirmLabel: "Delete" }))) return;
    await questionsApi.remove(x.id).catch((err) => showToast(errorMessage(err), "error"));
    refresh();
  };
  const d = q.data;
  const start = { classId: f.class ?? "", subjectId: f.subject ?? "", chapterId: f.chapter && f.chapter !== "none" ? f.chapter : "" };
  const canAdd = can("question.add");
  const canReview = can("question.approve");
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <ClassSubjectPicker options={opts.data} classId={f.class ?? ""} subjectId={f.subject ?? ""} onChange={pick} allowAll />
        {f.subject && <Select label="Chapter" value={f.chapter ?? ""} onChange={(chapter) => set({ chapter })} className="w-full sm:w-56" options={[{ value: "", label: "All" }, { value: "none", label: "No chapter" }, ...(chapters.data?.chapters ?? []).map((c) => ({ value: c.id, label: c.name }))]} />}
        <Select label="Kind" value={f.type ?? ""} onChange={(type) => set({ type })} className="w-full sm:w-40" options={[{ value: "", label: "All" }, ...QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_SHORT[t] }))]} />
        <Select label="Made" value={f.source ?? ""} onChange={(source) => set({ source })} className="w-full sm:w-36" options={[{ value: "", label: "Any way" }, { value: "manual", label: "Typed" }, { value: "import", label: "Imported" }, { value: "ai", label: "By AI" }]} />
        <Input label="Search" value={f.search ?? ""} onChange={(e) => set({ search: e.target.value })} className="sm:w-56" />
        {canAdd && (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Link href="/questions/import">
              <Button variant="secondary">Import from Excel</Button>
            </Link>
            {can("ai.generate") && (
              <Button variant="secondary" onClick={() => setGenerating(true)}>
                Write with AI
              </Button>
            )}
            <Button onClick={() => setEditing("new")}>Add a question</Button>
          </div>
        )}
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        {[{ value: "", label: "All" }, ...(["approved", "pending", "draft", "rejected"] as const).map((s) => ({ value: s, label: STATUS[s].label }))].map((s) => (
          <button key={s.value} type="button" onClick={() => set({ status: s.value })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", (f.status ?? "") === s.value ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
            {s.label}
            {s.value && d?.counts[s.value] ? ` (${d.counts[s.value]})` : ""}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-xs font-semibold">
          <input type="checkbox" checked={f.mine === "1"} onChange={(e) => set({ mine: e.target.checked ? "1" : undefined })} className="accent-primary" />
          Only mine
        </label>
        {!!picked.length && (
          <div className="ml-auto flex gap-2">
            {canAdd && (
              <Button variant="secondary" onClick={() => send(picked)}>
                Send {picked.length} on
              </Button>
            )}
            {canReview && (
              <>
                <Button variant="secondary" onClick={() => review(picked, false)}>
                  Send back {picked.length}
                </Button>
                <Button onClick={() => review(picked, true)}>Approve {picked.length}</Button>
              </>
            )}
          </div>
        )}
      </div>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d && (
        <div className="space-y-3">
          {d.rows.map((x) => (
            <Card key={x.id} className="flex gap-3">
              <input type="checkbox" aria-label="Select" checked={picked.includes(x.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((p) => p !== x.id))} className="mt-1 w-4 h-4 accent-primary shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <Pill tone={STATUS[x.status].tone}>{STATUS[x.status].label}</Pill>
                  <Pill>{TYPE_SHORT[x.type]}</Pill>
                  <span className="font-bold text-primary">{x.marks} mark{x.marks === 1 ? "" : "s"}</span>
                  {x.chapter && <span className="text-on-surface-variant/80">{x.chapter}</span>}
                  {x.difficulty && <span className="text-on-surface-variant/70">· {x.difficulty}</span>}
                  {x.level && <span className="text-on-surface-variant/70">· {x.level}</span>}
                  {x.source === "ai" && <Pill tone="primary">AI</Pill>}
                  {x.by && <span className="text-on-surface-variant/60">· {x.by}</span>}
                </div>
                <QuestionView q={x} />
                {x.reviewNote && <p className="text-[11px] text-error">Reviewer: {x.reviewNote}</p>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {x.canEdit && (
                  <button type="button" onClick={() => setEditing(x)} aria-label="Edit" className="p-1.5 rounded-full hover:bg-surface-container-high text-primary">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                )}
                {x.canEdit && (x.status === "draft" || x.status === "rejected") && (
                  <button type="button" onClick={() => send([x.id])} aria-label="Send on" title="Send on" className="p-1.5 rounded-full hover:bg-surface-container-high text-primary">
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                )}
                {x.canReview && x.status !== "approved" && (
                  <button type="button" onClick={() => review([x.id], true)} aria-label="Approve" title="Approve" className="p-1.5 rounded-full hover:bg-surface-container-high text-emerald-700">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </button>
                )}
                {x.canEdit && (
                  <button type="button" onClick={() => remove(x)} aria-label="Delete" className="p-1.5 rounded-full hover:bg-surface-container-high text-error">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                )}
              </div>
            </Card>
          ))}
          {!d.rows.length && <Card className="text-center text-sm text-on-surface-variant/70">No questions here.</Card>}
        </div>
      )}
      {d && d.pages > 1 && <Pagination currentPage={f.page ?? 1} totalPage={d.pages} onPageChange={(page) => set({ page })} />}
      {editing && <QuestionForm question={editing === "new" ? null : editing} start={start} onClose={() => setEditing(null)} />}
      {generating && <Generate start={start} onClose={() => setGenerating(false)} />}
    </div>
  );
}

export default function QuestionBankPage() {
  return (
    <>
      <PageHeader title="Question Bank" description="Questions of every kind by class, subject and chapter, reviewed before tests use them. Type them, import them, or have the AI draft them." />
      <Suspense fallback={<PageLoader />}>
        <Bank />
      </Suspense>
    </>
  );
}
