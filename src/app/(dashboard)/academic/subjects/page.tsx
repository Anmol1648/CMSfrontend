"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MoveButtons } from "@/components/ui/MoveButtons";
import { Checkbox, FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RecordHistory } from "@/components/admin/RecordHistory";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { YearSelect } from "@/components/academic/YearSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi, Subject } from "@/lib/api/academic";
import { mastersApi } from "@/lib/api/masters";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

const ASSESSMENT = { scholastic: "Scholastic", co_scholastic: "Co-scholastic" } as const;

function SubjectDialog({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");
  const [typeId, setTypeId] = useState(subject?.type?.id ?? "");
  const [assessment, setAssessment] = useState<Subject["assessment"]>(subject?.assessment ?? "scholastic");
  const [isActive, setIsActive] = useState(subject?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sure, setSure] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      onSaved(await fn());
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      setSure(false);
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const input = { name, code: code.trim() || null, typeId: typeId || null, assessment, isActive };
      if (subject) await academicApi.updateSubject(subject.id, input);
      else await academicApi.createSubject(input);
      return subject ? `${name.trim()} saved` : `${name.trim()} added`;
    });
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={subject ? `Edit ${subject.name}` : "Add subject"} width="max-w-xl">
      <form onSubmit={save} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} maxLength={80} disabled={busy} autoFocus />
          <Input label="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} error={fieldErrors.code} maxLength={20} disabled={busy} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MasterSelect master="subject_type" label="Type" value={typeId} onChange={setTypeId} placeholder="No type" error={fieldErrors.typeId} disabled={busy} />
          <Select
            label="Assessment"
            value={assessment}
            onChange={(v) => setAssessment(v as Subject["assessment"])}
            disabled={busy}
            options={[
              { value: "scholastic", label: "Scholastic (marks / grades)" },
              { value: "co_scholastic", label: "Co-scholastic (art, PE, work education…)" },
            ]}
          />
        </div>
        <Checkbox label="Active" hint="An inactive subject stays in past years but can't be added to classes." checked={isActive} onChange={setIsActive} disabled={busy} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {subject ? (
            sure ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-error font-semibold">Delete {subject.name}?</span>
                <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => run(async () => (await academicApi.deleteSubject(subject.id), `${subject.name} deleted`))}>
                  Yes, delete
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setSure(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => setSure(true)}>
                Delete
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <div className="w-32">
              <SubmitButton busy={busy} busyLabel="Saving…" disabled={!name.trim()} className="py-2.5">
                {subject ? "Save" : "Add"}
              </SubmitButton>
            </div>
          </div>
        </div>
      </form>
      {subject && (
        <div className="mt-6 -mx-2">
          <RecordHistory entity="subject" id={subject.id} />
        </div>
      )}
    </Modal>
  );
}

