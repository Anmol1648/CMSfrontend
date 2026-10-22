"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { attendanceApi, showDay } from "@/lib/api/attendance";
import { ApiError, errorMessage } from "@/lib/api/client";

function Holidays() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [year, setYear] = useState("");
  const list = useQuery({ queryKey: ["holidays", year], queryFn: () => attendanceApi.holidays(year || undefined), enabled: !!year });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [forStudents, setForStudents] = useState(true);
  const [forStaff, setForStaff] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    try {
      const r = await attendanceApi.addHoliday({ from, ...(to && to !== from ? { to } : {}), name: name.trim(), forStudents, forStaff });
      showToast(r.days > 1 ? `${name}: ${r.days} days added` : `${name} added`, "success");
      setFrom("");
      setTo("");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    } catch (err) {
      setError(err instanceof ApiError && err.details.length ? `${err.message}: ${err.details.map((d) => `${d.field} ${d.message}`).join(", ")}` : errorMessage(err));
    }
  };
  const remove = async (id: string, label: string) => {
    if (!(await confirm({ title: `Remove ${label}?`, message: "It becomes a school day again.", confirmLabel: "Remove", danger: true }))) return;
    try {
      await attendanceApi.deleteHoliday(id);
      showToast("Holiday removed", "success");
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const d = list.data;

  return (
    <>
      <PageHeader
        title="Holidays"
        description="Days the school is closed, or has no classes (exams, events). No attendance is taken on them, and they don’t count in the attendance %. Weekly offs and Saturdays off are in System Settings → Attendance."
        actions={
          <Link href="/settings" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Weekly off days
          </Link>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 items-start">
        <Card>
          <h3 className="font-black text-primary mb-4">Add a holiday</h3>
          <div className="space-y-4">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali break, Annual Day" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label="To (for several days)" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-6">
              <Checkbox label="For students" checked={forStudents} onChange={setForStudents} />
              <Checkbox label="For staff" checked={forStaff} onChange={setForStaff} hint="Untick when staff still come in (e.g. exam days)" />
            </div>
            {error && <FormAlert>{error}</FormAlert>}
            <Button onClick={add} disabled={!from || name.trim().length < 2 || (!forStudents && !forStaff)}>
              Add
            </Button>
          </div>
        </Card>
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 border-b border-outline-variant/20">
            <div className="w-64">
              <YearSelect value={year} onChange={setYear} label="Session" />
            </div>
            {d && (
              <div className="flex flex-wrap gap-5">
                {[
                  ["Days", d.counts.days],
                  ["Weekly offs", d.counts.weeklyOff],
                  ["Holidays", d.counts.holidays],
                  ["School days", d.counts.schoolDays],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{l}</p>
                    <p className="text-xl font-black text-primary">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {list.isError && (
            <div className="p-5">
              <FormAlert>{errorMessage(list.error)}</FormAlert>
            </div>
          )}
          {!d && !list.isError && <PageLoader />}
          {d && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {d.holidays.map((h) => (
                  <tr key={h.id} className="border-t border-outline-variant/10 first:border-t-0">
                    <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">{showDay(h.date)}</td>
                    <td className="px-5 py-2.5 font-semibold">{h.name}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex gap-1.5">
                        {h.forStudents && <Pill>Students</Pill>}
                        {h.forStaff && <Pill>Staff</Pill>}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button type="button" onClick={() => remove(h.id, `${h.name} (${showDay(h.date, { day: "numeric", month: "short" })})`)} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {!d.holidays.length && (
                  <tr>
                    <td className="px-5 py-12 text-center text-on-surface-variant/70">No holidays in {d.year.name} yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export default function HolidaysPage() {
  return (
    <RequirePermission permission="attendance.holidays">
      <Holidays />
    </RequirePermission>
  );
}
