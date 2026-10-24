"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { MEETING, MODE_LABEL, MyPtm, ptmApi, showDay, showTime } from "@/lib/api/ptm";
import { cn } from "@/lib/utils";

type Teacher = MyPtm["children"][number]["teachers"][number];

function BookModal({ ptm, child, teacher, onClose }: { ptm: MyPtm; child: MyPtm["children"][number]; teacher: Teacher; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [slot, setSlot] = useState(teacher.meeting?.slot ?? "");
  const [topics, setTopics] = useState<string[]>(teacher.meeting?.topicIds ?? []);
  const [note, setNote] = useState(teacher.meeting?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const slots = Array.from(new Set([...(teacher.meeting?.slot ? [teacher.meeting.slot] : []), ...teacher.free])).sort();
  const save = async () => {
    setError(null);
    try {
      await ptmApi.book({ ptmId: ptm.id, staffId: teacher.staffId, studentId: child.id, slot, topicIds: topics, note: note.trim() || null });
      queryClient.invalidateQueries({ queryKey: ["ptm"] });
      showToast(`Booked: ${showTime(slot)} with ${teacher.name}`, "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      queryClient.invalidateQueries({ queryKey: ["ptm"] });
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Book a time with ${teacher.name}`} width="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          For {child.name} · {showDay(ptm.date)}
          {teacher.room ? ` · ${teacher.room}` : ""}
        </p>
        {!slots.length ? (
          <FormAlert tone="warning">No free time left with this teacher. You can still come and wait at the desk.</FormAlert>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {slots.map((t) => (
              <button key={t} type="button" onClick={() => setSlot(t)} className={cn("rounded-xl border px-2 py-2 text-sm font-bold", slot === t ? "bg-primary text-white border-primary" : "border-outline-variant/40 hover:bg-surface-container-high")}>
                {showTime(t)}
              </button>
            ))}
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">What you want to talk about (optional)</p>
          <div className="flex flex-wrap gap-2">
            {ptm.topics.map((t) => (
              <button key={t.id} type="button" onClick={() => setTopics((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))} className={cn("rounded-full px-3 py-1 text-xs font-bold border", topics.includes(t.id) ? "bg-primary/15 text-primary border-primary/40" : "border-outline-variant/30 text-on-surface-variant")}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="A note for the teacher (optional)" className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Note for the teacher" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!slot}>
            {teacher.meeting?.slot ? "Change time" : "Book"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Remarks({ r }: { r: NonNullable<NonNullable<Teacher["meeting"]>["remarks"]> }) {
  return (
    <div className="mt-2 rounded-xl bg-surface-container-low px-3 py-2 space-y-1">
      {r.points.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {r.points.map((p, i) => (
            <Pill key={i} tone={p.tone === "good" ? "success" : p.tone === "work" ? "warning" : "neutral"}>
              {p.name}
            </Pill>
          ))}
        </div>
      )}
      {r.text && <p className="text-sm">{r.text}</p>}
      {r.actions && <p className="text-xs text-on-surface-variant">To do: {r.actions}</p>}
    </div>
  );
}

function PtmCard({ ptm, past }: { ptm: MyPtm; past?: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [booking, setBooking] = useState<{ child: MyPtm["children"][number]; teacher: Teacher } | null>(null);
  const cancel = async (t: Teacher) => {
    if (!t.meeting || !(await confirm({ title: `Cancel your ${showTime(t.meeting.slot)} with ${t.name}?`, confirmLabel: "Cancel it", danger: true }))) return;
    try {
      await ptmApi.cancelBooking(t.meeting.id);
      queryClient.invalidateQueries({ queryKey: ["ptm"] });
      showToast("Cancelled", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-3">
        <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-primary">groups</span>
        <div className="flex-1 min-w-[12rem]">
          <p className="text-lg font-extrabold">{ptm.title}</p>
          <p className="text-sm text-on-surface-variant">
            {showDay(ptm.date)} · {showTime(ptm.startTime)} – {showTime(ptm.endTime)} · {MODE_LABEL[ptm.mode]}
          </p>
          {ptm.note && <p className="text-xs mt-1 whitespace-pre-line">{ptm.note}</p>}
        </div>
        {!past && (ptm.bookingOpen ? <Pill tone="success">Booking open</Pill> : ptm.booking ? <Pill>Booking closed</Pill> : <Pill>No booking: walk in</Pill>)}
      </div>
      {ptm.children.map((c) => (
        <div key={c.id} className="mt-5">
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
            {c.name} · {c.section}
          </p>
          <ul className="mt-2 space-y-2">
            {c.teachers.map((t) => (
              <li key={t.staffId} className="rounded-xl border border-outline-variant/20 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[10rem]">
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-xs text-on-surface-variant/70">
                      {t.role}
                      {t.room ? ` · ${t.room}` : ""}
                    </p>
                  </div>
                  {t.away ? (
                    <Pill>Away that day</Pill>
                  ) : t.meeting && t.meeting.status !== "cancelled" ? (
                    <>
                      <Pill tone={MEETING[t.meeting.status]?.tone ?? "neutral"}>
                        {t.meeting.status === "booked" ? `Booked: ${showTime(t.meeting.slot)}` : MEETING[t.meeting.status]?.label}
                      </Pill>
                      {t.link && !past && (
                        <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary">
                          Join online
                        </a>
                      )}
                      {ptm.canChange && t.meeting.status === "booked" && (
                        <>
                          <Button variant="tertiary" onClick={() => setBooking({ child: c, teacher: t })}>
                            Change
                          </Button>
                          <Button variant="tertiary" onClick={() => cancel(t)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </>
                  ) : ptm.bookingOpen ? (
                    <Button variant="secondary" onClick={() => setBooking({ child: c, teacher: t })}>
                      Book a time
                    </Button>
                  ) : past ? (
                    <Pill>Not met</Pill>
                  ) : null}
                </div>
                {t.meeting?.remarks && <Remarks r={t.meeting.remarks} />}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {booking && <BookModal ptm={ptm} child={booking.child} teacher={booking.teacher} onClose={() => setBooking(null)} />}
    </Card>
  );
}

function Mine() {
  const q = useQuery({ queryKey: ["ptm", "mine"], queryFn: ptmApi.mine });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const { upcoming, past } = q.data!;
  return (
    <div className="space-y-5 max-w-4xl">
      {!upcoming.length && <FormAlert tone="info">No PTM coming up. You’ll get a notification when one is announced.</FormAlert>}
      {upcoming.map((p) => (
        <PtmCard key={p.id} ptm={p} />
      ))}
      {past.length > 0 && (
        <>
          <p className="text-sm font-extrabold text-on-surface pt-2">Past PTMs and the teachers’ remarks</p>
          {past.map((p) => (
            <PtmCard key={p.id} ptm={p} past />
          ))}
        </>
      )}
    </div>
  );
}

export default function MyPtmPage() {
  return (
    <RequirePermission permission="ptm.mine">
      <PageHeader title="Parent–Teacher Meetings" description="Book a time with each of your child’s teachers, and read their remarks after the meeting." />
      <Mine />
    </RequirePermission>
  );
}
