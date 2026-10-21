"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { attendanceApi, showDay, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Today() {
  const { can } = useAuth();
  const [date, setDate] = useState(todayIST());
  const [onlyMissing, setOnlyMissing] = useState(false);
  const day = useQuery({ queryKey: ["attendance-overview", date], queryFn: () => attendanceApi.overview(date) });
  const d = day.data;
  const canMark = can("attendance.mark") || can("attendance.mark_any");
  const rows = (d?.sections ?? []).filter((s) => !onlyMissing || s.slots.some((x) => !x.marked));

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Every section’s register for the day: who has marked it, and how many are absent."
        actions={
          <div className="flex flex-wrap gap-4">
            <Link href={`/reports/attendance_absentees?date=${date}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Absentees list
            </Link>
            <Link href="/reports" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Attendance reports
            </Link>
          </div>
        }
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-56">
            <Input label="Date" type="date" value={date} max={todayIST()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          {d && !d.dayOff && (
            <div className="flex flex-wrap gap-6">
              {[
                ["Sections", d.totals.sections, "text-primary"],
                ["Marked", d.totals.marked, "text-emerald-700"],
                ["Not marked yet", d.totals.notMarked, d.totals.notMarked ? "text-error" : "text-primary"],
              ].map(([label, value, tone]) => (
                <div key={label as string}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
                  <p className={`text-2xl font-black ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="ml-auto">
            <Checkbox label="Only sections not marked yet" checked={onlyMissing} onChange={setOnlyMissing} />
          </div>
        </div>
      </Card>

      {day.isError && <FormAlert>{errorMessage(day.error)}</FormAlert>}
      {!d && !day.isError && <PageLoader />}
      {d?.dayOff && <FormAlert tone="info">{showDay(d.date)} is not a school day: {d.dayOff}.</FormAlert>}
      {d && !d.dayOff && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Section</th>
                  <th className="px-5 py-3 font-bold">Class teacher</th>
                  <th className="px-5 py-3 font-bold text-right">Students</th>
                  {d.slots.map((s) => (
                    <th key={s.value} className="px-5 py-3 font-bold">
                      {d.slots.length > 1 ? s.label : "Register"}
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-outline-variant/10">
                    <td className="px-5 py-3 font-semibold">{s.label}</td>
                    <td className="px-5 py-3">{s.classTeacher ?? <span className="text-amber-700 text-xs font-bold">No class teacher</span>}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{s.students}</td>
                    {s.slots.map((x) => (
                      <td key={x.slot} className="px-5 py-3">
                        {x.marked ? (
                          <div>
                            <div className="flex flex-wrap gap-1.5">
                              <Pill tone="success">{x.present} present</Pill>
                              {x.absent > 0 && <Pill tone="danger">{x.absent} absent</Pill>}
                              {x.leave > 0 && <Pill>{x.leave} leave</Pill>}
                            </div>
                            <p className="text-[11px] text-on-surface-variant/70 mt-1">
                              {x.markedBy ?? "—"} · {time(x.markedAt)}
                            </p>
                          </div>
                        ) : (
                          <Pill tone="warning">Not marked</Pill>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right">
                      {canMark && (
                        <Link href={`/attendance/mark?section=${s.id}&date=${d.date}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                          {s.slots.every((x) => x.marked) ? "Open" : "Mark"}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4 + d.slots.length} className="px-5 py-12 text-center text-on-surface-variant/70">
                      {onlyMissing ? "Every section is marked." : "No sections in the current session."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

export default function AttendanceTodayPage() {
  return (
    <RequirePermission permission="attendance.view">
      <Today />
    </RequirePermission>
  );
}
