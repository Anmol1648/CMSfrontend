"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { showDay, todayIST } from "@/lib/api/attendance";
import { leaveApi, leaveDates } from "@/lib/api/leave";
import { ApplyLeave } from "@/components/leave/ApplyLeave";
import { LeaveTable } from "@/components/leave/LeaveTable";

/** Who is away on a day (approved), and who has asked for it. */
function AwayToday() {
  const [date, setDate] = useState(todayIST());
  const away = useQuery({ queryKey: ["leave-away", date], queryFn: () => leaveApi.away(date) });
  const a = away.data;
  const approved = a?.away.filter((x) => x.status === "approved") ?? [];
  const asked = a?.away.filter((x) => x.status === "pending") ?? [];
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary">
          Away {date === todayIST() ? "today" : `on ${showDay(date)}`}
          {a && <span className="ml-2 text-on-surface-variant/60">({approved.length})</span>}
        </h3>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayIST())} className="!py-2" />
      </div>
      {a?.dayOff && <p className="text-sm text-on-surface-variant/70">Not a working day: {a.dayOff}.</p>}
      {a && !a.dayOff && !a.away.length && <p className="text-sm text-on-surface-variant/70">Nobody is on leave.</p>}
      <div className="flex flex-wrap gap-2">
        {approved.map((x) => (
          <span key={x.staffId + x.from} className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <b>{x.name}</b> · {x.code}
            {x.half ? ` (${x.half} half)` : ""} · {leaveDates(x)}
          </span>
        ))}
        {asked.map((x) => (
          <span key={x.staffId + x.from} className="rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <b>{x.name}</b> · {x.code} · asked
          </span>
        ))}
      </div>
    </Card>
  );
}

function Register() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [recording, setRecording] = useState(false);
  const types = useQuery({ queryKey: ["leave-types"], queryFn: leaveApi.types });
  const list = useQuery({ queryKey: ["leave-register", from, to, status, type, search], queryFn: () => leaveApi.register({ from, to, status, type, search }) });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["leave-register"] });
    queryClient.invalidateQueries({ queryKey: ["leave-away"] });
  };
  const active = (types.data ?? []).filter((t) => t.isActive);

  return (
    <>
      <PageHeader
        title="Leave Register"
        description="Everyone’s leave. Leave recorded here by the office is approved straight away."
        actions={
          can("leave.manage") ? (
            <Button variant="secondary" onClick={() => setRecording(true)} disabled={!active.length}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Record leave
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-6">
        <AwayToday />
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Waiting" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Not approved" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
            <Select label="Leave" value={type} onChange={setType} options={[{ value: "", label: "All" }, ...(types.data ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
            <Input label="Staff member" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or code" icon="search" />
          </div>
          {list.data && (
            <p className="mt-3 text-xs text-on-surface-variant/70">
              {showDay(list.data.from, { day: "numeric", month: "short", year: "numeric" })} – {showDay(list.data.to, { day: "numeric", month: "short", year: "numeric" })} · {list.data.leaves.length} leave
              {list.data.leaves.length === 1 ? "" : "s"}
              {list.data.leaves.length >= 500 && <Pill tone="warning">first 500</Pill>}
            </p>
          )}
        </Card>
        {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
        {!list.data && !list.isError && <PageLoader />}
        {list.data && (
          <Card padding="none" className="overflow-hidden">
            <LeaveTable leaves={list.data.leaves} showStaff empty="No leave in this period." onChanged={refresh} />
          </Card>
        )}
      </div>
      {recording && <ApplyLeave forSomeone types={active.map((t) => ({ id: t.id, name: t.name, halfDay: t.halfDay, certificateAfter: null }))} onClose={() => setRecording(false)} onDone={refresh} />}
    </>
  );
}

export default function LeaveRegisterPage() {
  return (
    <RequirePermission permission="leave.view">
      <Register />
    </RequirePermission>
  );
}
