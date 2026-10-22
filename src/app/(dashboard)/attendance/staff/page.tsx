"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { CorrectionRequests } from "@/components/attendance/CorrectionBox";
import { PendingCheckIns } from "@/components/attendance/PendingCheckIns";
import { AuthedPhoto } from "@/components/attendance/AuthedPhoto";
import { attendanceApi, showDay, StaffDay, statusTone, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Person = StaffDay["staff"][number];

function Correct({ person, date, onClose }: { person: Person; date: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const statuses = useQuery({ queryKey: ["attendance-statuses"], queryFn: attendanceApi.statuses });
  const r = person.record;
  const [checkIn, setCheckIn] = useState(r?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(r?.checkOut ?? "");
  const [statusCode, setStatusCode] = useState(r?.status?.code ?? "");
  const [note, setNote] = useState(r?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      const statusId = statusCode ? (statuses.data?.find((s) => s.code === statusCode)?.id ?? null) : null;
      const day = await attendanceApi.correct(person.id, { date, checkIn: checkIn || null, checkOut: checkOut || null, ...(statusCode !== (r?.status?.code ?? "") ? { statusId } : {}), note: note.trim() || undefined });
      queryClient.setQueryData(["staff-day", date], day);
      showToast(`${person.name}: saved`, "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`${person.name} · ${showDay(date)}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Checked in at" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          <Input label="Checked out at" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <Select
          label="Status"
          value={statusCode}
          onChange={setStatusCode}
          options={[{ value: "", label: "From the check-in time (on time / late / half day)" }, ...(statuses.data ?? []).map((s) => ({ value: s.code, label: s.name }))]}
        />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Forgot to check in; on exam duty at another centre" />
        <p className="text-xs text-on-surface-variant">Leave the times empty and choose Leave or Absent for a day not worked.</p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function Staff() {
  const [date, setDate] = useState(todayIST());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Person | null>(null);
  const day = useQuery({ queryKey: ["staff-day", date], queryFn: () => attendanceApi.staffDay(date) });
  const d = day.data;
  const q = search.trim().toLowerCase();
  const rows = (d?.staff ?? []).filter((p) => !q || `${p.name} ${p.employeeCode} ${p.designation ?? ""}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Staff attendance"
        description="Who has checked in and out, who came late, and who is not in. Correct a day when someone forgot to check in or was on duty elsewhere."
        actions={
          <Link href="/reports/staff_attendance_monthly" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Month report
          </Link>
        }
      />
      <PendingCheckIns />
      <CorrectionRequests />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-56">
            <Input label="Date" type="date" value={date} max={todayIST()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          {d && !d.dayOff && (
            <div className="flex flex-wrap gap-6">
              {[
                ["Staff", d.totals.staff, "text-primary"],
                ["Checked in", d.totals.in, "text-emerald-700"],
                ["Late", d.totals.late, d.totals.late ? "text-amber-700" : "text-primary"],
                [d.isToday ? "Not in yet" : "Not in", d.totals.notIn, d.totals.notIn ? "text-error" : "text-primary"],
              ].map(([label, value, tone]) => (
                <div key={label as string}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
                  <p className={`text-2xl font-black ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="ml-auto w-64">
            <Input placeholder="Find a person" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
          </div>
        </div>
      </Card>
      {day.isError && <FormAlert>{errorMessage(day.error)}</FormAlert>}
      {!d && !day.isError && <PageLoader />}
      {d?.dayOff && (
        <div className="mb-4">
          <FormAlert tone="info">{showDay(d.date)} is not a working day: {d.dayOff}.</FormAlert>
        </div>
      )}
      {d && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Designation</th>
                  <th className="px-5 py-3 font-bold">In</th>
                  <th className="px-5 py-3 font-bold">Out</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Note</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const r = p.record;
                  return (
                    <tr key={p.id} className="border-t border-outline-variant/10">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          {r?.photoIn && <AuthedPhoto fileId={r.photoIn} alt={`${p.name} at check-in`} className="h-9 w-9 rounded-full" />}
                          <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-[11px] font-mono text-on-surface-variant/70">{p.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-xs">{p.designation ?? "—"}</td>
                      <td className="px-5 py-2.5 tabular-nums">
                        {r?.checkIn ?? "—"} {r?.late && <span className="ml-1 text-[10px] font-bold uppercase text-amber-700">late</span>}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums">
                        {r?.checkOut ?? "—"} {r?.earlyOut && <span className="ml-1 text-[10px] font-bold uppercase text-orange-700">early</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        {r?.status ? (
                          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", statusTone(r.status.code))}>{r.status.name}</span>
                        ) : d.dayOff || date > todayIST() ? (
                          "—"
                        ) : (
                          <Pill tone={d.isToday ? "warning" : "danger"}>{d.isToday ? "Not in yet" : "Absent"}</Pill>
                        )}
                        {r?.source === "admin" && <span className="ml-2 text-[10px] text-on-surface-variant/60">corrected</span>}
                        {r?.approval === "pending" && (
                          <span className="ml-2" title={(r.reasons ?? []).join(", ")}>
                            <Pill tone="warning">Waiting approval</Pill>
                          </span>
                        )}
                        {r?.approval === "rejected" && (
                          <span className="ml-2">
                            <Pill tone="danger">Rejected</Pill>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-on-surface-variant max-w-[220px]">{r?.note ?? ""}</td>
                      <td className="px-5 py-2.5 text-right">
                        <button type="button" onClick={() => setEditing(p)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                          Correct
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant/70">
                      No staff.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing && <Correct person={editing} date={date} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function StaffAttendancePage() {
  return (
    <RequirePermission permission="attendance.staff">
      <Staff />
    </RequirePermission>
  );
}