function SubjectList({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const subjects = useQuery({ queryKey: ["academic-subjects"], queryFn: academicApi.subjects });
  const [editing, setEditing] = useState<Subject | "new" | null>(null);
  const [moving, setMoving] = useState(false);
  const list = subjects.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["academic-subjects"] });
    await queryClient.invalidateQueries({ queryKey: ["academic-subject-options"] });
  };
  const move = async (id: string, d: "up" | "down") => {
    setMoving(true);
    try {
      await academicApi.moveSubject(id, d);
      await refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setMoving(false);
    }
  };

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
          <p className="text-sm text-on-surface-variant/70">Every subject the school teaches, in the order used on report cards.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => academicApi.exportSubjects().catch((err) => showToast(errorMessage(err), "error"))}>
              Export
            </Button>
            {canManage && (
              <Link href="/academic/subjects/import" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Import
              </Link>
            )}
            {canManage && <Button onClick={() => setEditing("new")}>Add subject</Button>}
          </div>
        </div>
        {subjects.isError && (
          <div className="p-5">
            <FormAlert>{errorMessage(subjects.error)}</FormAlert>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                {canManage && <th className="pl-5 py-3 w-20 font-bold">Order</th>}
                <th className="px-5 py-3 font-bold">Subject</th>
                <th className="px-5 py-3 font-bold">Code</th>
                <th className="px-5 py-3 font-bold">Type</th>
                <th className="px-5 py-3 font-bold">Assessment</th>
                <th className="px-5 py-3 font-bold">Taught in</th>
                <th className="px-5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => (
                <tr key={s.id} onClick={canManage ? () => setEditing(s) : undefined} className={cn("border-t border-outline-variant/10 hover:bg-surface-container-low/60", canManage && "cursor-pointer")}>
                  {canManage && (
                    <td className="pl-5 py-2">
                      <MoveButtons label={s.name} first={i === 0} last={i === list.length - 1} disabled={moving} onMove={(d) => move(s.id, d)} />
                    </td>
                  )}
                  <td className="px-5 py-3 font-semibold text-on-surface">{s.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{s.code ?? "—"}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{s.type?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{ASSESSMENT[s.assessment]}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{s.usedBy ? `${s.usedBy} class${s.usedBy === 1 ? "" : "es"}` : "—"}</td>
                  <td className="px-5 py-3">{s.isActive ? <Pill tone="success">Active</Pill> : <Pill>Inactive</Pill>}</td>
                </tr>
              ))}
              {subjects.data && !list.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant/70">
                    No subjects yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && (
        <SubjectDialog
          subject={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            setEditing(null);
            showToast(message, "success");
            await refresh();
          }}
        />
      )}
    </>
  );
}

type Chosen = { subjectId: string; isOptional: boolean };

