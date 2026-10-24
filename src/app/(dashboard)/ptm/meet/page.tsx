"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { Family, MEETING, MeetingInput, MyMeetings, ptmApi, showDay, showTime, STATUS } from "@/lib/api/ptm";
import { cn } from "@/lib/utils";

function MeetForm({ ptm, f, onClose }: { ptm: NonNullable<MyMeetings["ptm"]>; f: Family; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const remarks = useQuery({ queryKey: ["master-options", "ptm_remark"], queryFn: () => mastersApi.options("ptm_remark"), staleTime: 5 * 60_000 });
  const m = f.meeting;
  const [v, setV] = useState<MeetingInput>({ status: m?.status === "absent" ? "absent" : "attended", remarkIds: m?.remarkIds ?? [], remarks: m?.remarks ?? null, actions: m?.actions ?? null, followUpOn: m?.followUpOn ?? null, shared: m ? m.shared : ptm.sharedByDefault });
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<MeetingInput>) => setV((x) => ({ ...x, ...p }));
  const save = async (status: MeetingInput["status"]) => {
    try {
      await ptmApi.saveMeeting(ptm.id, f.studentId, { ...v, status });
      queryClient.invalidateQueries({ queryKey: ["ptm", "meet"] });
      showToast(status === "attended" ? "Saved" : "Marked: didn’t come", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const tone = (extra: unknown) => ((extra as { tone?: string } | null)?.tone === "good" ? "good" : (extra as { tone?: string } | null)?.tone === "work" ? "work" : "info");
  return (
    <Modal isOpen onClose={onClose} title={`${f.name} · ${f.section}`} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Pill>{m?.slot ? `Booked ${showTime(m.slot)}` : "No booking"}</Pill>
          {f.attendance !== null && <Pill tone={f.attendance < 75 ? "danger" : f.attendance < 85 ? "warning" : "success"}>Attendance {f.attendance}%</Pill>}
          {m?.topics.map((t) => (
            <Pill key={t} tone="primary">
              {t}
            </Pill>
          ))}
        </div>
        {m?.note && <FormAlert tone="info">Parent’s note: {m.note}</FormAlert>}
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">Remarks (tick what applies)</p>
          <div className="flex flex-wrap gap-2">
            {(remarks.data ?? [])
              .filter((r) => r.isActive || v.remarkIds.includes(r.id))
              .map((r) => {
                const on = v.remarkIds.includes(r.id);
                const t = tone(r.extra);
                return (
                  <button key={r.id} type="button" onClick={() => set({ remarkIds: on ? v.remarkIds.filter((x) => x !== r.id) : [...v.remarkIds, r.id] })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", on ? (t === "good" ? "bg-green-700 text-white border-green-700" : t === "work" ? "bg-amber-600 text-white border-amber-600" : "bg-primary text-white border-primary") : "border-outline-variant/40 text-on-surface-variant")}>
                    {r.name}
                  </button>
                );
              })}
          </div>
        </div>
        <textarea value={v.remarks ?? ""} onChange={(e) => set({ remarks: e.target.value || null })} rows={3} maxLength={2000} placeholder="Your remarks (optional)" className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Remarks" />
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Input label="Action points" value={v.actions ?? ""} onChange={(e) => set({ actions: e.target.value || null })} placeholder="Practise 10 sums daily" />
          <Input label="Follow up on" type="date" value={v.followUpOn ?? ""} onChange={(e) => set({ followUpOn: e.target.value || null })} />
        </div>
        <Checkbox checked={v.shared} onChange={(x) => set({ shared: x })} label="Parents can read these remarks (after the PTM)" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => save("absent")}>
            Didn’t come
          </Button>
          <Button onClick={() => save("attended")}>Met · save remarks</Button>
        </div>
      </div>
    </Modal>
  );
}

function Meet() {
  const [ptmId, setPtmId] = useState<string | undefined>(undefined);
  const [show, setShow] = useState("all");
  const [open, setOpen] = useState<Family | null>(null);
  const q = useQuery({ queryKey: ["ptm", "meet", ptmId], queryFn: () => ptmApi.meet(ptmId), refetchInterval: 30_000 });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.ptm) return <FormAlert tone="info">No PTM where you meet parents yet.</FormAlert>;
  const p = d.ptm;
  const fam = (d.families ?? []).filter((f) => (show === "booked" ? f.meeting?.slot : show === "waiting" ? f.meeting?.status === "waiting" : show === "todo" ? !f.meeting || ["booked", "waiting"].includes(f.meeting.status) : true));
  const count = (st: string) => (d.families ?? []).filter((f) => f.meeting?.status === st).length;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Select label="PTM" value={p.id} onChange={setPtmId} options={d.ptms.map((x) => ({ value: x.id, label: `${x.title} · ${showDay(x.date)} · ${STATUS[x.status].label}` }))} />
          <Select label="Show" value={show} onChange={setShow} options={[{ value: "all", label: "Everyone I meet" }, { value: "booked", label: "Booked times" }, { value: "waiting", label: "Waiting (checked in)" }, { value: "todo", label: "Not done yet" }]} />
        </div>
        <p className="mt-3 text-sm text-on-surface-variant">
          {showDay(p.date)} · {showTime(p.startTime)} – {showTime(p.endTime)}
          {p.room ? ` · ${p.room}` : ""}
          {p.link ? " · " : ""}
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-bold text-primary">
              your video link
            </a>
          )}
          {" · "}
          {(d.families ?? []).filter((f) => f.meeting?.slot).length} booked · {count("waiting")} waiting · {count("attended")} met
        </p>
        {p.away && <FormAlert tone="warning">You are marked away for this PTM.</FormAlert>}
      </Card>
      <Card padding="none">
        <ul className="divide-y divide-outline-variant/10">
          {fam.map((f) => (
            <li key={f.studentId}>
              <button type="button" onClick={() => setOpen(f)} className={cn("w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-container-low", f.meeting?.status === "waiting" && "bg-amber-50")}>
                <span className="w-20 text-sm font-extrabold text-primary">{f.meeting?.slot ? showTime(f.meeting.slot) : "—"}</span>
                <span className="flex-1 min-w-[10rem]">
                  <span className="block font-bold text-sm">{f.name}</span>
                  <span className="block text-xs text-on-surface-variant/70">
                    {f.section}
                    {f.roll ? ` · roll ${f.roll}` : ""}
                    {f.attendance !== null ? ` · attendance ${f.attendance}%` : ""}
                    {f.meeting?.topics.length ? ` · ${f.meeting.topics.join(", ")}` : ""}
                  </span>
                </span>
                {f.meeting ? <Pill tone={MEETING[f.meeting.status]?.tone ?? "neutral"}>{MEETING[f.meeting.status]?.label}</Pill> : <Pill>Not booked</Pill>}
              </button>
            </li>
          ))}
          {!fam.length && <li className="px-4 py-6 text-sm text-on-surface-variant">No one here.</li>}
        </ul>
      </Card>
      {open && <MeetForm ptm={p} f={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function PtmMeetPage() {
  return (
    <RequirePermission permission="ptm.meet">
      <PageHeader title="My PTM" description="The families you meet, in time order. Open one to mark the meeting and write remarks." />
      <Meet />
    </RequirePermission>
  );
}
