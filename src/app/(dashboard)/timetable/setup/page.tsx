"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { LoadRow, Schedule, Slot, TeacherLoad, timetableApi } from "@/lib/api/timetable";
import { ApiError, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/ConfirmProvider";

type SlotInput = Omit<Slot, "periodNo">;

// ─── Bell schedules ──────────────────────────────────────────────────────────

function ScheduleEditor({ year, initial, onDone }: { year: string; initial: Schedule | null; onDone: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [slots, setSlots] = useState<SlotInput[]>(initial?.slots.map(({ kind, label, startTime, endTime }) => ({ kind, label, startTime, endTime })) ?? [{ kind: "period", label: "", startTime: "08:00", endTime: "08:40" }]);
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<SlotInput>) => setSlots(slots.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const addAfter = (kind: SlotInput["kind"]) => {
    const last = slots[slots.length - 1];
    const [h, m] = (last?.endTime ?? "08:00").split(":").map(Number);
    const mins = kind === "break" ? 20 : 40;
    const end = new Date(Date.UTC(2000, 0, 1, h, m + mins));
    setSlots([...slots, { kind, label: kind === "break" ? "Break" : "", startTime: last?.endTime ?? "08:00", endTime: `${String(end.getUTCHours()).padStart(2, "0")}:${String(end.getUTCMinutes()).padStart(2, "0")}` }]);
  };
  let n = 0;
  const save = async () => {
    setBusy(true);
    try {
      const input = { name: name.trim(), slots: slots.map((s) => ({ ...s, label: s.label?.trim() || "" })) };
      if (initial) await timetableApi.saveSchedule(initial.id, input);
      else await timetableApi.addSchedule(year, input);
      showToast("Schedule saved", "success");
      onDone();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <Input label="Name *" placeholder="e.g. Regular, Winter, Short Saturday" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
            <th className="py-2">#</th>
            <th className="py-2">Kind</th>
            <th className="py-2">Label</th>
            <th className="py-2">Starts</th>
            <th className="py-2">Ends</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {slots.map((s, i) => (
            <tr key={i} className="border-t border-outline-variant/10">
              <td className="py-1.5 text-xs font-bold">{s.kind === "period" ? `P${++n}` : ""}</td>
              <td className="py-1.5 pr-2 w-32">
                <Select value={s.kind} onChange={(v) => set(i, { kind: v as SlotInput["kind"] })} options={[{ value: "period", label: "Period" }, { value: "break", label: "Break" }]} />
              </td>
              <td className="py-1.5 pr-2">
                <Input value={s.label ?? ""} placeholder={s.kind === "period" ? "Period" : "Break / Lunch / Assembly"} onChange={(e) => set(i, { label: e.target.value })} maxLength={40} />
              </td>
              <td className="py-1.5 pr-2 w-32">
                <Input type="time" value={s.startTime} onChange={(e) => set(i, { startTime: e.target.value })} />
              </td>
              <td className="py-1.5 pr-2 w-32">
                <Input type="time" value={s.endTime} onChange={(e) => set(i, { endTime: e.target.value })} />
              </td>
              <td className="py-1.5 text-right">
                <button type="button" onClick={() => setSlots(slots.filter((_, k) => k !== i))} className="text-xs font-bold uppercase text-error/70 hover:text-error">
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => addAfter("period")}>
          + Period
        </Button>
        <Button variant="secondary" onClick={() => addAfter("break")}>
          + Break
        </Button>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button disabled={busy || !name.trim() || !slots.some((s) => s.kind === "period")} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Schedules({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const schedules = useQuery({ queryKey: ["tt-schedules", year], queryFn: () => timetableApi.schedules(year) });
  const days = useQuery({ queryKey: ["tt-days", year], queryFn: () => timetableApi.days(year) });
  const [editing, setEditing] = useState<Schedule | "new" | null>(null);
  const [dayValues, setDayValues] = useState<Record<number, string>>({});
  useEffect(() => {
    if (days.data) setDayValues(Object.fromEntries(days.data.map((d) => [d.weekday, d.scheduleId ?? ""])));
  }, [days.data]);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tt-schedules", year] });
    queryClient.invalidateQueries({ queryKey: ["tt-days", year] });
  };
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">Bell schedules</h3>
          <Button variant="secondary" onClick={() => setEditing("new")}>
            Add schedule
          </Button>
        </div>
        <div className="space-y-4">
          {(schedules.data ?? []).map((s) => (
            <div key={s.id} className="rounded-xl border border-outline-variant/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-primary">
                  {s.name} <span className="text-xs font-normal text-on-surface-variant">· {s.periods} periods</span>
                </p>
                <div className="space-x-4">
                  <button type="button" onClick={() => setEditing(s)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await confirm({ title: `Remove the ${s.name} schedule?`, confirmLabel: "Remove", danger: true }))) return;
                      try {
                        await timetableApi.deleteSchedule(s.id);
                        refresh();
                      } catch (err) {
                        showToast(errorMessage(err), "error");
                      }
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.slots.map((x, i) => (
                  <span key={i} className={cn("rounded-md px-2 py-1 text-[11px]", x.kind === "break" ? "bg-amber-50 text-amber-800" : "bg-surface-container-low text-primary")}>
                    <b>{x.kind === "period" ? `P${x.periodNo}` : x.label}</b> {x.startTime}–{x.endTime}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {schedules.data && !schedules.data.length && <p className="text-sm text-on-surface-variant/70">No schedule yet.</p>}
        </div>
      </Card>
      <Card>
        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">School days</h3>
        <div className="space-y-3">
          {(days.data ?? []).map((d) => (
            <div key={d.weekday} className="grid grid-cols-3 items-center gap-3">
              <span className="font-semibold">{d.name}</span>
              <div className="col-span-2">
                <Select
                  value={dayValues[d.weekday] ?? ""}
                  onChange={(v) => setDayValues({ ...dayValues, [d.weekday]: v })}
                  options={[{ value: "", label: "Holiday (no school)" }, ...(schedules.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button
            onClick={async () => {
              try {
                await timetableApi.saveDays(year, Object.entries(dayValues).map(([w, s]) => ({ weekday: Number(w), scheduleId: s || null })));
                showToast("School days saved", "success");
                refresh();
              } catch (err) {
                showToast(errorMessage(err), "error");
              }
            }}
          >
            Save days
          </Button>
        </div>
        <p className="text-xs text-on-surface-variant/60 mt-3">Give Saturday its own schedule for a short day.</p>
      </Card>
      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={editing === "new" ? "Add bell schedule" : `Edit ${editing.name}`} width="max-w-3xl">
          <ScheduleEditor
            year={year}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Periods per class ───────────────────────────────────────────────────────

function Loads({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const overview = useQuery({ queryKey: ["tt-loads", year], queryFn: () => timetableApi.loadOverview(year) });
  const [classId, setClassId] = useState("");
  useEffect(() => {
    if (!classId && overview.data?.classes.length) setClassId(overview.data.classes[0].id);
  }, [overview.data, classId]);
  const loads = useQuery({ queryKey: ["tt-loads", year, classId], queryFn: () => timetableApi.loads(year, classId), enabled: !!classId });
  const [rows, setRows] = useState<LoadRow[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loads.data) setRows(loads.data.rows);
  }, [loads.data]);
  const set = (i: number, patch: Partial<LoadRow>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  // Per stream: common subjects + that stream's, a parallel group counted once.
  const totals = useMemo(() => {
    const streams = Array.from(new Set(rows.filter((r) => r.stream).map((r) => r.stream!.name)));
    const count = (list: LoadRow[]) => {
      const seen = new Set<string>();
      let n = 0;
      for (const r of list) {
        const g = r.parallelGroup?.trim().toLowerCase();
        if (g) {
          if (seen.has(`${r.stream?.id ?? ""}|${g}`)) continue;
          seen.add(`${r.stream?.id ?? ""}|${g}`);
        }
        n += r.perWeek || 0;
      }
      return n;
    };
    const common = rows.filter((r) => !r.stream);
    return streams.length ? streams.map((s) => ({ name: s, n: count([...common, ...rows.filter((r) => r.stream?.name === s)]) })) : [{ name: "", n: count(rows) }];
  }, [rows]);
  const week = loads.data?.periodsInWeek ?? 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <Card padding="none" className="overflow-hidden h-fit">
        <table className="w-full text-sm">
          <tbody>
            {(overview.data?.classes ?? []).map((c) => (
              <tr key={c.id} onClick={() => setClassId(c.id)} className={cn("border-t border-outline-variant/10 cursor-pointer", c.id === classId ? "bg-primary/5" : "hover:bg-surface-container-low/60")}>
                <td className="px-4 py-2.5 font-semibold">{c.name}</td>
                <td className={cn("px-4 py-2.5 text-right text-xs", c.periods > (overview.data?.periodsInWeek ?? 0) ? "text-error font-bold" : "")}>
                  {c.periods ? `${c.periods} / ${overview.data?.periodsInWeek}` : <span className="text-on-surface-variant/50">not set</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="xl:col-span-3">
        {loads.data && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-black text-primary">{loads.data.class.name}</h3>
              <div className="flex flex-wrap items-center gap-3">
                {totals.map((t) => (
                  <Pill key={t.name} tone={t.n > week ? "danger" : t.n === week ? "success" : "neutral"}>
                    {t.name ? `${t.name}: ` : ""}
                    {t.n} of {week} periods
                  </Pill>
                ))}
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setErrors(null);
                    try {
                      await timetableApi.saveLoads(year, classId, rows.map((r) => ({ subjectId: r.subject.id, streamId: r.stream?.id ?? null, perWeek: r.perWeek || 0, doubles: r.doubles || 0, parallelGroup: r.parallelGroup?.trim() || null, roomId: r.roomId || null })));
                      showToast("Periods saved", "success");
                      queryClient.invalidateQueries({ queryKey: ["tt-loads", year] });
                    } catch (err) {
                      setErrors(errorMessage(err));
                      if (err instanceof ApiError) showToast(err.message, "error");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
            {errors && <FormAlert>{errors}</FormAlert>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                    <th className="py-2">Subject</th>
                    <th className="py-2 w-24">Periods / week</th>
                    <th className="py-2 w-24">Of them double</th>
                    <th className="py-2 w-40">Same time as (group)</th>
                    <th className="py-2 w-56">Room / lab</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.subject.id}-${r.stream?.id ?? ""}`} className="border-t border-outline-variant/10">
                      <td className="py-1.5 pr-3">
                        <p className="font-semibold">{r.subject.name}</p>
                        <p className="text-[10px] text-on-surface-variant/60">
                          {r.stream ? r.stream.name : "All"}
                          {r.isOptional ? " · optional" : ""}
                        </p>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input type="number" min={0} max={60} value={String(r.perWeek)} onChange={(e) => set(i, { perWeek: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input type="number" min={0} max={Math.floor(r.perWeek / 2)} value={String(r.doubles)} onChange={(e) => set(i, { doubles: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input placeholder={r.isOptional ? "e.g. Second language" : ""} value={r.parallelGroup ?? ""} onChange={(e) => set(i, { parallelGroup: e.target.value })} maxLength={30} />
                      </td>
                      <td className="py-1.5">
                        <MasterSelect master="room" value={r.roomId ?? ""} onChange={(v) => set(i, { roomId: v || null })} placeholder="Class room" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-on-surface-variant/60 mt-3">
              Subjects with the same group name run in the same periods (e.g. Hindi and Sanskrit as &quot;Second language&quot;), so they need the same periods and doubles. A room here is used for every period of the subject; leave it
              empty for subjects taught in the class&apos;s own room. Subjects come from Academic → Subjects; teachers from Staff → Subject Teachers.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Teachers ────────────────────────────────────────────────────────────────

function Teachers({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const data = useQuery({ queryKey: ["tt-teachers", year], queryFn: () => timetableApi.teachers(year) });
  const week = useQuery({ queryKey: ["tt-week", year], queryFn: () => timetableApi.week(year) });
  const [editing, setEditing] = useState<TeacherLoad | null>(null);
  const [form, setForm] = useState<{ maxPerDay: string; maxPerWeek: string; unavailable: Set<string> }>({ maxPerDay: "", maxPerWeek: "", unavailable: new Set() });
  const d = data.data;
  const open = (t: TeacherLoad) => {
    setEditing(t);
    setForm({ maxPerDay: t.maxPerDay == null ? "" : String(t.maxPerDay), maxPerWeek: t.maxPerWeek == null ? "" : String(t.maxPerWeek), unavailable: new Set(t.unavailable.map((u) => `${u.weekday}:${u.periodNo}`)) });
  };
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-5 border-b border-outline-variant/20 text-sm text-on-surface-variant">
        Periods each teacher needs, from Subject Teachers and the periods per class. The usual limit is {d?.defaults.maxPerDay} a day and {d?.defaults.maxPerWeek} a week (System Settings → Timetable); click a teacher to give their own limits or periods they can&apos;t take.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-3">Teacher</th>
              <th className="px-5 py-3 text-right">Periods needed</th>
              <th className="px-5 py-3 text-right">Limit / day</th>
              <th className="px-5 py-3 text-right">Limit / week</th>
              <th className="px-5 py-3">Not available</th>
            </tr>
          </thead>
          <tbody>
            {(d?.teachers ?? []).map((t) => {
              const maxWeek = t.maxPerWeek ?? d!.defaults.maxPerWeek;
              return (
                <tr key={t.id} onClick={() => open(t)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                  <td className="px-5 py-2.5">
                    <p className="font-semibold">
                      {t.name} {t.classTeacher && <span className="text-[10px] uppercase tracking-widest text-primary/70 ml-1">class teacher</span>}
                    </p>
                    <p className="text-xs text-on-surface-variant/70">
                      {t.code}
                      {t.designation ? ` · ${t.designation}` : ""}
                    </p>
                  </td>
                  <td className={cn("px-5 py-2.5 text-right font-bold", t.periodsNeeded > maxWeek && "text-error")}>{t.periodsNeeded}</td>
                  <td className="px-5 py-2.5 text-right">{t.maxPerDay ?? <span className="text-on-surface-variant/50">{d!.defaults.maxPerDay}</span>}</td>
                  <td className="px-5 py-2.5 text-right">{t.maxPerWeek ?? <span className="text-on-surface-variant/50">{d!.defaults.maxPerWeek}</span>}</td>
                  <td className="px-5 py-2.5 text-xs">{t.unavailable.length ? `${t.unavailable.length} period(s)` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={editing.name} width="max-w-3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label={`Most periods a day (empty = ${d?.defaults.maxPerDay})`} type="number" min={0} value={form.maxPerDay} onChange={(e) => setForm({ ...form, maxPerDay: e.target.value })} />
              <Input label={`Most periods a week (empty = ${d?.defaults.maxPerWeek})`} type="number" min={0} value={form.maxPerWeek} onChange={(e) => setForm({ ...form, maxPerWeek: e.target.value })} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Periods they can&apos;t take (click to mark)</p>
            <table className="text-xs border-separate border-spacing-1">
              <tbody>
                {(week.data ?? []).map((day) => (
                  <tr key={day.weekday}>
                    <th className="pr-2 text-left">{day.name.slice(0, 3)}</th>
                    {day.periods.map((p) => {
                      const k = `${day.weekday}:${p.periodNo}`;
                      const off = form.unavailable.has(k);
                      return (
                        <td key={k}>
                          <button
                            type="button"
                            onClick={() => {
                              const u = new Set(form.unavailable);
                              if (off) u.delete(k);
                              else u.add(k);
                              setForm({ ...form, unavailable: u });
                            }}
                            className={cn("w-9 h-8 rounded-md font-bold", off ? "bg-error text-white" : "bg-surface-container-low text-primary hover:bg-surface-container")}
                          >
                            P{p.periodNo}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))));
                    queryClient.setQueryData(
                      ["tt-teachers", year],
                      await timetableApi.saveTeacher(year, editing.id, {
                        maxPerDay: num(form.maxPerDay),
                        maxPerWeek: num(form.maxPerWeek),
                        unavailable: Array.from(form.unavailable).map((k) => ({ weekday: Number(k.split(":")[0]), periodNo: Number(k.split(":")[1]) })),
                      })
                    );
                    setEditing(null);
                    showToast("Saved", "success");
                  } catch (err) {
                    showToast(errorMessage(err), "error");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function Setup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [year, setYear] = useState("");
  const [tab, setTab] = useState("schedules");
  const schedules = useQuery({ queryKey: ["tt-schedules", year], queryFn: () => timetableApi.schedules(year), enabled: !!year });
  return (
    <>
      <PageHeader title="Timetable setup" description="The school week (bell schedules and days), how many periods each subject gets, and teachers' limits. Generate the timetable on the Timetable page." />
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="w-64">
          <YearSelect value={year} onChange={setYear} />
        </div>
        {schedules.data && !schedules.data.length && (
          <Button
            onClick={async () => {
              try {
                const r = await timetableApi.start(year);
                showToast(`Set up: ${r.schedules} schedule, periods for ${r.loads} class subjects. Adjust them to your school.`, "success");
                await queryClient.invalidateQueries();
              } catch (err) {
                showToast(errorMessage(err), "error");
              }
            }}
          >
            Start with the defaults
          </Button>
        )}
      </div>
      {schedules.data && !schedules.data.length && <FormAlert tone="info">Nothing set up for this year. &quot;Start with the defaults&quot; makes an 8-period day (Monday–Saturday, a break after period 4) and 6 periods a week per subject (2 for activities), to adjust.</FormAlert>}
      <Tabs
        tabs={[
          { id: "schedules", label: "Bell schedule & days" },
          { id: "loads", label: "Periods per class" },
          { id: "teachers", label: "Teachers" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <div className="mt-6">{year && (tab === "schedules" ? <Schedules year={year} /> : tab === "loads" ? <Loads year={year} /> : <Teachers year={year} />)}</div>
    </>
  );
}

export default function TimetableSetupPage() {
  return (
    <RequirePermission permission="timetable.manage">
      <Setup />
    </RequirePermission>
  );
}
