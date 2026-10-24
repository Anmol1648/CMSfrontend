"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { DeskFamily, MEETING, ptmApi, showDay, showTime } from "@/lib/api/ptm";
import { cn } from "@/lib/utils";

function CheckIn({ ptmId }: { ptmId: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; admissionNo: string; section: string }[] | null>(null);
  const [fam, setFam] = useState<DeskFamily | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    const t = text.trim();
    if (t.length < 2) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      ptmApi
        .deskSearch(ptmId, t)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, ptmId]);
  const open = async (studentId: string) => {
    try {
      const f = await ptmApi.family(ptmId, studentId);
      setFam(f);
      setPicked(f.teachers.filter((t) => t.meeting?.status === "booked").map((t) => t.staffId));
      setText("");
      setHits(null);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const checkIn = async () => {
    if (!fam) return;
    try {
      setFam(await ptmApi.checkIn(ptmId, fam.student.id, picked));
      queryClient.invalidateQueries({ queryKey: ["ptm", "board"] });
      showToast("Checked in: the teachers see them waiting", "success");
      setPicked([]);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Card>
      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Check a family in</p>
      <div className="relative mt-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Student name or admission no" icon="search" />
        {hits && (
          <div className="absolute z-20 mt-1 w-full rounded-xl bg-surface-container-lowest shadow-lg max-h-64 overflow-y-auto">
            {!hits.length && <p className="px-4 py-3 text-sm text-on-surface-variant">No student of this PTM found.</p>}
            {hits.map((h) => (
              <button key={h.id} type="button" onClick={() => open(h.id)} className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high">
                <span className="block text-sm font-bold">{h.name}</span>
                <span className="block text-xs text-on-surface-variant/70">
                  {h.admissionNo} · {h.section}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {fam && (
        <div className="mt-4 space-y-2">
          <p className="font-bold">
            {fam.student.name} · {fam.student.section}
          </p>
          {fam.teachers.map((t) => {
            const done = t.meeting && ["attended", "absent", "waiting"].includes(t.meeting.status);
            return (
              <label key={t.staffId} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", done ? "bg-surface-container-low" : "hover:bg-surface-container-low cursor-pointer")}>
                <input type="checkbox" disabled={!!done} checked={picked.includes(t.staffId)} onChange={() => setPicked((p) => (p.includes(t.staffId) ? p.filter((x) => x !== t.staffId) : [...p, t.staffId]))} className="accent-[#1A365D]" />
                <span className="flex-1">
                  <span className="block text-sm font-bold">{t.name}</span>
                  <span className="block text-xs text-on-surface-variant/70">
                    {t.role}
                    {t.room ? ` · ${t.room}` : ""}
                  </span>
                </span>
                {t.meeting ? <Pill tone={MEETING[t.meeting.status]?.tone ?? "neutral"}>{t.meeting.status === "booked" ? `Booked ${showTime(t.meeting.slot)}` : MEETING[t.meeting.status]?.label}</Pill> : <Pill>Walk-in</Pill>}
              </label>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFam(null)}>
              Done
            </Button>
            <Button onClick={checkIn} disabled={!picked.length}>
              Check in for {picked.length} teacher{picked.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Desk() {
  const list = useQuery({ queryKey: ["ptm", "desk-list"], queryFn: ptmApi.deskPtms });
  const [ptmId, setPtmId] = useState("");
  const id = ptmId || list.data?.[0]?.id || "";
  const board = useQuery({ queryKey: ["ptm", "board", id], queryFn: () => ptmApi.board(id), enabled: !!id, refetchInterval: 15_000 });
  if (list.isLoading) return <PageLoader />;
  if (!list.data?.length) return <FormAlert tone="info">No published PTM today or coming up.</FormAlert>;
  const b = board.data;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="PTM" value={id} onChange={setPtmId} options={list.data.map((p) => ({ value: p.id, label: `${p.title} · ${showDay(p.date)}` }))} />
        </div>
        {b && (
          <p className="mt-2 text-sm text-on-surface-variant">
            {showTime(b.ptm.startTime)} – {showTime(b.ptm.endTime)} · now {showTime(b.ptm.now)} · updates every 15 seconds
          </p>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <CheckIn ptmId={id} />
        {!b ? (
          <PageLoader />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {b.teachers.map((t) => (
              <Card key={t.staffId} padding="sm" className={t.away ? "opacity-60" : ""}>
                <div className="flex items-start justify-between gap-2 px-1">
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-xs text-on-surface-variant/70">
                      {t.room ?? "No room"} · {t.met} met of {t.booked} booked
                    </p>
                  </div>
                  {t.away ? <Pill>Away</Pill> : t.waiting.length ? <Pill tone="warning">{t.waiting.length} waiting</Pill> : null}
                </div>
                {t.waiting.length > 0 && (
                  <ol className="mt-2 px-1 space-y-0.5 text-xs">
                    {t.waiting.map((w, i) => (
                      <li key={w.id} className="font-semibold text-amber-800">
                        {i + 1}. {w.student} {w.slot ? `(${showTime(w.slot)})` : "(walk-in)"}
                      </li>
                    ))}
                  </ol>
                )}
                {t.next.length > 0 && (
                  <p className="mt-2 px-1 text-xs text-on-surface-variant">
                    Next: {t.next.map((n) => `${showTime(n.slot)} ${n.student}`).join(" · ")}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PtmDeskPage() {
  return (
    <RequirePermission permission={["ptm.desk", "ptm.manage"]}>
      <PageHeader title="PTM Desk" description="Check families in as they arrive (walk-ins too); see who is waiting for which teacher." />
      <Desk />
    </RequirePermission>
  );
}
