"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { attendanceApi, showDay, statusTone } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function CheckIn() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const clock = useClock();
  const me = useQuery({ queryKey: ["my-check-in"], queryFn: attendanceApi.myDay });
  const m = me.data;

  const act = async (fn: typeof attendanceApi.checkIn, done: string) => {
    try {
      queryClient.setQueryData(["my-check-in"], await fn());
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (me.isError) return <FormAlert>{errorMessage(me.error)}</FormAlert>;
  if (!m) return <PageLoader />;
  const day = m.day;

  return (
    <>
      <PageHeader title="Check in" description={`${m.staff.name} · ${m.staff.employeeCode} · school day ${m.shift.start} – ${m.shift.end}`} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{showDay(m.today, { weekday: "long", day: "numeric", month: "long" })}</p>
            <p className="text-5xl font-black text-primary tabular-nums mt-1">{clock}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              <span>
                In: <b className="tabular-nums">{day?.checkIn ?? "—"}</b>
                {day?.late && <span className="ml-1 text-xs font-bold text-amber-700">late</span>}
              </span>
              <span>
                Out: <b className="tabular-nums">{day?.checkOut ?? "—"}</b>
                {day?.earlyOut && <span className="ml-1 text-xs font-bold text-orange-700">early</span>}
              </span>
              {day?.status && <span className={cn("rounded-full border px-3 py-0.5 text-xs font-bold", statusTone(day.status.code))}>{day.status.name}</span>}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 min-w-[220px]">
            {m.canCheckIn && (
              <Button className="!py-4 !text-lg" onClick={() => act(attendanceApi.checkIn, "Checked in. Have a good day!")}>
                <span className="material-symbols-outlined align-middle mr-2">login</span>
                Check in
              </Button>
            )}
            {m.canCheckOut && (
              <Button variant="secondary" className="!py-4 !text-lg" onClick={() => act(attendanceApi.checkOut, "Checked out. See you tomorrow!")}>
                <span className="material-symbols-outlined align-middle mr-2">logout</span>
                Check out
              </Button>
            )}
            {!m.canCheckIn && !m.canCheckOut && day?.checkOut && <p className="text-sm font-semibold text-emerald-700 text-right">Done for today ✓</p>}
          </div>
        </div>
        {m.reason && (
          <div className="mt-4">
            <FormAlert tone="info">{m.reason}</FormAlert>
          </div>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/20">
          <h3 className="font-black text-primary">This month</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">If a day is wrong (you forgot to check in, or were on duty elsewhere), ask the office to correct it.</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {m.month.map((x) => (
              <tr key={x.date} className={cn("border-t border-outline-variant/10 first:border-t-0", x.off && "text-on-surface-variant/60")}>
                <td className="px-5 py-2 whitespace-nowrap">{showDay(x.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="px-5 py-2 tabular-nums">{x.checkIn ?? "—"}</td>
                <td className="px-5 py-2 tabular-nums">{x.checkOut ?? "—"}</td>
                <td className="px-5 py-2">
                  {x.off ? (
                    <span className="text-xs">{x.off}</span>
                  ) : x.status ? (
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", statusTone(x.status.code))}>{x.status.name}</span>
                  ) : x.date === m.today ? (
                    <span className="text-xs">Not checked in yet</span>
                  ) : (
                    <span className="text-xs font-bold text-error">Absent</span>
                  )}
                  {x.source === "admin" && <span className="ml-2 text-[10px] text-on-surface-variant/60">corrected by the office</span>}
                </td>
                <td className="px-5 py-2 text-xs text-on-surface-variant">{x.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export default function MyCheckInPage() {
  return (
    <RequirePermission permission="attendance.checkin">
      <CheckIn />
    </RequirePermission>
  );
}
