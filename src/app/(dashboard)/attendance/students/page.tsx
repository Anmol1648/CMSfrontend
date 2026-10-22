"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { AttendanceMonth } from "@/components/attendance/AttendanceMonth";
import { attendanceApi, Summary, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const pct = (s: Summary, min: number) => (
  <span className={cn("font-black tabular-nums", s.percent === null ? "text-on-surface-variant/50" : s.percent < min ? "text-error" : "text-emerald-700")}>{s.percent === null ? "—" : `${s.percent}%`}</span>
);

/** One student's month, opened from the list. */
function OneStudent({ id, onBack }: { id: string; onBack: () => void }) {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const q = useQuery({ queryKey: ["student-attendance", id, month], queryFn: () => attendanceApi.student(id, month), placeholderData: keepPreviousData });
  const d = q.data;
  return (
    <>
      <div className="mb-4">
        <Button variant="secondary" onClick={onBack}>
          <span className="material-symbols-outlined text-lg align-middle mr-1">arrow_back</span>
          All students
        </Button>
      </div>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d?.student && (
        <>
          <PageHeader title={d.student.name} description={`${d.student.section ?? "Not in a section"}${d.student.roll ? ` · Roll ${d.student.roll}` : ""} · ${d.student.admissionNo}`} />
          <AttendanceMonth data={d} month={month} onMonth={setMonth} />
        </>
      )}
    </>
  );
}

function Students() {
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const q = useQuery({
    queryKey: ["attendance-students", section, debounced],
    queryFn: () => attendanceApi.students({ ...(section ? { section } : {}), ...(debounced.length >= 2 ? { search: debounced } : {}) }),
    placeholderData: keepPreviousData,
  });
  const d = q.data;

  if (open) return <OneStudent id={open} onBack={() => setOpen(null)} />;
  const searching = debounced.length >= 2;

  return (
    <>
      <PageHeader title="Student attendance" description="Your class’s attendance this month and this session. Search a student, or click one to see their calendar." />
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-end">
          {d && d.sections.length > 1 ? (
            <Select label="Section" value={section || d.section || ""} onChange={setSection} options={d.sections.map((s) => ({ value: s.id, label: s.label }))} />
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 ml-1 mb-2">Section</p>
              <p className="font-black text-primary text-lg">{d?.sections[0]?.label ?? "—"}</p>
            </div>
          )}
          <Input placeholder="Search a student by name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
        </div>
      </Card>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d && !d.sections.length && <Card>You are not the class teacher of any section in this session, so there are no students to show.</Card>}
      {d && d.sections.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Roll</th>
                  <th className="px-5 py-3 font-bold">Student</th>
                  {searching && <th className="px-5 py-3 font-bold">Section</th>}
                  <th className="px-5 py-3 font-bold text-right">This month</th>
                  <th className="px-5 py-3 font-bold text-right">Session</th>
                  <th className="px-5 py-3 font-bold text-right">Days absent</th>
                  <th className="px-5 py-3 font-bold text-right">On leave</th>
                </tr>
              </thead>
              <tbody>
                {d.students.map((s) => (
                  <tr key={s.id} onClick={() => setOpen(s.id)} className="border-t border-outline-variant/10 cursor-pointer hover:bg-surface-container-low/60">
                    <td className="px-5 py-2.5 tabular-nums text-on-surface-variant">{s.roll ?? "–"}</td>
                    <td className="px-5 py-2.5">
                      <p className="font-semibold text-primary">{s.name}</p>
                      <p className="text-[11px] font-mono text-on-surface-variant/70">{s.admissionNo}</p>
                    </td>
                    {searching && <td className="px-5 py-2.5">{s.section}</td>}
                    <td className="px-5 py-2.5 text-right">{pct(s.month, d.minPercent)}</td>
                    <td className="px-5 py-2.5 text-right">{pct(s.session, d.minPercent)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{s.session.absent || "—"}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{s.session.excused || "—"}</td>
                  </tr>
                ))}
                {!d.students.length && (
                  <tr>
                    <td colSpan={searching ? 7 : 6} className="px-5 py-12 text-center text-on-surface-variant/70">
                      {searching ? "No student matches." : "No students in this section."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">Below {d.minPercent}% is shown in red (System Settings → Attendance).</p>
        </Card>
      )}
    </>
  );
}

export default function StudentAttendancePage() {
  return (
    <RequirePermission permission="attendance.mark">
      <Students />
    </RequirePermission>
  );
}
