"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Balance, dayCount, leaveApi } from "@/lib/api/leave";
import { ApplyLeave } from "@/components/leave/ApplyLeave";
import { LeaveTable } from "@/components/leave/LeaveTable";

/** One leave type's balance: what is left big, how it is made up small. */
function BalanceCard({ b }: { b: Balance }) {
  const parts = [
    b.credited ? `${b.credited} given` : null,
    b.carried ? `${b.carried} carried` : null,
    b.adjusted ? `${b.adjusted > 0 ? "+" : ""}${b.adjusted} adjusted` : null,
    b.isCompOff ? `${b.earned} earned` : null,
    `${b.taken} taken`,
    b.pending ? `${b.pending} waiting` : null,
  ].filter(Boolean);
  return (
    <Card padding="sm" className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{b.name}</span>
      {b.unlimited ? (
        <span className="text-2xl font-extrabold text-on-surface">
          {b.taken}
          <span className="text-xs font-bold text-on-surface-variant/60 ml-1">taken</span>
        </span>
      ) : (
        <span className={`text-3xl font-extrabold ${b.available <= 0 ? "text-error" : "text-primary"}`}>
          {b.available}
          <span className="text-xs font-bold text-on-surface-variant/60 ml-1">left</span>
        </span>
      )}
      <span className="text-[11px] text-on-surface-variant/70">{parts.join(" · ")}</span>
    </Card>
  );
}

function Mine() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState("");
  const [asking, setAsking] = useState(false);
  const years = useQuery({ queryKey: ["leave-years"], queryFn: leaveApi.years });
  const data = useQuery({ queryKey: ["my-leave", year], queryFn: () => leaveApi.mine(year || undefined) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-leave"] });
  const d = data.data;
  const waiting = d?.leaves.filter((l) => l.status === "pending") ?? [];

  return (
    <>
      <PageHeader
        title="My Leave"
        description={d ? `Your leave for ${d.year.name}.${d.staff.reportsTo ? ` Requests go to ${d.staff.reportsTo}.` : ""}` : "Your leave balance and requests."}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            {years.data && (
              <Select
                value={year || years.data.current.start}
                onChange={setYear}
                options={years.data.years.map((y) => ({ value: y.start, label: `Leave year ${y.name}` }))}
                className="w-full sm:w-56"
              />
            )}
            <Button onClick={() => setAsking(true)} disabled={!d?.types.length}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Ask for leave
            </Button>
          </div>
        }
      />
      {data.isError && <FormAlert>{errorMessage(data.error)}</FormAlert>}
      {!d && !data.isError && <PageLoader />}
      {d && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {d.balances.map((b) => (
              <BalanceCard key={b.typeId} b={b} />
            ))}
          </div>
          {waiting.length > 0 && (
            <FormAlert tone="info">
              {waiting.length} request{waiting.length === 1 ? "" : "s"} waiting for approval ({dayCount(waiting.reduce((a, l) => a + l.days, 0))}).
            </FormAlert>
          )}
          <Card padding="none" className="overflow-hidden">
            <h3 className="px-5 pt-5 text-sm font-black uppercase tracking-widest text-primary">My requests</h3>
            <LeaveTable leaves={d.leaves} empty="No leave this year." onChanged={refresh} />
          </Card>
        </div>
      )}
      {asking && d && <ApplyLeave types={d.types} onClose={() => setAsking(false)} onDone={refresh} />}
    </>
  );
}

export default function MyLeavePage() {
  return (
    <RequirePermission permission="leave.apply">
      <Mine />
    </RequirePermission>
  );
}
