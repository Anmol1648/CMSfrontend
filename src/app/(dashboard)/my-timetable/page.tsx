"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { timetableApi } from "@/lib/api/timetable";
import { errorMessage } from "@/lib/api/client";

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Mine() {
  const mine = useQuery({ queryKey: ["my-timetable"], queryFn: timetableApi.mine });
  if (mine.isError) return <FormAlert>{errorMessage(mine.error)}</FormAlert>;
  if (!mine.data) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  const m = mine.data;
  const today = ((new Date().getDay() + 6) % 7) + 1;
  const todayIso = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="My timetable" description={m.published ? m.name : undefined} actions={m.published ? <Button variant="secondary" onClick={() => window.print()}>Print</Button> : undefined} />
      {!m.published && <FormAlert tone="info">The school has not published a timetable yet.</FormAlert>}
      {m.substitutions.length > 0 && (
        <Card className="mb-6 no-print">
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-700 mb-3">Substitution periods for you</h3>
          <table className="w-full text-sm">
            <tbody>
              {m.substitutions.map((s, i) => (
                <tr key={i} className="border-t border-outline-variant/10">
                  <td className="py-2 font-semibold">{s.date === todayIso ? "Today" : fmt(s.date)}</td>
                  <td className="py-2">Period {s.periodNo}</td>
                  <td className="py-2">
                    {s.section}
                    {s.subject ? ` · ${s.subject}` : ""}
                  </td>
                  <td className="py-2 text-xs text-on-surface-variant">in place of {s.for}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <div className="space-y-6 print-area">
        {m.views.map((v, i) => (
          <Card key={i}>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">{v.title}</h3>
            <TimetableGrid days={m.days} entries={v.entries} view={v.kind === "teacher" ? "teacher" : "section"} today={today} />
          </Card>
        ))}
        {m.published && !m.views.length && <FormAlert tone="info">No timetable is linked to your login (not a teacher with periods, nor a student or parent of an enrolled student).</FormAlert>}
      </div>
    </>
  );
}

export default function MyTimetablePage() {
  return (
    <RequirePermission permission="timetable.mine">
      <Mine />
    </RequirePermission>
  );
}
