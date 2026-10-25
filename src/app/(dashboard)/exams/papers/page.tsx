"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { exams2Api, fmtDay, PaperLine, PaperRow } from "@/lib/api/exams2";
import { ExamPicker } from "@/components/exams/ExamPicker";
import { arrayMove, DragHandle, SortableItem, SortableList } from "@/components/ui/Sortable";

const TYPES: Record<string, string> = { mcq: "MCQ", multi: "Multiple answers", true_false: "True / false", fill: "Fill in", short: "Short answer", long: "Long answer" };

function Editor({ examId, row, onClose }: { examId: string; row: PaperRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["exams2", "paper", examId, row.classId, row.subjectId], queryFn: () => exams2Api.paper(examId, row.classId, row.subjectId) });
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("180");
  const [lines, setLines] = useState<PaperLine[]>([]);
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [section, setSection] = useState("A");
  const [chapter, setChapter] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState([{ section: "A", type: "mcq", marks: 1, count: 5 }, { section: "B", type: "short", marks: 3, count: 4 }, { section: "C", type: "long", marks: 5, count: 2 }]);
  const [doc, setDoc] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!q.data) return;
    setTitle(q.data.title);
    setInstructions(q.data.instructions ?? "");
    setDuration(String(q.data.durationMins));
    setLines(q.data.lines);
    setFile(q.data.fileId ? { id: q.data.fileId, name: "Uploaded paper" } : null);
  }, [q.data]);
  const bank = useQuery({ queryKey: ["exams2", "bank", examId, row.classId, row.subjectId, chapter, type, search], queryFn: () => exams2Api.bank(examId, row.classId, row.subjectId, { chapter, type, search }) });
  const total = lines.reduce((a, l) => a + l.marks, 0);
  const save = async (status: "draft" | "final") => {
    try {
      await exams2Api.savePaper(examId, row.classId, row.subjectId, { title, instructions: instructions || null, durationMins: Number(duration) || 180, lines: lines.map(({ section: s, questionId, marks }) => ({ section: s, questionId, marks })), fileId: file?.id ?? null, status });
      queryClient.invalidateQueries({ queryKey: ["exams2"] });
      showToast(status === "final" ? "Saved as final" : "Saved", "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const move = (i: number, d: number) => setLines((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <Modal isOpen onClose={onClose} title={`${row.className} · ${row.subject}`} width="max-w-6xl">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              <Input label="Time (minutes)" type="number" min={10} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">General instructions (one per line)</span>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} maxLength={2000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
            </label>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-bold">
                {lines.length} questions · {total} marks{" "}
                <span className={total === row.max ? "text-emerald-700" : "text-amber-700"}>(exam max {row.max})</span>
              </p>
            </div>
            <ol className="space-y-1.5 max-h-[45vh] overflow-auto">
              <SortableList ids={lines.map((l, i) => `${l.questionId}-${i}`)} onDrop={(d) => setLines((x) => arrayMove(x, d.from, d.to))}>
              {lines.map((l, i) => (
                <SortableItem as="li" key={`${l.questionId}-${i}`} id={`${l.questionId}-${i}`} className="flex items-start gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                  <DragHandle label={`question ${i + 1}`} />
                  <input value={l.section} onChange={(e) => setLines((x) => x.map((y, k) => (k === i ? { ...y, section: e.target.value } : y)))} className="w-10 rounded bg-white px-1 py-0.5 text-xs text-center" aria-label="Section" />
                  <span className="flex-1">
                    <b>{i + 1}.</b> {l.text}
                    <span className="block text-[11px] text-on-surface-variant">
                      {TYPES[l.type ?? ""] ?? l.type} {l.chapter ? `· ${l.chapter}` : ""}
                    </span>
                  </span>
                  <input type="number" min={0} value={l.marks} onChange={(e) => setLines((x) => x.map((y, k) => (k === i ? { ...y, marks: Number(e.target.value) || 0 } : y)))} className="w-14 rounded bg-white px-1 py-0.5 text-xs" aria-label="Marks" />
                  <button type="button" onClick={() => move(i, -1)} className="text-on-surface-variant" aria-label="Up">
                    <span className="material-symbols-outlined text-base">arrow_upward</span>
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="text-on-surface-variant" aria-label="Down">
                    <span className="material-symbols-outlined text-base">arrow_downward</span>
                  </button>
                  <button type="button" onClick={() => setLines((x) => x.filter((_, k) => k !== i))} className="text-error" aria-label="Remove">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </SortableItem>
              ))}
              </SortableList>
              {!lines.length && <li className="text-sm text-on-surface-variant">No questions yet: add from the bank, fill automatically, or upload a paper file.</li>}
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <span className="material-symbols-outlined text-lg">upload</span> {file ? "Change uploaded paper" : "Upload a paper instead"}
              </Button>
              {file && (
                <button type="button" className="text-xs font-bold text-primary" onClick={async () => { try { window.open(await authedImageUrl(exams2Api.paperFilePath(examId, row.classId, row.subjectId)), "_blank", "noopener"); } catch (e) { showToast(errorMessage(e), "error"); } }}>
                  Open the file
                </button>
              )}
              <input ref={fileRef} type="file" accept="application/pdf,.docx,image/png,image/jpeg" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setFile(await exams2Api.uploadPaperFile(f)); showToast("Uploaded: save to keep it", "success"); } catch (er) { showToast(errorMessage(er), "error"); } }} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {q.data?.id && (
                <>
                  <Button variant="tertiary" onClick={() => setDoc(false)}>
                    Print paper
                  </Button>
                  <Button variant="tertiary" onClick={() => setDoc(true)}>
                    Answer key
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={() => save("draft")}>
                Save draft
              </Button>
              <Button onClick={() => save("final")}>Save as final</Button>
            </div>
          </div>
          <div className="space-y-4">
            <Card padding="sm">
              <p className="font-bold mb-2">Fill automatically</p>
              <div className="space-y-1.5">
                {plan.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <input value={p.section} onChange={(e) => setPlan((x) => x.map((y, k) => (k === i ? { ...y, section: e.target.value } : y)))} className="w-10 rounded bg-surface-container-low px-1 py-1 text-center" aria-label="Section" />
                    <select value={p.type} onChange={(e) => setPlan((x) => x.map((y, k) => (k === i ? { ...y, type: e.target.value } : y)))} className="rounded bg-surface-container-low px-1 py-1" aria-label="Type">
                      {Object.entries(TYPES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <input type="number" min={1} value={p.count} onChange={(e) => setPlan((x) => x.map((y, k) => (k === i ? { ...y, count: Number(e.target.value) || 1 } : y)))} className="w-12 rounded bg-surface-container-low px-1 py-1" aria-label="How many" />
                    <span>×</span>
                    <input type="number" min={0} value={p.marks} onChange={(e) => setPlan((x) => x.map((y, k) => (k === i ? { ...y, marks: Number(e.target.value) || 0 } : y)))} className="w-12 rounded bg-surface-container-low px-1 py-1" aria-label="Marks" />
                    <span>marks</span>
                    <button type="button" className="text-error" onClick={() => setPlan((x) => x.filter((_, k) => k !== i))} aria-label="Remove">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                <button type="button" className="text-xs font-bold text-primary" onClick={() => setPlan((x) => [...x, { section: String.fromCharCode(65 + x.length), type: "short", marks: 2, count: 3 }])}>
                  + Add a row
                </button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const r = await exams2Api.autoFill(examId, row.classId, row.subjectId, { chapterIds: chapter ? [chapter] : [], plan });
                      const qs = await exams2Api.bank(examId, row.classId, row.subjectId, {});
                      setLines(r.lines.map((l) => { const x = qs.questions.find((y) => y.id === l.questionId); return { ...l, text: x?.text, type: x?.type, chapter: x?.chapter }; }));
                      showToast(r.short.length ? `Filled; the bank is short of ${r.short.join(", ")}` : "Filled from the bank", r.short.length ? "error" : "success");
                    } catch (e) {
                      showToast(errorMessage(e), "error");
                    }
                  }}
                >
                  Fill
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant">Random approved questions{chapter ? " of the chosen chapter" : ""}. Replaces the questions on the left.</p>
            </Card>
            <Card padding="sm">
              <p className="font-bold mb-2">Question bank</p>
              <div className="grid grid-cols-2 gap-2">
                <Select value={chapter} onChange={setChapter} options={[{ value: "", label: "All chapters" }, ...(bank.data?.chapters ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
                <Select value={type} onChange={setType} options={[{ value: "", label: "All types" }, ...Object.entries(TYPES).map(([value, label]) => ({ value, label }))]} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
                <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="Add to section" />
              </div>
              <ul className="mt-2 max-h-[38vh] overflow-auto divide-y divide-outline-variant/15 text-xs">
                {(bank.data?.questions ?? []).map((b) => {
                  const added = lines.some((l) => l.questionId === b.id);
                  return (
                    <li key={b.id} className="flex items-start gap-2 py-1.5">
                      <span className="flex-1">
                        {b.text}
                        <span className="block text-on-surface-variant">
                          {TYPES[b.type] ?? b.type} · {b.marks} mark(s){b.chapter ? ` · ${b.chapter}` : ""}
                        </span>
                      </span>
                      <button type="button" disabled={added} onClick={() => setLines((l) => [...l, { section, questionId: b.id, marks: b.marks, text: b.text, type: b.type, chapter: b.chapter }])} className="font-bold text-primary disabled:text-on-surface-variant/50">
                        {added ? "Added" : "Add"}
                      </button>
                    </li>
                  );
                })}
                {bank.data && !bank.data.questions.length && <li className="py-2 text-on-surface-variant">No approved questions here. Add them on Learning → Question Bank.</li>}
              </ul>
            </Card>
          </div>
        </div>
      )}
      {doc !== null && <DocumentViewer docKey="question_paper" params={{ exam: examId, class: row.classId, subject: row.subjectId, key: doc ? "1" : "0" }} title={doc ? "Answer key" : "Question paper"} filename="question-paper.pdf" onClose={() => setDoc(null)} />}
    </Modal>
  );
}

function Papers() {
  const [yearId, setYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [open, setOpen] = useState<PaperRow | null>(null);
  const q = useQuery({ queryKey: ["exams2", "papers", examId], queryFn: () => exams2Api.papers(examId), enabled: !!examId });
  return (
    <div className="space-y-4">
      <Card>
        <ExamPicker yearId={yearId} setYearId={setYearId} examId={examId} setExamId={setExamId} />
      </Card>
      {q.isLoading && examId ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : q.data ? (
        q.data.rows.length ? (
          <Card padding="none">
            <ul className="divide-y divide-outline-variant/15 text-sm">
              {q.data.rows.map((r) => (
                <li key={`${r.classId}|${r.subjectId}`}>
                  <button type="button" onClick={() => setOpen(r)} className="w-full flex flex-wrap items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-container-low">
                    <span className="w-28 font-bold">{r.className}</span>
                    <span className="flex-1">{r.subject}</span>
                    <span className="text-xs text-on-surface-variant w-28">{fmtDay(r.date)}</span>
                    {r.paper ? (
                      <Pill tone={r.paper.status === "final" ? "success" : "warning"}>
                        {r.paper.status === "final" ? "Final" : "Draft"} · {r.paper.file ? "file" : `${r.paper.questions} Q, ${r.paper.marks}/${r.max}`}
                      </Pill>
                    ) : (
                      <Pill>Not made</Pill>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <FormAlert tone="info">No papers for you in this exam (teachers see the subjects they teach).</FormAlert>
        )
      ) : null}
      {open && <Editor examId={examId} row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function QuestionPapersPage() {
  return (
    <RequirePermission permission={["exam.papers", "exam.marks"]}>
      <PageHeader title="Question Papers" description="Make each subject’s paper from the question bank (by hand or automatically) or upload one, then print the paper and its answer key. Only the subject’s teachers and the exam office see it." />
      <Papers />
    </RequirePermission>
  );
}
