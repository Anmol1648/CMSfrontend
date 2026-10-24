"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { exams2Api, fmtDay } from "@/lib/api/exams2";

function Duties() {
  const q = useQuery({ queryKey: ["exams2", "my-duties"], queryFn: exams2Api.myDuties });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data!.length) return <FormAlert tone="info">No invigilation duty coming up.</FormAlert>;
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  return (
    <Card padding="none" className="max-w-3xl">
      <ul className="divide-y divide-outline-variant/15">
        {q.data!.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className="w-32 font-bold">{fmtDay(d.date)}</span>
            <span className="w-28">
              {d.startTime}
              {d.endTime ? `–${d.endTime}` : ""}
            </span>
            <span className="flex-1">
              <b>{d.room}</b> <span className="text-on-surface-variant">· {d.exam} · {d.students} students</span>
            </span>
            {d.date === today && <Pill tone="warning">Today</Pill>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function MyDutiesPage() {
  return (
    <RequirePermission permission={["exam.marks", "exam.marks_any"]}>
      <PageHeader title="My Invigilation" description="Your exam rooms and times. You are reminded the day before." />
      <Duties />
    </RequirePermission>
  );
}
