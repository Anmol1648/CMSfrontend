"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { ClassSubjectPicker } from "@/components/questions/ClassSubjectPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { Chapter, questionsApi } from "@/lib/api/questions";
import { DragHandle, SortableItem, SortableList, useSortableRows } from "@/components/ui/Sortable";

function ChapterForm({ chapter, classId, subjectId, onClose }: { chapter: Chapter | null; classId: string; subjectId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState({ name: chapter?.name ?? "", topics: (chapter?.topics ?? []).join(", "), description: chapter?.description ?? "", isActive: chapter?.isActive ?? true });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    const input = { name: v.name, topics: v.topics.split(",").map((t) => t.trim()).filter(Boolean), description: v.description || null, isActive: v.isActive };
    try {
      if (chapter) await questionsApi.updateChapter(chapter.id, input);
      else await questionsApi.addChapter({ ...input, classId, subjectId });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={chapter ? `Edit ${chapter.name}` : "Add a chapter"}>
      <div className="space-y-4">
        <Input label="Chapter" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={fieldErrors.name} maxLength={150} autoFocus />
        <Input label="Topics (comma-separated)" value={v.topics} onChange={(e) => setV({ ...v, topics: e.target.value })} placeholder="Photosynthesis, Modes of nutrition" />
        <TextArea label="Notes (optional)" rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        {chapter && <Checkbox label="Active" hint="Inactive chapters keep their questions but aren’t offered for new ones." checked={v.isActive} onChange={(c) => setV({ ...v, isActive: c })} />}
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddMany({ classId, subjectId, onClose }: { classId: string; subjectId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { can } = useAuth();
  const ai = useQuery({ queryKey: ["ai-status"], queryFn: questionsApi.aiStatus, staleTime: 60_000 });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggest = async () => {
    setBusy(true);
    setError(null);
    try {
      const list = await questionsApi.suggestChapters(classId, subjectId);
      setText(list.map((c) => `${c.name}${c.topics.length ? `: ${c.topics.join(", ")}` : ""}`).join("\n"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await questionsApi.addChapters(classId, subjectId, text.split("\n").map((l) => l.trim()).filter(Boolean));
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      showToast(`${r.added} chapter${r.added === 1 ? "" : "s"} added`, "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Add many chapters" width="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant/80">One chapter per line; topics after a colon, e.g. “Nutrition in Plants: Photosynthesis, Parasites”. Chapters already there are skipped.</p>
        {can("ai.generate") && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={suggest} disabled={busy || !ai.data?.ready}>
              {busy ? "Asking the AI…" : "Suggest with AI (CBSE / NCERT)"}
            </Button>
            {ai.data && !ai.data.ready && <span className="text-xs text-on-surface-variant/70">{ai.data.why}</span>}
          </div>
        )}
        <TextArea label="Chapters" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Nutrition in Plants: Photosynthesis, Modes of nutrition\nNutrition in Animals\nHeat"} />
        <p className="text-[11px] text-on-surface-variant/70">Read the AI’s list before adding: change or remove lines as needed.</p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !text.trim()}>
            Add these
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Chapters() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const opts = useQuery({ queryKey: ["question-options", "chapters"], queryFn: () => questionsApi.options("chapters") });
  const [sel, setSel] = useState({ classId: "", subjectId: "" });
  const [editing, setEditing] = useState<Chapter | "new" | null>(null);
  const [many, setMany] = useState(false);
  const q = useQuery({ queryKey: ["chapters", sel.classId, sel.subjectId], queryFn: () => questionsApi.chapters(sel.classId, sel.subjectId), enabled: !!sel.classId && !!sel.subjectId });
  const pick = useCallback((classId: string, subjectId: string) => setSel({ classId, subjectId }), []);
  const sorted = useSortableRows(q.data?.chapters ?? [], (id, place) => questionsApi.moveChapter(id, place).then(() => queryClient.invalidateQueries({ queryKey: ["chapters"] })));
  if (!opts.data) return <PageLoader />;
  if (!opts.data.classes.length) return <FormAlert tone="info">You have no subjects to set up (Staff → Subject Teachers).</FormAlert>;
  const move = async (c: Chapter, direction: "up" | "down") => {
    await questionsApi.moveChapter(c.id, direction).catch((err) => showToast(errorMessage(err), "error"));
    queryClient.invalidateQueries({ queryKey: ["chapters"] });
  };
  const remove = async (c: Chapter) => {
    if (!(await confirm({ title: `Delete ${c.name}?`, message: "Only a chapter without questions can be deleted.", confirmLabel: "Delete" }))) return;
    try {
      await questionsApi.deleteChapter(c.id);
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const d = q.data;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <ClassSubjectPicker options={opts.data} classId={sel.classId} subjectId={sel.subjectId} onChange={pick} />
        {d?.canEdit && (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="secondary" onClick={() => setMany(true)}>
              Add many
            </Button>
            <Link href="/questions/chapters/import">
              <Button variant="secondary">Import from Excel</Button>
            </Link>
            <Button onClick={() => setEditing("new")}>Add a chapter</Button>
          </div>
        )}
      </Card>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {sel.subjectId && !d && !q.isError && <PageLoader />}
      {d && (
        <Card padding="none" className="overflow-hidden">
          <SortableList ids={sorted.ids} onDrop={sorted.onDrop} disabled={!d.canEdit}>
          {sorted.rows.map((c, i) => (
            <SortableItem key={c.id} id={c.id} className="flex items-start gap-3 px-5 py-3 border-b border-outline-variant/10">
              <DragHandle label={c.name} />
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold flex flex-wrap items-center gap-2">
                  {c.name}
                  {!c.isActive && <Pill>inactive</Pill>}
                </p>
                {!!c.topics.length && <p className="text-xs text-on-surface-variant/70">{c.topics.join(" · ")}</p>}
                <Link href={`/questions?class=${sel.classId}&subject=${sel.subjectId}&chapter=${c.id}`} className="text-[11px] font-bold text-primary hover:opacity-70">
                  {c.questions} question{c.questions === 1 ? "" : "s"} ({c.approved} approved) →
                </Link>
              </div>
              {d.canEdit && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(c, "up")} disabled={i === 0} aria-label="Move up" className="p-1 rounded-full hover:bg-surface-container-high disabled:opacity-30">
                    <span className="material-symbols-outlined text-lg">arrow_upward</span>
                  </button>
                  <button type="button" onClick={() => move(c, "down")} disabled={i === sorted.rows.length - 1} aria-label="Move down" className="p-1 rounded-full hover:bg-surface-container-high disabled:opacity-30">
                    <span className="material-symbols-outlined text-lg">arrow_downward</span>
                  </button>
                  <button type="button" onClick={() => setEditing(c)} aria-label="Edit" className="p-1 rounded-full hover:bg-surface-container-high text-primary">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button type="button" onClick={() => remove(c)} aria-label="Delete" className="p-1 rounded-full hover:bg-surface-container-high text-error">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              )}
            </SortableItem>
          ))}
          </SortableList>
          {!d.chapters.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">No chapters yet. {d.canEdit ? "Add them one by one, many at once, or from Excel." : ""}</p>}
          {!!d.noChapter && <p className="px-5 py-3 text-xs text-on-surface-variant/70">{d.noChapter} questions have no chapter.</p>}
        </Card>
      )}
      {editing && <ChapterForm chapter={editing === "new" ? null : editing} classId={sel.classId} subjectId={sel.subjectId} onClose={() => setEditing(null)} />}
      {many && <AddMany classId={sel.classId} subjectId={sel.subjectId} onClose={() => setMany(false)} />}
    </div>
  );
}

export default function ChaptersPage() {
  return (
    <>
      <PageHeader title="Chapters" description="The chapters (and topics) of each class’s subjects: the base for the question bank, online tests and AI learning." />
      <Chapters />
    </>
  );
}