function ClassSubjects({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [yearId, setYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState(""); // "" = common to all streams
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: () => academicApi.classes() });
  const subjects = useQuery({ queryKey: ["academic-subject-options"], queryFn: academicApi.subjectOptions });
  const streams = useQuery({ queryKey: ["master-options", "stream", null, null], queryFn: () => mastersApi.options("stream") });
  const current = useQuery({ queryKey: ["academic-class-subjects", yearId, classId], queryFn: () => academicApi.classSubjects(yearId, classId), enabled: !!yearId && !!classId });
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cls = classes.data?.find((c) => c.id === classId);
  const year = years.data?.find((y) => y.id === yearId);
  const editable = canManage && year?.status === "open";

  useEffect(() => {
    if (!classId && classes.data?.length) setClassId(classes.data.find((c) => c.isActive)?.id ?? classes.data[0].id);
  }, [classId, classes.data]);
  useEffect(() => setStreamId(""), [classId]);

  // What is saved for this class and stream.
  const saved = useMemo<Chosen[]>(() => (current.data ?? []).filter((r) => (r.streamId ?? "") === streamId).map((r) => ({ subjectId: r.subject.id, isOptional: r.isOptional })), [current.data, streamId]);
  useEffect(() => {
    setChosen(saved);
    setError(null);
  }, [saved]);
  const dirty = JSON.stringify(chosen) !== JSON.stringify(saved);

  const nameOf = (id: string) => subjects.data?.find((s) => s.id === id)?.name ?? current.data?.find((r) => r.subject.id === id)?.subject.name ?? "…";
  // Subjects set at the other level (common vs a stream) can't be added here.
  const elsewhere = new Set((current.data ?? []).filter((r) => (streamId ? r.streamId === null : r.streamId !== null)).map((r) => r.subject.id));
  const addable = (subjects.data ?? []).filter((s) => !chosen.some((c) => c.subjectId === s.id) && !elsewhere.has(s.id));
  const commonCount = (current.data ?? []).filter((r) => r.streamId === null).length;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await academicApi.setClassSubjects({ academicYearId: yearId, classId, streamId: streamId || null, subjects: chosen });
      showToast(`Subjects of ${cls?.name}${streamId ? ` (${streams.data?.find((s) => s.id === streamId)?.name})` : ""} saved`, "success");
      await queryClient.invalidateQueries({ queryKey: ["academic-class-subjects", yearId, classId] });
      await queryClient.invalidateQueries({ queryKey: ["academic-subjects"] });
      await queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, d: "up" | "down") =>
    setChosen((list) => {
      const next = [...list];
      const j = d === "up" ? i - 1 : i + 1;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <YearSelect value={yearId} onChange={setYearId} />
        <Select label="Class" value={classId} onChange={setClassId} options={(classes.data ?? []).map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (inactive)` }))} />
        {cls?.hasStreams && (
          <Select
            label="Stream"
            value={streamId}
            onChange={setStreamId}
            options={[{ value: "", label: "All streams (common subjects)" }, ...(streams.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
          />
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-primary">
            {cls?.name ?? "…"}
            {cls?.hasStreams ? (streamId ? ` · ${streams.data?.find((s) => s.id === streamId)?.name}` : " · all streams") : ""} in {year?.name ?? "…"}
          </h2>
          <p className="text-sm text-on-surface-variant/70">
            {cls?.hasStreams
              ? streamId
                ? `Only for this stream's sections, on top of the ${commonCount} common subject${commonCount === 1 ? "" : "s"}.`
                : "Studied in every stream of this class. Choose a stream above for its own subjects."
              : "Optional subjects are the ones each student chooses from (for example Hindi or Sanskrit)."}
          </p>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        {year && year.status === "closed" && <FormAlert tone="info">{year.name} is closed: its subjects can be seen but not changed.</FormAlert>}

        <ol className="divide-y divide-outline-variant/10 border border-outline-variant/20 rounded-xl">
          {chosen.map((c, i) => (
            <li key={c.subjectId} className="flex items-center gap-3 px-4 py-2.5">
              {editable && <MoveButtons label={nameOf(c.subjectId)} first={i === 0} last={i === chosen.length - 1} onMove={(d) => move(i, d)} />}
              <span className="flex-1 font-semibold text-on-surface">{nameOf(c.subjectId)}</span>
              {editable ? (
                <>
                  <Checkbox label="Optional" checked={c.isOptional} onChange={(on) => setChosen((list) => list.map((x, k) => (k === i ? { ...x, isOptional: on } : x)))} />
                  <button type="button" aria-label={`Remove ${nameOf(c.subjectId)}`} onClick={() => setChosen((list) => list.filter((_, k) => k !== i))} className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-error">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </>
              ) : (
                c.isOptional && <Pill>Optional</Pill>
              )}
            </li>
          ))}
          {!chosen.length && <li className="px-4 py-6 text-center text-sm text-on-surface-variant/70">{current.isLoading ? "Loading…" : "No subjects yet."}</li>}
        </ol>

        {editable && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-2">
              <div className="w-72">
                <Select label="Add a subject" value={adding} onChange={setAdding} options={[{ value: "", label: addable.length ? "Choose…" : "All subjects are added" }, ...addable.map((s) => ({ value: s.id, label: s.name }))]} />
              </div>
              <Button
                variant="secondary"
                disabled={!adding}
                onClick={() => {
                  setChosen((list) => [...list, { subjectId: adding, isOptional: false }]);
                  setAdding("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" disabled={!dirty || busy} onClick={() => setChosen(saved)}>
                Discard changes
              </Button>
              <Button disabled={!dirty || busy || !yearId || !classId} onClick={save}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Subjects() {
  const { can } = useAuth();
  const canManage = can("academic.manage");
  const [tab, setTab] = useState<"subjects" | "classes">("subjects");
  return (
    <>
      <PageHeader title="Subjects" description="The subjects the school teaches, and which ones each class studies in a year." />
      <div className="max-w-5xl space-y-4">
        <div className="flex gap-2">
          {(
            [
              ["subjects", "All subjects"],
              ["classes", "Subjects of each class"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn("px-5 py-2.5 rounded-xl text-sm font-bold", tab === key ? "bg-primary text-white" : "bg-surface-container-low text-primary hover:bg-surface-container-high")}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "subjects" ? <SubjectList canManage={canManage} /> : <ClassSubjects canManage={canManage} />}
      </div>
    </>
  );
}

export default function SubjectsPage() {
  return (
    <RequirePermission permission="academic.view">
      <Subjects />
    </RequirePermission>
  );
}
