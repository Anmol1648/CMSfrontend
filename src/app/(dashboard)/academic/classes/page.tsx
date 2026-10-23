"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MoveButtons, OrderHint } from "@/components/ui/MoveButtons";
import { Checkbox, FormAlert, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RecordHistory } from "@/components/admin/RecordHistory";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { YearSelect } from "@/components/academic/YearSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi, SchoolClass, Section } from "@/lib/api/academic";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";
import { SessionClasses } from "@/components/academic/SessionClasses";

/** Runs a save; returns the error to show (and field errors), or null when it worked. */
function useSave() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fieldErrors, run };
}

function DeleteButton({ label, busy, onDelete }: { label: string; busy: boolean; onDelete: () => void }) {
  const [sure, setSure] = useState(false);
  return sure ? (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-error font-semibold">Delete {label}?</span>
      <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={onDelete}>
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
  );
}

function ClassDialog({ cls, onClose, onSaved }: { cls: SchoolClass | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(cls?.name ?? "");
  const [shortName, setShortName] = useState(cls?.shortName ?? "");
  const [groupId, setGroupId] = useState(cls?.group?.id ?? "");
  const [hasStreams, setHasStreams] = useState(cls?.hasStreams ?? false);
  const [isActive, setIsActive] = useState(cls?.isActive ?? true);
  const [nextClassId, setNextClassId] = useState(cls?.nextClassId ?? "");
  const catalogue = useQuery({ queryKey: ["academic-classes", null], queryFn: () => academicApi.classes() });
  const { busy, error, fieldErrors, run } = useSave();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const input = { name, shortName: shortName.trim() || null, groupId: groupId || null, hasStreams, isActive, nextClassId: nextClassId || null };
      if (cls) await academicApi.updateClass(cls.id, input);
      else await academicApi.createClass(input);
      onSaved(cls ? `${name.trim()} saved` : `${name.trim()} added`);
    });
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={cls ? `Edit ${cls.name}` : "Add class"} width="max-w-xl">
      <form onSubmit={save} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} maxLength={60} placeholder="Class VI" disabled={busy} autoFocus />
          <Input label="Short name" value={shortName} onChange={(e) => setShortName(e.target.value)} error={fieldErrors.shortName} maxLength={12} placeholder="VI" disabled={busy} />
        </div>
        <MasterSelect master="class_group" label="Class group (optional)" value={groupId} onChange={setGroupId} placeholder="No group" error={fieldErrors.groupId} disabled={busy} />
        <Checkbox label="Has streams" hint="Sections and subjects are set per stream (Science, Commerce…), as in XI and XII." checked={hasStreams} onChange={setHasStreams} disabled={busy} />
        <Select
          label="Promoted to"
          value={nextClassId}
          onChange={setNextClassId}
          disabled={busy}
          options={[{ value: "", label: "The next class in order (none after the last class)" }, ...(catalogue.data ?? []).filter((c) => c.isActive && c.id !== cls?.id).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Checkbox label="The school still has this class" hint="Untick only if the school stops it for good (it keeps its history). To leave it out of one session, untick it in that session’s classes instead." checked={isActive} onChange={setIsActive} disabled={busy} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {cls ? <DeleteButton label={cls.name} busy={busy} onDelete={() => run(async () => (await academicApi.deleteClass(cls.id), onSaved(`${cls.name} deleted`)))} /> : <span />}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <div className="w-32">
              <SubmitButton busy={busy} busyLabel="Saving…" disabled={!name.trim()} className="py-2.5">
                {cls ? "Save" : "Add"}
              </SubmitButton>
            </div>
          </div>
        </div>
      </form>
      {cls && (
        <div className="mt-6 -mx-2">
          <RecordHistory entity="class" id={cls.id} />
        </div>
      )}
    </Modal>
  );
}

