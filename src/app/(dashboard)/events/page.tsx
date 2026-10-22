"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { todayIST } from "@/lib/api/attendance";
import { mastersApi } from "@/lib/api/masters";
import { EventInput, eventsApi, hasAudience, HolidayItem, NO_AUDIENCE, SchoolEvent } from "@/lib/api/notices";
import { AudiencePicker } from "@/components/notices/AudiencePicker";
import { cn } from "@/lib/utils";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => new Date(`${s}T00:00:00Z`);
const monthName = (m: string) => at(`${m}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const shift = (m: string, by: number) => iso(new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + by, 1))).slice(0, 7);
const lastOf = (m: string) => iso(new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)));
const show = (s: string, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => at(s).toLocaleDateString("en-IN", { ...o, timeZone: "UTC" });

/** A colour per event type, so the month reads at a glance. */
const TONES = ["bg-sky-100 text-sky-900 border-sky-300", "bg-violet-100 text-violet-900 border-violet-300", "bg-amber-100 text-amber-900 border-amber-300", "bg-emerald-100 text-emerald-900 border-emerald-300", "bg-pink-100 text-pink-900 border-pink-300", "bg-teal-100 text-teal-900 border-teal-300", "bg-orange-100 text-orange-900 border-orange-300"];
const toneOf = (key: string | null) => TONES[(key ?? "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const HOLIDAY = "bg-rose-100 text-rose-900 border-rose-300";

type Item = SchoolEvent | HolidayItem;

const BLANK: EventInput = { ...NO_AUDIENCE, forEveryone: true, title: "", typeId: null, from: todayIST(), to: todayIST(), startTime: null, endTime: null, venue: null, description: null, holidayFor: "none", attachmentIds: [] };

function Editor({ event, onClose }: { event: SchoolEvent | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const types = useQuery({ queryKey: ["master-options", "event_type"], queryFn: () => mastersApi.options("event_type"), staleTime: 5 * 60_000 });
  const [e, setE] = useState<EventInput>(
    event
      ? { ...NO_AUDIENCE, ...event, typeId: event.typeId, startTime: event.startTime, endTime: event.endTime, venue: event.venue, description: event.description, attachmentIds: event.attachments.map((a) => a.id) }
      : { ...BLANK, postNotice: true }
  );
  const [files, setFiles] = useState(event?.attachments ?? []);
  const [allDay, setAllDay] = useState(!event?.startTime);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<EventInput>) => setE((x) => ({ ...x, ...patch }));
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const f = await eventsApi.upload(file);
      setFiles((x) => [...x, f]);
      set({ attachmentIds: [...e.attachmentIds, f.id] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const save = async () => {
    setError(null);
    setBusy(true);
    const input = { ...e, ...(allDay ? { startTime: null, endTime: null } : {}) };
    try {
      if (event) await eventsApi.save(event.id, input);
      else await eventsApi.create(input);
      showToast(event ? "Event saved" : e.postNotice ? "Event added, and a notice posted" : "Event added", "success");
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["events-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["notices-mine"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={event ? `Edit ${event.title}` : "Add an event"} width="max-w-3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
          <Input label="Event" value={e.title} onChange={(ev) => set({ title: ev.target.value })} maxLength={120} placeholder="e.g. Annual Sports Meet" />
          <Select label="Type" value={e.typeId ?? ""} onChange={(v) => set({ typeId: v || null })} options={[{ value: "", label: "None" }, ...(types.data ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <Input label="From" type="date" value={e.from} onChange={(ev) => set({ from: ev.target.value, ...(e.to < ev.target.value ? { to: ev.target.value } : {}) })} />
          <Input label="To" type="date" value={e.to} min={e.from} onChange={(ev) => set({ to: ev.target.value })} />
          {!allDay && <Input label="Starts" type="time" value={e.startTime ?? ""} onChange={(ev) => set({ startTime: ev.target.value || null })} />}
          {!allDay && <Input label="Ends" type="time" value={e.endTime ?? ""} onChange={(ev) => set({ endTime: ev.target.value || null })} />}
        </div>
        <Checkbox label="All day" checked={allDay} onChange={setAllDay} />
        <Input label="Venue (optional)" value={e.venue ?? ""} onChange={(ev) => set({ venue: ev.target.value || null })} maxLength={120} />
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Details (optional)</span>
          <textarea value={e.description ?? ""} onChange={(ev) => set({ description: ev.target.value || null })} rows={4} maxLength={5000} className="mt-2 w-full rounded-xl bg-surface-container-low p-4 text-sm outline-none focus:ring-2 focus:ring-primary/10" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {files
            .filter((f) => e.attachmentIds.includes(f.id))
            .map((f) => (
              <span key={f.id} className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs">
                {f.name}
                <button type="button" aria-label={`Remove ${f.name}`} className="text-error" onClick={() => set({ attachmentIds: e.attachmentIds.filter((x) => x !== f.id) })}>
                  ✕
                </button>
              </span>
            ))}
          <label className="cursor-pointer rounded-xl bg-surface-container-low px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80">
            Add file
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(ev) => upload(ev.target.files?.[0])} />
          </label>
        </div>
        <AudiencePicker value={e} onChange={(a) => set(a)} />
        <Select
          label="Is the school closed on these days?"
          value={e.holidayFor}
          onChange={(v) => set({ holidayFor: v as EventInput["holidayFor"] })}
          options={[
            { value: "none", label: "No, a normal school day" },
            { value: "both", label: "Yes: a holiday for everyone" },
            { value: "students", label: "Yes: a holiday for students (staff come in)" },
            { value: "staff", label: "Yes: a holiday for staff only" },
          ]}
        />
        {e.holidayFor !== "none" && <p className="text-xs text-on-surface-variant/70 -mt-2 ml-1">The days go into the holiday list, so attendance isn’t taken on them.</p>}
        {!event && <Checkbox label="Also put a notice on the board about it" checked={!!e.postNotice} onChange={(c) => set({ postNotice: c })} />}
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={e.title.trim().length < 3 || !hasAudience(e)}>
            {event ? "Save" : "Add event"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EventDetail({ item, canManage, onClose, onEdit }: { item: Item; canManage: boolean; onClose: () => void; onEdit: (e: SchoolEvent) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
    queryClient.invalidateQueries({ queryKey: ["events-upcoming"] });
  };
  const dates = item.from === item.to ? show(item.from, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${show(item.from)} – ${show(item.to, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
  if (item.kind === "holiday")
    return (
      <Modal isOpen onClose={onClose} title={item.title}>
        <p className="text-sm">{dates}</p>
        <p className="mt-2 text-sm text-on-surface-variant">Holiday {item.forStudents && item.forStaff ? "for everyone" : item.forStudents ? "for students" : "for staff"} (Attendance → Holidays).</p>
      </Modal>
    );
  const e = item;
  const cancel = async () => {
    if (!(await confirm({ title: e.status === "cancelled" ? `Put ${e.title} back on?` : `Call off ${e.title}?`, message: e.status === "cancelled" ? "It shows on the calendar again." : "It stays on the calendar, crossed out; its holidays go.", confirmLabel: e.status === "cancelled" ? "Put back" : "Call off", danger: e.status !== "cancelled" }))) return;
    try {
      await eventsApi.cancel(e.id, e.status !== "cancelled");
      refresh();
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${e.title}?`, message: "It is removed from the calendar (with its holidays).", confirmLabel: "Delete", danger: true }))) return;
    try {
      await eventsApi.remove(e.id);
      refresh();
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const open = async (fileId: string) => {
    try {
      window.open(await authedImageUrl(eventsApi.attachmentPath(e.id, fileId)), "_blank", "noopener");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={e.title} width="max-w-xl">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {e.type && <Pill tone="primary">{e.type}</Pill>}
          {e.status === "cancelled" && <Pill tone="danger">Called off</Pill>}
          {e.holidayFor !== "none" && <Pill tone="warning">Holiday{e.holidayFor === "students" ? " for students" : e.holidayFor === "staff" ? " for staff" : ""}</Pill>}
        </div>
        <p className="font-semibold">
          {dates}
          {e.startTime && ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ""}`}
        </p>
        {e.venue && <p>📍 {e.venue}</p>}
        <p className="text-on-surface-variant/80">For: {e.audience}</p>
        {e.description && <p className="whitespace-pre-line">{e.description}</p>}
        {e.attachments.map((f) => (
          <button key={f.id} type="button" onClick={() => open(f.id)} className="flex w-full items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2 text-left hover:bg-surface-container">
            <span className="material-symbols-outlined text-primary text-lg">attach_file</span>
            {f.name}
          </button>
        ))}
        {canManage && (
          <div className="flex flex-wrap justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={remove}>
              Delete
            </Button>
            <Button variant="secondary" onClick={cancel}>
              {e.status === "cancelled" ? "Put back on" : "Call off"}
            </Button>
            <Button onClick={() => onEdit(e)}>Edit</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Calendar() {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [view, setView] = useState<"month" | "list">("month");
  const [open, setOpen] = useState<Item | null>(null);
  const [editing, setEditing] = useState<SchoolEvent | "new" | null>(null);
  const first = `${month}-01`;
  const last = lastOf(month);
  const q = useQuery({ queryKey: ["calendar", month], queryFn: () => eventsApi.calendar(first, last), placeholderData: keepPreviousData });
  const d = q.data;
  const items: Item[] = useMemo(() => (d ? [...d.holidays, ...d.events].sort((a, b) => a.from.localeCompare(b.from)) : []), [d]);
  const today = todayIST();

  // The weeks of the month, Monday first.
  const cells = useMemo(() => {
    const start = at(first);
    const lead = (start.getUTCDay() + 6) % 7;
    const out: (string | null)[] = Array(lead).fill(null);
    for (let t = start.getTime(); t <= at(last).getTime(); t += DAY) out.push(iso(new Date(t)));
    while (out.length % 7) out.push(null);
    return out;
  }, [first, last]);
  const on = (day: string) => items.filter((i) => i.from <= day && i.to >= day);

  return (
    <>
      <PageHeader
        title="School Calendar"
        description="Events and holidays. Tap one for the details."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/reports/events_list" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Print
            </Link>
            {d?.canManage && (
              <Button onClick={() => setEditing("new")}>
                <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
                Add event
              </Button>
            )}
          </div>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setMonth(shift(month, -1))} aria-label="Previous month">
              <span className="material-symbols-outlined align-middle">chevron_left</span>
            </Button>
            <h3 className="font-black text-primary min-w-[150px] text-center">{monthName(month)}</h3>
            <Button variant="secondary" onClick={() => setMonth(shift(month, 1))} aria-label="Next month">
              <span className="material-symbols-outlined align-middle">chevron_right</span>
            </Button>
            {month !== today.slice(0, 7) && (
              <button type="button" className="text-xs font-bold uppercase tracking-widest text-primary ml-2" onClick={() => setMonth(today.slice(0, 7))}>
                Today
              </button>
            )}
          </div>
          <div className="inline-flex rounded-xl bg-surface-container p-1" role="tablist" aria-label="View">
            {(["month", "list"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold", view === v ? "bg-white text-primary shadow-sm" : "text-on-surface-variant")}>
                <span className="material-symbols-outlined text-base">{v === "month" ? "calendar_month" : "view_agenda"}</span>
                {v === "month" ? "Month" : "List"}
              </button>
            ))}
          </div>
        </div>
        {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
        {!d && !q.isError && <PageLoader />}
        {d && view === "month" && (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-1 min-w-[560px]">
              {WEEK.map((w) => (
                <div key={w} className="px-1 pb-1 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                  {w}
                </div>
              ))}
              {cells.map((day, i) => (
                <div key={i} className={cn("min-h-[92px] rounded-lg border p-1", !day ? "border-transparent" : day === today ? "border-primary bg-primary/5" : "border-outline-variant/20 bg-white")}>
                  {day && (
                    <>
                      <p className={cn("text-right text-[11px] font-bold px-1", day === today ? "text-primary" : "text-on-surface-variant/70")}>{Number(day.slice(8))}</p>
                      <div className="space-y-0.5">
                        {on(day)
                          .slice(0, 3)
                          .map((it) => (
                            <button
                              key={`${it.kind}-${it.id}`}
                              type="button"
                              onClick={() => setOpen(it)}
                              title={it.title}
                              className={cn(
                                "block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] font-semibold",
                                it.kind === "holiday" ? HOLIDAY : toneOf(it.type),
                                it.kind === "event" && it.status === "cancelled" && "line-through opacity-60"
                              )}
                            >
                              {it.kind === "event" && it.startTime && it.from === day ? `${it.startTime} ` : ""}
                              {it.title}
                            </button>
                          ))}
                        {on(day).length > 3 && <p className="px-1 text-[10px] text-on-surface-variant/70">+{on(day).length - 3} more</p>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {d && view === "list" && (
          <div className="divide-y divide-outline-variant/10">
            {items.map((it) => (
              <button key={`${it.kind}-${it.id}`} type="button" onClick={() => setOpen(it)} className="flex w-full flex-wrap items-start gap-4 py-3 text-left hover:bg-surface-container-low px-2 rounded-lg">
                <div className="w-28 shrink-0 text-xs font-bold text-primary">
                  {show(it.from)}
                  {it.to !== it.from && <span className="block font-normal text-on-surface-variant/70">to {show(it.to)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", it.kind === "event" && it.status === "cancelled" && "line-through opacity-60")}>{it.title}</p>
                  <p className="text-xs text-on-surface-variant/70">
                    {it.kind === "holiday" ? "Holiday" : [it.type, it.startTime ? `${it.startTime}${it.endTime ? `–${it.endTime}` : ""}` : "All day", it.venue, it.audience].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", it.kind === "holiday" ? HOLIDAY : toneOf(it.type))}>{it.kind === "holiday" ? "Holiday" : (it.type ?? "Event")}</span>
              </button>
            ))}
            {!items.length && <p className="py-12 text-center text-sm text-on-surface-variant/70">Nothing this month.</p>}
          </div>
        )}
      </Card>
      {open && <EventDetail item={open} canManage={!!d?.canManage} onClose={() => setOpen(null)} onEdit={(e) => { setOpen(null); setEditing(e); }} />}
      {editing && <Editor event={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function EventsPage() {
  return <Calendar />;
}
