"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi } from "@/lib/api/academic";
import { staffApi } from "@/lib/api/staff";
import { Entry, timetableApi } from "@/lib/api/timetable";
import { errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";
import { useConfirm } from "@/components/ui/ConfirmProvider";

const STATUS = { draft: { label: "Draft", tone: "warning" as const }, published: { label: "Published", tone: "success" as const }, archived: { label: "Old", tone: "neutral" as const } };

function CellEditor({ timetableId, sectionId, pos, cell, onDone }: { timetableId: string; sectionId: string; pos: { weekday: number; periodNo: number }; cell: Entry[]; onDone: () => void }) {
  const { showToast } = useToast();
  const subjects = useQuery({ queryKey: ["academic-subject-options"], queryFn: academicApi.subjectOptions });
  const staff = useQuery({ queryKey: ["staff-options-teaching"], queryFn: () => staffApi.options(true) });
  const free = useQuery({ queryKey: ["tt-free", timetableId, pos.weekday, pos.periodNo], queryFn: () => timetableApi.free(timetableId, pos.weekday, pos.periodNo) });
  const [rows, setRows] = useState(cell.length ? cell.map((e) => ({ subjectId: e.subject.id, staffId: e.staff?.id ?? "", roomId: e.room?.id ?? "" })) : [{ subjectId: "", staffId: "", roomId: "" }]);
  const [locked, setLocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const save = async (lessons: typeof rows) => {
    setBusy(true);
    try {
      await timetableApi.setCell(timetableId, { sectionId, ...pos, lessons: lessons.filter((r) => r.subjectId).map((r) => ({ subjectId: r.subjectId, staffId: r.staffId || null, roomId: r.roomId || null })), locked });
      showToast("Saved", "success");
      onDone();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const freeIds = new Set((free.data ?? []).map((f) => f.id));
  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end rounded-xl border border-outline-variant/20 p-3">
          <Select label="Subject" value={r.subjectId} onChange={(v) => setRows(rows.map((x, k) => (k === i ? { ...x, subjectId: v } : x)))} options={[{ value: "", label: "Choose…" }, ...(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
          <Select
            label="Teacher"
            value={r.staffId}
            onChange={(v) => setRows(rows.map((x, k) => (k === i ? { ...x, staffId: v } : x)))}
            options={[{ value: "", label: "No teacher" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.name}${freeIds.has(s.id) ? " · free" : r.staffId === s.id ? "" : " · busy"}` }))]}
          />
          <MasterSelect master="room" label="Room / lab" value={r.roomId} onChange={(v) => setRows(rows.map((x, k) => (k === i ? { ...x, roomId: v } : x)))} placeholder="Class room" />
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { subjectId: "", staffId: "", roomId: "" }])} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
        + Another subject at the same time (optional subjects)
      </button>
      <Checkbox label="Lock it (kept when the timetable is generated again)" checked={locked} onChange={setLocked} />
      {free.data && (
        <p className="text-xs text-on-surface-variant">
          Free in this period: {free.data.slice(0, 12).map((f) => `${f.name} (${f.periodsThatDay})`).join(", ")}
          {free.data.length > 12 ? "…" : ""}
        </p>
      )}
      <div className="flex justify-between gap-3">
        <Button variant="secondary" disabled={busy || !cell.length} onClick={() => save([])}>
          Make it a free period
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button disabled={busy || !rows.some((r) => r.subjectId)} onClick={() => save(rows)}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Timetables() {
  const { can } = useAuth();
  const manage = can("timetable.manage");
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [year, setYear] = useState("");
  const [ttId, setTtId] = useState("");
  const [tab, setTab] = useState<"section" | "teacher">("section");
  const [sectionId, setSectionId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ pos: { weekday: number; periodNo: number }; cell: Entry[] } | null>(null);
  const [freeAt, setFreeAt] = useState<{ weekday: number; periodNo: number } | null>(null);
  const [newName, setNewName] = useState("");

  const list = useQuery({ queryKey: ["timetables", year], queryFn: () => timetableApi.list(year), enabled: !!year });
  useEffect(() => {
    if (!list.data) return;
    if (!ttId || !list.data.some((t) => t.id === ttId)) setTtId((list.data.find((t) => t.status === "published") ?? list.data[0])?.id ?? "");
  }, [list.data, ttId]);
  const overview = useQuery({ queryKey: ["timetable", ttId], queryFn: () => timetableApi.overview(ttId), enabled: !!ttId });
  const o = overview.data;
  useEffect(() => {
    if (o && !sectionId && o.sections.length) setSectionId(o.sections[0].id);
    if (o && !teacherId && o.teachers.length) setTeacherId(o.teachers[0].id);
  }, [o, sectionId, teacherId]);
  const of = tab === "section" ? { section: sectionId } : { teacher: teacherId };
  const grid = useQuery({ queryKey: ["timetable-grid", ttId, of], queryFn: () => timetableApi.grid(ttId, of), enabled: !!ttId && !!(of.section || of.teacher) });
  const free = useQuery({ queryKey: ["tt-free", ttId, freeAt?.weekday, freeAt?.periodNo], queryFn: () => timetableApi.free(ttId, freeAt!.weekday, freeAt!.periodNo), enabled: !!freeAt });
  const draft = o?.status === "draft";
  const today = ((new Date().getDay() + 6) % 7) + 1;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["timetables", year] });
    await queryClient.invalidateQueries({ queryKey: ["timetable"] });
    await queryClient.invalidateQueries({ queryKey: ["timetable-grid"] });
  };
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };

  const generate = (into?: string) =>
    run("generate", async () => {
      const r = await timetableApi.generate(year, { ...(into ? { timetableId: into } : {}), ...(newName.trim() ? { name: newName.trim() } : {}) });
      setTtId(r.timetableId);
      setNewName("");
      showToast(`Placed ${r.placed} of ${r.wanted} periods in ${r.seconds}s${r.noTeacher ? ` · ${r.noTeacher} subject(s) have no teacher assigned` : ""}`, r.placed === r.wanted ? "success" : "warning");
    });

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Every class's and teacher's week. Generate a draft from Timetable Setup and the subject teachers, adjust it, then publish it for everyone."
        actions={
          manage ? (
            <Link href="/timetable/setup" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
              Timetable setup
            </Link>
          ) : undefined
        }
      />
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <YearSelect value={year} onChange={(v) => { setYear(v); setTtId(""); }} />
          <Select
            label="Timetable"
            value={ttId}
            onChange={setTtId}
            disabled={!list.data?.length}
            options={list.data?.length ? list.data.map((t) => ({ value: t.id, label: `${t.name} · ${STATUS[t.status].label}` })) : [{ value: "", label: "None yet" }]}
          />
          {manage && (
            <>
              <Input label="New draft's name" placeholder="e.g. Winter timetable" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} />
              <Button disabled={!!busy || !year} onClick={() => generate()}>
                {busy === "generate" ? "Generating…" : "Generate a new draft"}
              </Button>
            </>
          )}
        </div>
        {o && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-outline-variant/20">
            <Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>
            <span className="text-xs text-on-surface-variant">
              {o.publishedAt ? `Published ${new Date(o.publishedAt).toLocaleString("en-IN")}` : o.generatedAt ? `Generated ${new Date(o.generatedAt).toLocaleString("en-IN")}` : ""}
            </span>
            {manage && (
              <div className="ml-auto flex flex-wrap gap-2">
                {draft && (
                  <Button variant="secondary" disabled={!!busy} onClick={async () => (await confirm({ title: "Generate this draft again?", message: "Locked periods stay where they are; all the others are placed again.", confirmLabel: "Generate again" })) && generate(o.id)}>
                    Generate again
                  </Button>
                )}
                {draft && (
                  <Button disabled={!!busy} onClick={async () => (await confirm({ title: `Publish "${o.name}"?`, message: "Everyone sees it straight away; the timetable published now becomes old.", confirmLabel: "Publish" })) && run("publish", async () => { await timetableApi.publish(o.id); showToast("Published", "success"); })}>
                    Publish
                  </Button>
                )}
                {!draft && (
                  <Button variant="secondary" disabled={!!busy} onClick={() => run("copy", async () => { const c = await timetableApi.copy(o.id); setTtId(c.id); showToast("A draft copy to change", "success"); })}>
                    Copy into a draft to change
                  </Button>
                )}
                {o.status !== "published" && (
                  <Button variant="secondary" disabled={!!busy} onClick={async () => (await confirm({ title: `Delete "${o.name}"?`, message: "This timetable and all its periods are deleted.", confirmLabel: "Delete", danger: true })) && run("delete", async () => { await timetableApi.remove(o.id); setTtId(""); })}>
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {list.data && !list.data.length && <FormAlert tone="info">No timetable for this year yet. {manage ? "Check Timetable Setup, then click Generate a new draft." : "The school has not published one."}</FormAlert>}
      {o && o.unplaced.length > 0 && (
        <FormAlert tone="warning">
          <p className="font-bold">{o.unplaced.reduce((a, u) => a + u.missing, 0)} period(s) could not be placed:</p>
          <ul className="mt-1 space-y-0.5 font-normal">
            {o.unplaced.slice(0, 10).map((u, i) => (
              <li key={i}>
                {u.section} · {u.subjects}: {u.missing} short ({u.reason})
              </li>
            ))}
          </ul>
          <p className="mt-1 font-normal">Fix in Timetable Setup (fewer periods, a teacher&apos;s limit, another room) or place them by hand, then generate again.</p>
        </FormAlert>
      )}

      {o && (
        <Card>
          <Tabs tabs={[{ id: "section", label: "Class" }, { id: "teacher", label: "Teacher" }]} activeTab={tab} onChange={(t) => setTab(t as "section" | "teacher")} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 items-end">
            {tab === "section" ? (
              <Select label="Section" value={sectionId} onChange={setSectionId} options={o.sections.map((s) => ({ value: s.id, label: `${s.label} (${s.periods} periods)` }))} />
            ) : (
              <Select label="Teacher" value={teacherId} onChange={setTeacherId} options={o.teachers.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))} />
            )}
            <p className="md:col-span-2 text-xs text-on-surface-variant/70">
              {draft && manage && tab === "section" ? "Click a period to change it; drag one onto another to swap them." : "Click a period to see which teachers are free then."}
            </p>
          </div>
          {grid.isFetching && !grid.data && <p className="text-sm text-on-surface-variant py-6">Loading the week…</p>}
          {grid.isError && <FormAlert>{errorMessage(grid.error)}</FormAlert>}
          {grid.data && (
            <TimetableGrid
              days={grid.data.days}
              entries={grid.data.entries}
              view={tab}
              today={today}
              editable={draft && manage && tab === "section"}
              onSwap={(a, b) =>
                run("swap", async () => {
                  await timetableApi.swap(o.id, { sectionId, a, b });
                })
              }
              onCellClick={(pos, cell) => (draft && manage && tab === "section" ? setEditing({ pos, cell }) : setFreeAt(pos))}
            />
          )}
        </Card>
      )}

      {editing && o && (
        <Modal isOpen onClose={() => setEditing(null)} title={`${o.days.find((d) => d.weekday === editing.pos.weekday)?.name}, period ${editing.pos.periodNo}`} width="max-w-3xl">
          <CellEditor
            timetableId={o.id}
            sectionId={sectionId}
            pos={editing.pos}
            cell={editing.cell}
            onDone={async () => {
              setEditing(null);
              await refresh();
            }}
          />
        </Modal>
      )}
      {freeAt && o && (
        <Modal isOpen onClose={() => setFreeAt(null)} title={`Free teachers: ${o.days.find((d) => d.weekday === freeAt.weekday)?.name}, period ${freeAt.periodNo}`}>
          {free.data ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {free.data.map((f) => (
                    <tr key={f.id} className="border-t border-outline-variant/10">
                      <td className="py-1.5 font-semibold">{f.name}</td>
                      <td className="py-1.5 text-xs text-on-surface-variant">{f.designation}</td>
                      <td className="py-1.5 text-right text-xs">{f.periodsThatDay} periods that day</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            <PageLoader />
          )}
        </Modal>
      )}
    </>
  );
}

export default function TimetablePage() {
  return (
    <RequirePermission permission="timetable.view">
      <Timetables />
    </RequirePermission>
  );
}
