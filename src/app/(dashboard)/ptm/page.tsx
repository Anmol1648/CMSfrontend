"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { academicApi } from "@/lib/api/academic";
import { MEETING, MODE_LABEL, PtmDetail, PtmInput, PtmMode, ptmApi, showDay, showTime, STATUS, WhoSits } from "@/lib/api/ptm";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const todayIST = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function PtmForm({ ptm, onClose }: { ptm: PtmDetail | null; onClose: (id?: string) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const defaults = useQuery({ queryKey: ["ptm", "defaults"], queryFn: ptmApi.defaults, enabled: !ptm });
  const years = useQuery({ queryKey: ["academic", "years"], queryFn: academicApi.years });
  const yearId = years.data?.find((y) => y.isCurrent)?.id;
  const sections = useQuery({ queryKey: ["academic", "section-options", yearId], queryFn: () => academicApi.sectionOptions(yearId!), enabled: !!yearId });
  const [v, setV] = useState<PtmInput | null>(ptm ? { title: ptm.title, date: ptm.date, startTime: ptm.startTime, endTime: ptm.endTime, slotMinutes: ptm.slotMinutes, breakStart: ptm.breakStart, breakEnd: ptm.breakEnd, mode: ptm.mode, whoSits: ptm.whoSits, booking: ptm.booking, sectionIds: ptm.sectionIds, note: ptm.note } : null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!ptm && defaults.data) setV((x) => x ?? { title: "", date: todayIST(), startTime: "09:00", endTime: "13:00", slotMinutes: defaults.data.slotMinutes, breakStart: null, breakEnd: null, mode: "in_person", whoSits: defaults.data.whoSits, booking: true, sectionIds: [], note: null });
  }, [ptm, defaults.data]);
  const set = (p: Partial<PtmInput>) => setV((x) => (x ? { ...x, ...p } : x));
  const save = async () => {
    if (!v) return;
    setError(null);
    try {
      const r = await ptmApi.save(ptm?.id ?? null, v);
      queryClient.invalidateQueries({ queryKey: ["ptm"] });
      showToast(ptm ? "Saved" : "PTM planned: check the teachers, then publish", "success");
      onClose(r.id);
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  // Sections grouped by class, with "all of a class" buttons.
  const byClass = new Map<string, { id: string; label: string }[]>();
  for (const s of sections.data ?? []) byClass.set(s.classId, [...(byClass.get(s.classId) ?? []), s]);
  const toggle = (ids: string[], on: boolean) => set({ sectionIds: on ? Array.from(new Set([...(v?.sectionIds ?? []), ...ids])) : (v?.sectionIds ?? []).filter((x) => !ids.includes(x)) });
  return (
    <Modal isOpen onClose={() => onClose()} title={ptm ? "Edit PTM" : "Plan a PTM"} width="max-w-3xl">
      {!v ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Input label="Title" value={v.title} onChange={(e) => set({ title: e.target.value })} error={fields.title} placeholder="PTM after Half-yearly exams" />
            <Input label="Date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} error={fields.date} />
          </div>
          <div className="grid gap-4 sm:grid-cols-5">
            <Input label="From" type="time" value={v.startTime} onChange={(e) => set({ startTime: e.target.value })} error={fields.startTime} />
            <Input label="To" type="time" value={v.endTime} onChange={(e) => set({ endTime: e.target.value })} error={fields.endTime} />
            <Input label="Slot (min)" type="number" min={3} max={60} value={v.slotMinutes} onChange={(e) => set({ slotMinutes: Math.max(3, Math.min(60, Math.round(Number(e.target.value) || 10))) })} error={fields.slotMinutes} />
            <Input label="Break from" type="time" value={v.breakStart ?? ""} onChange={(e) => set({ breakStart: e.target.value || null })} />
            <Input label="Break to" type="time" value={v.breakEnd ?? ""} onChange={(e) => set({ breakEnd: e.target.value || null })} error={fields.breakEnd} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Where" value={v.mode} onChange={(m) => set({ mode: m as PtmMode })} options={(Object.keys(MODE_LABEL) as PtmMode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))} />
            <Select label="Parents meet" value={v.whoSits} onChange={(w) => set({ whoSits: w as WhoSits })} options={[{ value: "class_subject", label: "The class teacher and the subject teachers" }, { value: "class", label: "The class teacher only" }]} />
          </div>
          <Checkbox checked={v.booking} onChange={(b) => set({ booking: b })} label="Parents book a time with each teacher" hint="Off: no booking, parents come any time in the hours (walk-in at the desk)." />
          <div>
            <div className="flex items-center justify-between">
              <p className={label}>Sections ({v.sectionIds.length})</p>
              <button type="button" className="text-xs font-bold text-primary" onClick={() => set({ sectionIds: v.sectionIds.length ? [] : (sections.data ?? []).map((s) => s.id) })}>
                {v.sectionIds.length ? "Clear" : "All sections"}
              </button>
            </div>
            {fields.sectionIds && <p className="text-xs text-error mt-1">{fields.sectionIds}</p>}
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {Array.from(byClass.values()).map((list) => {
                const all = list.every((s) => v.sectionIds.includes(s.id));
                return (
                  <div key={list[0].id} className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => toggle(list.map((s) => s.id), !all)} className={cn("rounded-full px-3 py-1 text-xs font-bold border", all ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
                      All
                    </button>
                    {list.map((s) => (
                      <button key={s.id} type="button" onClick={() => toggle([s.id], !v.sectionIds.includes(s.id))} className={cn("rounded-full px-3 py-1 text-xs font-bold border", v.sectionIds.includes(s.id) ? "bg-primary/15 text-primary border-primary/40" : "border-outline-variant/30 text-on-surface-variant")}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <TextArea label="Note for parents (optional)" rows={2} value={v.note ?? ""} onChange={(e) => set({ note: e.target.value || null })} placeholder="Report cards will be given. Please bring the school diary." />
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TeacherRow({ ptm, t }: { ptm: PtmDetail; t: PtmDetail["teachers"][number] }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [room, setRoom] = useState(t.room ?? "");
  const [link, setLink] = useState(t.link ?? "");
  const save = async (away = t.away) => {
    try {
      await ptmApi.setTeacher(ptm.id, t.staffId, { room: room || null, link: link || null, away });
      queryClient.invalidateQueries({ queryKey: ["ptm"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const closed = ["done", "cancelled"].includes(ptm.status);
  return (
    <tr className={cn("border-b border-outline-variant/10", t.away && "opacity-60")}>
      <td className="px-3 py-2">
        <p className="font-bold text-sm">{t.name}</p>
        <p className="text-xs text-on-surface-variant/70">{t.sections.join(", ")}</p>
      </td>
      <td className="px-3 py-2 text-xs">{t.subjects.join(", ") || "—"}</td>
      <td className="px-3 py-2">
        <input value={room} disabled={closed} onChange={(e) => setRoom(e.target.value)} onBlur={() => room !== (t.room ?? "") && save()} placeholder="Room" className="w-24 rounded-lg bg-surface-container-low px-2 py-1.5 text-sm" aria-label={`Room of ${t.name}`} />
      </td>
      {ptm.mode !== "in_person" && (
        <td className="px-3 py-2">
          <input value={link} disabled={closed} onChange={(e) => setLink(e.target.value)} onBlur={() => link !== (t.link ?? "") && save()} placeholder="https://meet…" className="w-40 rounded-lg bg-surface-container-low px-2 py-1.5 text-sm" aria-label={`Video link of ${t.name}`} />
        </td>
      )}
      <td className="px-3 py-2 text-xs">
        {t.booked} booked · {t.met} met
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input type="checkbox" disabled={closed} checked={t.away} onChange={(e) => save(e.target.checked)} className="accent-[#1A365D]" /> Away
        </label>
      </td>
    </tr>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["ptm", "one", id], queryFn: () => ptmApi.get(id) });
  const [tab, setTab] = useState<"teachers" | "meetings">("teachers");
  const meetings = useQuery({ queryKey: ["ptm", "meetings", id], queryFn: () => ptmApi.meetings(id), enabled: tab === "meetings" });
  const [edit, setEdit] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const p = q.data;
  if (!p) return <PageLoader />;
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["ptm"] });
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs font-bold text-primary">
        ← All PTMs
      </button>
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[14rem]">
            <p className="text-xl font-extrabold text-on-surface">{p.title}</p>
            <p className="text-sm text-on-surface-variant">
              {showDay(p.date)} · {showTime(p.startTime)} – {showTime(p.endTime)} · {p.slotMinutes}-minute slots{p.breakStart ? ` · break ${showTime(p.breakStart)}–${showTime(p.breakEnd)}` : ""}
            </p>
            <p className="text-xs text-on-surface-variant/70 mt-1">
              {MODE_LABEL[p.mode]} · {p.whoSits === "class" ? "class teachers only" : "class and subject teachers"} · {p.booking ? "parents book times" : "walk-in only"} · {p.sections.length} sections, {p.totals.students} students · {p.totals.booked} meetings booked, {p.totals.met} met
            </p>
            {p.note && <p className="text-xs mt-2 whitespace-pre-line">{p.note}</p>}
          </div>
          <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.status !== "done" && p.status !== "cancelled" && (
            <Button variant="secondary" onClick={() => setEdit(true)}>
              Edit
            </Button>
          )}
          {p.status === "draft" && (
            <>
              <Button onClick={async () => (await confirm({ title: "Publish this PTM?", message: "Parents of these sections and the teachers are told, and booking opens.", confirmLabel: "Publish" })) && act(() => ptmApi.publish(p.id), "Published: families are told")}>Publish</Button>
              <Button variant="tertiary" onClick={async () => (await confirm({ title: "Delete this draft?", confirmLabel: "Delete", danger: true })) && act(() => ptmApi.remove(p.id).then(onBack), "Deleted")}>
                Delete
              </Button>
            </>
          )}
          {p.status === "published" && (
            <>
              <Button onClick={async () => (await confirm({ title: "Close this PTM?", message: "Booked families who weren’t met are marked “didn’t come”, and parents are told the remarks are in.", confirmLabel: "Close" })) && act(() => ptmApi.complete(p.id), "Closed")}>Close the PTM (held)</Button>
              <Button variant="tertiary" onClick={() => setCancelling(true)}>
                Cancel the PTM
              </Button>
            </>
          )}
        </div>
      </Card>
      <div className="flex gap-2">
        {(["teachers", "meetings"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-sm font-bold", tab === t ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant")}>
            {t === "teachers" ? `Teachers (${p.teachers.length})` : "Meetings and remarks"}
          </button>
        ))}
      </div>
      {tab === "teachers" ? (
        <Card padding="none">
          {p.status === "draft" && <p className="px-4 pt-4 text-xs text-on-surface-variant/70">These teachers sit (from class teachers and Staff → Subject Teachers). Set rooms (and links), mark anyone away, then publish.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-3 py-3">Teacher · sections</th>
                  <th className="px-3 py-3">Subjects</th>
                  <th className="px-3 py-3">Room</th>
                  {p.mode !== "in_person" && <th className="px-3 py-3">Video link</th>}
                  <th className="px-3 py-3">Bookings</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {p.teachers.map((t) => (
                  <TeacherRow key={t.staffId} ptm={p} t={t} />
                ))}
              </tbody>
            </table>
          </div>
          {!p.teachers.length && <FormAlert tone="warning">No teacher sits: set class teachers (Academic → Sections) or subject teachers first.</FormAlert>}
        </Card>
      ) : meetings.isLoading ? (
        <PageLoader />
      ) : !meetings.data?.length ? (
        <FormAlert tone="info">No meetings yet.</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-3 py-3">Teacher</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">State</th>
                  <th className="px-3 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {meetings.data.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/10 align-top">
                    <td className="px-3 py-2">{m.teacher}</td>
                    <td className="px-3 py-2 font-bold">{m.student}</td>
                    <td className="px-3 py-2 text-xs">{showTime(m.slot)}</td>
                    <td className="px-3 py-2">
                      <Pill tone={MEETING[m.status]?.tone ?? "neutral"}>{MEETING[m.status]?.label ?? m.status}</Pill>
                    </td>
                    <td className="px-3 py-2 text-xs max-w-md">
                      {m.remarks}
                      {m.actions ? <span className="block text-on-surface-variant/70">Action: {m.actions}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {edit && <PtmForm ptm={p} onClose={() => setEdit(false)} />}
      {cancelling && (
        <Modal isOpen onClose={() => setCancelling(false)} title="Cancel the PTM">
          <div className="space-y-4">
            <Input label="Why (sent to parents)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Heavy rain warning" />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCancelling(false)}>
                Back
              </Button>
              <Button onClick={() => act(() => ptmApi.cancel(p.id, reason.trim()), "Cancelled: families are told").then(() => setCancelling(false))} disabled={reason.trim().length < 3}>
                Cancel the PTM
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function List() {
  const q = useQuery({ queryKey: ["ptm", "list"], queryFn: ptmApi.list });
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  if (open) return <Detail id={open} onBack={() => setOpen(null)} />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>Plan a PTM</Button>
      </div>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.length ? (
        <FormAlert tone="info">No PTMs yet.</FormAlert>
      ) : (
        q.data.map((p) => (
          <button key={p.id} type="button" onClick={() => setOpen(p.id)} className="w-full text-left rounded-2xl bg-surface-container-lowest p-4 shadow-sm hover:shadow-md flex flex-wrap items-center gap-3">
            <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-primary">groups</span>
            <span className="flex-1 min-w-[12rem]">
              <span className="block font-bold">{p.title}</span>
              <span className="block text-xs text-on-surface-variant/70">
                {showDay(p.date)} · {showTime(p.startTime)} – {showTime(p.endTime)} · {MODE_LABEL[p.mode]} · {p.sections} sections
              </span>
            </span>
            <span className="text-xs text-on-surface-variant">
              {p.booked} booked · {p.met} met{p.absent ? ` · ${p.absent} didn’t come` : ""}
            </span>
            <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
          </button>
        ))
      )}
      {adding && <PtmForm ptm={null} onClose={(id) => { setAdding(false); if (id) setOpen(id); }} />}
    </div>
  );
}

export default function PtmPage() {
  return (
    <RequirePermission permission="ptm.manage">
      <PageHeader title="Parent–Teacher Meetings" description="Plan a PTM for some sections; the teachers’ slots are made for you. Publish it and parents book times." />
      <List />
    </RequirePermission>
  );
}
