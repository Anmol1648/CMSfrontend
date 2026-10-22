"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { attendanceApi, leaveApi, showDay, Slot, statusTone, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Mark() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sections = useQuery({ queryKey: ["attendance-sections"], queryFn: attendanceApi.sections });
  const [section, setSection] = useState(params.get("section") ?? "");
  const [date, setDate] = useState(params.get("date") ?? todayIST());
  const [slot, setSlot] = useState<Slot | undefined>((params.get("slot") as Slot) ?? undefined);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!section && sections.data?.length) setSection(sections.data[0].id);
  }, [section, sections.data]);

  const lessons = useQuery({ queryKey: ["attendance-lessons", date], queryFn: () => leaveApi.lessons(date) });
  const register = useQuery({ queryKey: ["attendance-register", section, date, slot ?? ""], queryFn: () => attendanceApi.register(section, date, slot), enabled: !!section && !!date });
  const r = register.data;

  // Start from what is saved, or everyone at the default status.
  useEffect(() => {
    if (!r) return;
    setMarks(Object.fromEntries(r.students.map((s) => [s.id, s.statusId ?? s.leave?.statusId ?? r.defaultStatusId ?? ""])));
    setNotes(Object.fromEntries(r.students.map((s) => [s.id, s.note ?? ""])));
    if (!slot) setSlot(r.slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const v of Object.values(marks)) c.set(v, (c.get(v) ?? 0) + 1);
    return c;
  }, [marks]);
  const dirty = !!r && r.students.some((s) => (s.statusId ?? s.leave?.statusId ?? r.defaultStatusId) !== marks[s.id] || (s.note ?? "") !== (notes[s.id] ?? "") || !s.statusId);

  const go = (next: { section?: string; date?: string; slot?: Slot }) => {
    const q = new URLSearchParams({ section: next.section ?? section, date: next.date ?? date, ...((next.slot ?? slot) ? { slot: (next.slot ?? slot)! } : {}) });
    router.replace(`/attendance/mark?${q}`);
  };

  const save = async () => {
    if (!r) return;
    setSaving(true);
    try {
      const saved = await attendanceApi.save({ section, date, slot: r.slot, marks: r.students.map((s) => ({ studentId: s.id, statusId: marks[s.id], ...(notes[s.id] ? { note: notes[s.id] } : {}) })) });
      queryClient.setQueryData(["attendance-register", section, date, slot ?? ""], saved);
      const absent = saved.students.filter((s) => saved.statuses.find((x) => x.id === s.statusId)?.present === 0).length;
      showToast(`Attendance saved · ${saved.students.length - absent} present, ${absent} not`, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (sections.isError) return <FormAlert>{errorMessage(sections.error)}</FormAlert>;
  if (!sections.data) return <PageLoader />;
  if (!sections.data.length && !lessons.data?.lessons.length)
    return (
      <>
        <PageHeader title="Mark attendance" description="The register of your section." />
        <Card>
          <p className="text-sm text-on-surface-variant">You are not the class teacher of any section in this session, so there is no register for you to mark. The class teacher is set in Academic → Classes &amp; Sections.</p>
        </Card>
      </>
    );

  return (
    <>
      <PageHeader title="Mark attendance" description="Everyone starts as present: tap the students who are not, then Save." />
      {lessons.data && lessons.data.mode === "period" && lessons.data.lessons.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70 mb-3">Your lessons · {showDay(lessons.data.date)}</h3>
          <div className="flex flex-wrap gap-2">
            {lessons.data.lessons.map((l) => {
              const open = l.sectionId === section && l.slot === (slot ?? r?.slot);
              return (
                <button
                  key={`${l.sectionId}-${l.slot}`}
                  type="button"
                  onClick={() => {
                    setSection(l.sectionId);
                    setSlot(l.slot);
                    go({ section: l.sectionId, slot: l.slot });
                  }}
                  className={cn("rounded-xl border px-3 py-2 text-left text-xs transition-all", open ? "border-primary ring-2 ring-primary/20" : "border-outline-variant/30 hover:bg-surface-container-low")}
                >
                  <span className="font-black text-primary">{l.label}</span>
                  {l.time && <span className="text-on-surface-variant"> · {l.time}</span>}
                  <span className="block font-semibold">
                    {l.section} · {l.subject}
                    {l.substitute && <span className="ml-1 text-amber-700">(substitute)</span>}
                  </span>
                  <span className={cn("block font-bold mt-0.5", l.marked ? "text-emerald-700" : "text-amber-700")}>{l.marked ? "Marked ✓" : "Not marked"}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Section"
            value={section}
            onChange={(v) => {
              setSection(v);
              go({ section: v });
            }}
            options={(sections.data.length ? sections.data : []).map((s) => ({ value: s.id, label: `${s.label}${s.mine ? " (your class)" : ""}` }))}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => {
              if (!e.target.value) return;
              setDate(e.target.value);
              go({ date: e.target.value });
            }}
          />
          {r && r.slots.length > 1 && (
            <Select
              label={r.period ? "Period" : "Part of the day"}
              value={slot ?? r.slot}
              onChange={(v) => {
                setSlot(v as Slot);
                go({ slot: v as Slot });
              }}
              options={r.slots.map((s) => ({ value: s.value, label: s.label }))}
            />
          )}
        </div>
      </Card>

      {register.isError && <FormAlert>{errorMessage(register.error)}</FormAlert>}
      {!r && !register.isError && <PageLoader label="Opening the register…" />}
      {r && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
            <div>
              <h3 className="font-black text-primary">
                {r.section.label} · {showDay(r.date)}
                {r.slots.length > 1 && !r.period ? ` · ${r.slots.find((s) => s.value === r.slot)?.label}` : ""}
                {r.period ? ` · ${r.period.label.split(" · ")[0]}` : ""}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {r.period ? `${r.period.subject}${r.period.time ? ` · ${r.period.time}` : ""}${r.period.teacher ? ` · ${r.period.teacher}` : ""} · ` : r.section.classTeacher ? `Class teacher: ${r.section.classTeacher} · ` : ""}
                {r.marked
                  ? `Marked by ${r.marked.by ?? "—"} at ${time(r.marked.at)}${r.marked.changedBy ? ` · changed by ${r.marked.changedBy}` : ""}`
                  : "Not marked yet"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {r.statuses
                .filter((s) => counts.get(s.id))
                .map((s) => (
                  <span key={s.id} className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusTone(s.code))}>
                    {s.name}: {counts.get(s.id)}
                  </span>
                ))}
            </div>
          </div>

          {r.dayOff && (
            <div className="p-5">
              <FormAlert tone="info">Not a school day: {r.dayOff}.</FormAlert>
            </div>
          )}
          {!r.dayOff && !r.editable && r.reason && (
            <div className="px-5 pt-4">
              <FormAlert tone="warning">{r.reason}</FormAlert>
            </div>
          )}
          {!r.dayOff && !r.students.length && <p className="px-5 py-12 text-center text-sm text-on-surface-variant/70">No students are enrolled in this section yet.</p>}

          {!r.dayOff && r.students.length > 0 && (
            <>
              {r.editable && (
                <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-outline-variant/10 bg-surface-container-low/40">
                  <span className="text-xs text-on-surface-variant mr-2">Mark everyone:</span>
                  {r.statuses.slice(0, 3).map((s) => (
                    <button key={s.id} type="button" onClick={() => setMarks(Object.fromEntries(r.students.map((x) => [x.id, s.id])))} className={cn("rounded-lg border px-3 py-1.5 text-xs font-bold", statusTone(s.code))}>
                      All {s.name.toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
              <ul className="divide-y divide-outline-variant/10">
                {r.students.map((s) => (
                  <li key={s.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-8 text-right text-sm font-bold tabular-nums text-on-surface-variant/70">{s.roll ?? "–"}</span>
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-semibold text-sm">
                          {s.name}
                          {s.leave && (
                            <span title={s.leave.reason} className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
                              {s.leave.kind === "medical" ? "Medical leave" : "On leave"} (approved)
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-on-surface-variant/70">{s.admissionNo}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Status of ${s.name}`}>
                        {r.statuses.map((st) => {
                          const on = marks[s.id] === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              title={st.name}
                              disabled={!r.editable}
                              onClick={() => setMarks((m) => ({ ...m, [s.id]: st.id }))}
                              className={cn(
                                "min-w-[44px] h-10 rounded-xl border px-2.5 text-xs font-black transition-all disabled:cursor-not-allowed",
                                on ? cn(statusTone(st.code), "ring-2 ring-offset-1 ring-primary/30 scale-105") : "border-outline-variant/30 text-on-surface-variant/70 hover:bg-surface-container-low"
                              )}
                            >
                              {st.code}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          aria-label={`Note for ${s.name}`}
                          title="Add a note"
                          disabled={!r.editable && !notes[s.id]}
                          onClick={() => setNoteOpen(noteOpen === s.id ? null : s.id)}
                          className={cn("w-10 h-10 rounded-xl text-on-surface-variant hover:bg-surface-container-high", notes[s.id] && "text-primary")}
                        >
                          <span className="material-symbols-outlined text-lg">{notes[s.id] ? "sticky_note_2" : "note_add"}</span>
                        </button>
                      </div>
                    </div>
                    {noteOpen === s.id && (
                      <div className="mt-2 ml-11">
                        <Input value={notes[s.id] ?? ""} disabled={!r.editable} onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))} placeholder="e.g. Fever, informed by parent" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-outline-variant/20 bg-surface-container-low/40">
                <p className="text-xs text-on-surface-variant">
                  {r.statuses.map((s) => `${s.code} = ${s.name}`).join(" · ")}
                </p>
                {r.editable && (
                  <Button onClick={save} disabled={saving || (!!r.marked && !dirty)}>
                    {saving ? "Saving…" : r.marked ? "Save changes" : "Save attendance"}
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}

export default function MarkAttendancePage() {
  return (
    <RequirePermission permission="attendance.mark">
      <Suspense>
        <Mark />
      </Suspense>
    </RequirePermission>
  );
}