function SectionDialog({ cls, yearId, section, onClose, onSaved }: { cls: SchoolClass; yearId: string; section: Section | null; onClose: () => void; onSaved: (message: string) => void }) {
  const teachers = useQuery({ queryKey: ["academic-teachers"], queryFn: academicApi.teacherOptions });
  const [name, setName] = useState(section?.name ?? String.fromCharCode(65 + cls.sections.length));
  const [streamId, setStreamId] = useState(section?.stream?.id ?? "");
  const [capacity, setCapacity] = useState(section?.capacity ? String(section.capacity) : "");
  const [room, setRoom] = useState(section?.room ?? "");
  const [teacherId, setTeacherId] = useState(section?.classTeacher?.id ?? "");
  const [isActive, setIsActive] = useState(section?.isActive ?? true);
  const { busy, error, fieldErrors, run } = useSave();
  const title = `${cls.shortName ?? cls.name}-${name || "?"}`;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const input = {
        name,
        streamId: cls.hasStreams ? streamId || null : null,
        capacity: capacity.trim() ? Number(capacity) : null,
        room: room.trim() || null,
        classTeacherId: teacherId || null,
        isActive,
      };
      if (section) await academicApi.updateSection(section.id, input);
      else await academicApi.createSection({ academicYearId: yearId, classId: cls.id, ...input });
      onSaved(section ? `${title} saved` : `${title} added`);
    });
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={section ? `Edit section ${title}` : `Add a section to ${cls.name}`} width="max-w-xl">
      <form onSubmit={save} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <div className={cn("grid gap-4", cls.hasStreams ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
          <Input label="Section" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} maxLength={20} placeholder="A" disabled={busy} autoFocus />
          {cls.hasStreams && <MasterSelect master="stream" label="Stream" value={streamId} onChange={setStreamId} error={fieldErrors.streamId} disabled={busy} />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Capacity (optional)" type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(e.target.value)} error={fieldErrors.capacity} disabled={busy} />
          <Input label="Room (optional)" value={room} onChange={(e) => setRoom(e.target.value)} error={fieldErrors.room} maxLength={40} disabled={busy} />
        </div>
        <Select
          label="Class teacher (optional)"
          value={teacherId}
          onChange={setTeacherId}
          error={fieldErrors.classTeacherId}
          disabled={busy}
          options={[{ value: "", label: teachers.isLoading ? "Loading…" : "Not chosen yet" }, ...(teachers.data ?? []).map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))]}
        />
        <Checkbox label="Active" checked={isActive} onChange={setIsActive} disabled={busy} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {section ? <DeleteButton label={title} busy={busy} onDelete={() => run(async () => (await academicApi.deleteSection(section.id), onSaved(`${title} deleted`)))} /> : <span />}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <div className="w-32">
              <SubmitButton busy={busy} busyLabel="Saving…" disabled={!name.trim() || (cls.hasStreams && !streamId)} className="py-2.5">
                {section ? "Save" : "Add"}
              </SubmitButton>
            </div>
          </div>
        </div>
      </form>
      {section && (
        <div className="mt-6 -mx-2">
          <RecordHistory entity="section" id={section.id} />
        </div>
      )}
    </Modal>
  );
}

