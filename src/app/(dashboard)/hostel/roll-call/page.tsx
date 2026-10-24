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
import { AuthedPhoto } from "@/components/visitors/Photo";
import { hostelApi, todayISO } from "@/lib/api/hostel";

type Mark = "present" | "absent" | "leave";
const MARKS: { value: Mark; label: string; on: string }[] = [
  { value: "present", label: "P", on: "bg-emerald-600 text-white" },
  { value: "absent", label: "A", on: "bg-red-600 text-white" },
  { value: "leave", label: "L", on: "bg-amber-500 text-white" },
];

function RollCall() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const list = useQuery({ queryKey: ["hostel", "list"], queryFn: hostelApi.list });
  const [hostelId, setHostelId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!hostelId && list.data?.hostels.length) setHostelId(list.data.hostels[0].id);
  }, [hostelId, list.data]);
  const rc = useQuery({ queryKey: ["hostel", "roll", hostelId, date], queryFn: () => hostelApi.rollCall(hostelId, date), enabled: !!hostelId });
  useEffect(() => {
    if (rc.data) setMarks(Object.fromEntries(rc.data.boarders.map((b) => [b.studentId, b.mark])));
  }, [rc.data]);
  if (list.isLoading) return <PageLoader />;
  if (list.error) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data!.hostels.length) return <FormAlert tone="info">You are not the warden of any hostel.</FormAlert>;
  const boarders = rc.data?.boarders ?? [];
  const count = (m: Mark) => Object.values(marks).filter((x) => x === m).length;
  const rooms = Array.from(new Set(boarders.map((b) => b.room)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select className="max-w-xs" label="Hostel" value={hostelId} onChange={setHostelId} options={list.data!.hostels.map((h) => ({ value: h.id, label: h.name }))} />
        <Input label="Night of" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        <div className="flex-1" />
        <Pill tone="success">Present {count("present")}</Pill>
        <Pill tone="danger">Absent {count("absent")}</Pill>
        <Pill tone="warning">Leave {count("leave")}</Pill>
      </div>
      {rc.data?.taken && <FormAlert tone="success">Taken at {new Date(rc.data.takenAt!).toLocaleTimeString("en-IN", { timeStyle: "short" })}. You can change it and save again.</FormAlert>}
      {rc.isLoading ? (
        <PageLoader />
      ) : rc.error ? (
        <FormAlert>{errorMessage(rc.error)}</FormAlert>
      ) : !boarders.length ? (
        <FormAlert tone="info">No boarders in this hostel.</FormAlert>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant="tertiary" onClick={() => setMarks(Object.fromEntries(boarders.map((b) => [b.studentId, b.onLeave ? "leave" : "present"])))}>
              Everyone present (leave kept)
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room} padding="none">
                <p className="border-b border-outline-variant/15 px-4 py-2 text-sm font-bold">Room {room}</p>
                {boarders
                  .filter((b) => b.room === room)
                  .map((b) => (
                    <div key={b.studentId} className="flex items-center gap-3 px-4 py-2">
                      <AuthedPhoto path={b.photo} className="h-9 w-9 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{b.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          Bed {b.bed} · {b.section}
                          {b.onLeave && <span className="text-amber-700"> · on leave</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {MARKS.map((m) => (
                          <button key={m.value} onClick={() => setMarks((x) => ({ ...x, [b.studentId]: m.value }))} className={`h-8 w-8 rounded-lg text-sm font-bold ${marks[b.studentId] === m.value ? m.on : "bg-surface-container text-on-surface-variant"}`}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </Card>
            ))}
          </div>
          <div className="sticky bottom-4 flex justify-end">
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const r = await hostelApi.saveRollCall(hostelId, date, marks);
                  showToast(r.absent ? `Saved. ${r.absent} absent: their parents are told.` : "Saved: everyone accounted for", "success");
                  qc.invalidateQueries({ queryKey: ["hostel", "roll", hostelId, date] });
                } catch (e) {
                  showToast(errorMessage(e), "error");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save roll call
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function RollCallPage() {
  return (
    <RequirePermission permission="hostel.warden">
      <PageHeader title="Night Roll Call" description="Mark every boarder present, absent or on leave. Those on approved leave are marked L for you. Parents of anyone absent are told at once." />
      <RollCall />
    </RequirePermission>
  );
}
