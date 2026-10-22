"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { LeaveBox } from "@/components/attendance/LeaveBox";
import { attendanceApi, statusTone, Summary, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shiftMonth = (m: string, by: number) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

function Stat({ title, s, min }: { title: string; s: Summary; min: number }) {
  const low = s.percent !== null && s.percent < min;
  return (
    <Card>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{title}</p>
      <p className={cn("text-4xl font-black mt-1", s.percent === null ? "text-on-surface-variant/50" : low ? "text-error" : "text-emerald-700")}>{s.percent === null ? "—" : `${s.percent}%`}</p>
      <p className="text-xs text-on-surface-variant mt-2">
        {s.present} present · {s.absent} absent{s.excused ? ` · ${s.excused} on leave` : ""} · of {s.days} day{s.days === 1 ? "" : "s"}
      </p>
      {low && <p className="text-xs font-bold text-error mt-1">Below the school’s minimum of {min}%</p>}
    </Card>
  );
}

function Mine() {
  const [student, setStudent] = useState("");
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const q = useQuery({ queryKey: ["my-attendance", student, month], queryFn: () => attendanceApi.mine({ ...(student ? { student } : {}), month }), placeholderData: keepPreviousData });
  const d = q.data;

  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!d) return <PageLoader />;
  if (!d.student)
    return (
      <>
        <PageHeader title="Attendance" />
        <Card>No student is linked to your login yet. Ask the school office.</Card>
      </>
    );

  const first = d.days![0].date;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells = [...Array.from({ length: lead }, () => null), ...d.days!];

  return (
    <>
      <PageHeader title={`Attendance · ${d.student.name}`} description={`${d.student.section ?? "Not in a section"}${d.student.roll ? ` · Roll ${d.student.roll}` : ""} · ${d.student.admissionNo}`} />
      {d.children.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select label="Child" value={d.student.id} onChange={setStudent} options={d.children.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Stat title={monthName(d.month!)} s={d.monthSummary!} min={d.minPercent!} />
        <Stat title={`Session ${d.yearSummary!.year} so far`} s={d.yearSummary!} min={d.minPercent!} />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Button variant="secondary" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <span className="material-symbols-outlined align-middle">chevron_left</span>
          </Button>
          <h3 className="font-black text-primary">{monthName(d.month!)}</h3>
          <Button variant="secondary" disabled={month >= todayIST().slice(0, 7)} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <span className="material-symbols-outlined align-middle">chevron_right</span>
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK.map((w) => (
            <div key={w} className="text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 pb-1">
              {w}
            </div>
          ))}
          {cells.map((c, i) =>
            !c ? (
              <div key={`x${i}`} />
            ) : (
              <div
                key={c.date}
                title={c.off ?? c.marks.map((m) => `${m.name}${m.note ? `: ${m.note}` : ""}`).join(" / ")}
                className={cn("aspect-square rounded-xl border p-1.5 flex flex-col justify-between text-xs", c.off ? "bg-surface-container-low/60 border-transparent text-on-surface-variant/50" : c.marks.length ? statusTone(c.marks[0].code) : "border-outline-variant/20")}
              >
                <span className="font-bold">{Number(c.date.slice(8))}</span>
                <span className="text-center font-black">{c.off ? (c.off.startsWith("Weekly") || c.off.endsWith("Saturday off") ? "" : "H") : c.marks.map((m) => m.code).join("/") || (c.future ? "" : "·")}</span>
              </div>
            )
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-4">
          {d.statuses!.map((s) => `${s.code} ${s.name}`).join(" · ")} · H holiday · grey: no school
        </p>
      </Card>
      <LeaveBox studentId={d.student.id} studentName={d.student.name} />
    </>
  );
}

export default function MyAttendancePage() {
  return (
    <RequirePermission permission="attendance.mine">
      <Mine />
    </RequirePermission>
  );
}