function Classes() {
  const { can } = useAuth();
  const canManage = can("academic.manage");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [yearId, setYearId] = useState("");
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const classes = useQuery({ queryKey: ["academic-classes", yearId], queryFn: () => academicApi.classes(yearId), enabled: !!yearId });
  const [editingClass, setEditingClass] = useState<SchoolClass | "new" | null>(null);
  const [editingSection, setEditingSection] = useState<{ cls: SchoolClass; section: Section | null } | null>(null);
  const [moving, setMoving] = useState(false);
  const [sessionClasses, setSessionClasses] = useState(false);

  const year = years.data?.find((y) => y.id === yearId);
  const open = year?.status === "open";
  const all = classes.data ?? [];
  // Only the classes the chosen session runs; the others only when asked (to add one back).
  const [showOthers, setShowOthers] = useState(false);
  const others = all.filter((c) => c.inYear === null && c.isActive);
  const list = showOthers ? all : all.filter((c) => c.inYear !== null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["academic-classes"] });
    await queryClient.invalidateQueries({ queryKey: ["academic-years"] });
  };
  const saved = async (message: string) => {
    setEditingClass(null);
    setEditingSection(null);
    showToast(message, "success");
    await refresh();
  };
  /** Runs a class in this session too (the others it runs stay as they are). */
  const addToSession = async (c: SchoolClass) => {
    try {
      const running = all.filter((x) => x.inYear).map((x) => ({ classId: x.id, admissionsOpen: x.inYear!.admissionsOpen, seats: x.inYear!.seats }));
      await academicApi.saveYearClasses(yearId, [...running, { classId: c.id, admissionsOpen: true, seats: null }]);
      showToast(`${c.name} added to ${year?.name}`, "success");
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["academic-class-options"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const moveClass = async (id: string, direction: "up" | "down") => {
    setMoving(true);
    try {
      await academicApi.moveClass(id, direction);
      await refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setMoving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Classes & Sections"
        description="The class list is the school’s; each session runs the classes ticked for it (Classes in this session). Sections, streams and class teachers are set per session."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!yearId} onClick={() => academicApi.exportSections(yearId).catch((err) => showToast(errorMessage(err), "error"))}>
              Export sections
            </Button>
            {canManage && (
              <Link href="/academic/classes/import" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Import sections
              </Link>
            )}
            {canManage && <Button onClick={() => setEditingClass("new")}>Add class</Button>}
          </div>
        }
      />

      <div className="max-w-5xl space-y-4">
        <Card className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-72">
            <YearSelect value={yearId} onChange={setYearId} />
          </div>
          {canManage && year && (
            <Button variant="secondary" onClick={() => setSessionClasses(true)}>
              Classes in {year.name}
            </Button>
          )}
          {year && <span className="text-xs text-on-surface-variant/70">{all.filter((c) => c.inYear).length} classes run in {year.name}</span>}
          {year && !open && <FormAlert tone="info">{year.name} is closed: its sections can be seen but not changed.</FormAlert>}
          {years.data && !years.data.length && (
            <FormAlert tone="info">
              Add an academic year first, under <Link href="/academic/years" className="font-bold underline">Academic Years</Link>.
            </FormAlert>
          )}
        </Card>

        {classes.isError && <FormAlert>{errorMessage(classes.error)}</FormAlert>}
        {canManage && showOthers && list.length > 1 && <OrderHint>Use ↑ ↓ to set the order classes appear in lists, forms and reports.</OrderHint>}
        <Card padding="none" className="overflow-hidden">
          {list.map((c, i) => (
            <div key={c.id} className={cn("flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-t first:border-t-0 border-outline-variant/10", c.inYear === null && "bg-surface-container-low/50")}>
              <div className="flex items-center gap-3 md:w-80 shrink-0">
                {canManage && showOthers && <MoveButtons label={c.name} position={i + 1} first={i === 0} last={i === list.length - 1} disabled={moving} onMove={(d) => moveClass(c.id, d)} />}
                <button type="button" disabled={!canManage} onClick={() => setEditingClass(c)} className="text-left disabled:cursor-default">
                  <p className={cn("font-bold", c.isActive ? "text-primary" : "text-on-surface-variant line-through")}>{c.name}</p>
                  <p className="text-xs text-on-surface-variant/70 space-x-2">
                    {c.group && <span>{c.group.name}</span>}
                    {c.hasStreams && <span>· Streams</span>}
                    {!c.isActive && <span>· Stopped</span>}
                    {c.isActive && c.inYear === null && year && <span className="font-semibold text-amber-700">· Not in {year.name}</span>}
                  </p>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!canManage || !open}
                    onClick={() => setEditingSection({ cls: c, section: s })}
                    title={[s.classTeacher ? `Class teacher: ${s.classTeacher.name}` : "No class teacher yet", s.room ? `Room ${s.room}` : null, s.capacity ? `Capacity ${s.capacity}` : null].filter(Boolean).join(" · ")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm border text-left disabled:cursor-default",
                      s.isActive ? "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high" : "border-dashed border-outline-variant/40 text-on-surface-variant/60"
                    )}
                  >
                    <span className="font-bold text-primary">{s.name}</span>
                    {s.stream && <span className="text-on-surface-variant"> · {s.stream.name}</span>}
                    <span className="block text-[11px] text-on-surface-variant/70">{s.classTeacher?.name ?? "No class teacher"}</span>
                  </button>
                ))}
                {!c.sections.length && c.inYear !== null && <span className="text-sm text-on-surface-variant/60">No sections this year</span>}
                {canManage && open && c.isActive && c.inYear === null && (
                  <button type="button" onClick={() => addToSession(c)} className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface-container-low">
                    Add to this session
                  </button>
                )}
                {canManage && open && c.isActive && c.inYear !== null && (
                  <button type="button" onClick={() => setEditingSection({ cls: c, section: null })} className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface-container-low">
                    + Section
                  </button>
                )}
              </div>
            </div>
          ))}
          {classes.data && !list.length && <p className="px-5 py-12 text-center text-on-surface-variant/70">No classes yet.</p>}
          {classes.isLoading && <div className="px-5 py-6"><PageLoader compact /></div>}
        </Card>
        {year && (others.length > 0 || showOthers) && (
          <button type="button" onClick={() => setShowOthers((x) => !x)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            {showOthers ? `Show only the classes of ${year.name}` : `${others.length} class${others.length === 1 ? "" : "es"} not in ${year.name} (show, to add one or change the order)`}
          </button>
        )}
        {list.length > 0 && (
          <p className="text-xs text-on-surface-variant/60">
            {list.reduce((n, c) => n + c.sections.length, 0)} sections in {year?.name}. Click a class to rename it, a section to set its stream, room or class teacher.
          </p>
        )}
      </div>

      {sessionClasses && yearId && (
        <SessionClasses
          yearId={yearId}
          onClose={() => {
            setSessionClasses(false);
            refresh();
          }}
        />
      )}
      {editingClass && <ClassDialog cls={editingClass === "new" ? null : editingClass} onClose={() => setEditingClass(null)} onSaved={saved} />}
      {editingSection && yearId && <SectionDialog cls={editingSection.cls} yearId={yearId} section={editingSection.section} onClose={() => setEditingSection(null)} onSaved={saved} />}
    </>
  );
}

export default function ClassesPage() {
  return (
    <RequirePermission permission="academic.view">
      <Classes />
    </RequirePermission>
  );
}
