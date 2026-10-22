"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { LeaveBox } from "@/components/attendance/LeaveBox";
import { AttendanceMonth } from "@/components/attendance/AttendanceMonth";
import { attendanceApi, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

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

  return (
    <>
      <PageHeader title={`Attendance · ${d.student.name}`} description={`${d.student.section ?? "Not in a section"}${d.student.roll ? ` · Roll ${d.student.roll}` : ""} · ${d.student.admissionNo}`} />
      {d.children.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select label="Child" value={d.student.id} onChange={setStudent} options={d.children.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
      )}
      <AttendanceMonth data={d} month={month} onMonth={setMonth} />
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
