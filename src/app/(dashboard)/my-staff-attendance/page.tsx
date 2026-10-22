"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AttendanceMonth } from "@/components/attendance/AttendanceMonth";
import { attendanceApi, todayIST } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

/** A staff member's own attendance: any month as a calendar or table, with times, leave and totals. */
function Mine() {
  const { can } = useAuth();
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const q = useQuery({ queryKey: ["my-staff-attendance", month], queryFn: () => attendanceApi.myStaffMonth(month), placeholderData: keepPreviousData });
  const d = q.data;
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!d) return <PageLoader />;
  return (
    <>
      <PageHeader
        title="My Attendance"
        description={`${d.staff.name}${d.staff.employeeCode ? ` · ${d.staff.employeeCode}` : ""} · your days, times in and out, and leave`}
        actions={
          <div className="flex flex-wrap gap-4">
            <Link href="/my-check-in" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Check in / out
            </Link>
            {can("leave.apply") && (
              <Link href="/my-leave" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                Ask for leave
              </Link>
            )}
          </div>
        }
      />
      <AttendanceMonth data={{ children: [], student: null, ...d }} month={month} onMonth={setMonth} />
    </>
  );
}

export default function MyStaffAttendancePage() {
  return (
    <RequirePermission permission="attendance.checkin">
      <Mine />
    </RequirePermission>
  );
}
