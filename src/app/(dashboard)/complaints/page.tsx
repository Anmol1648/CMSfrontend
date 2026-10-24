"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { ComplaintDetail, RaiseForm } from "@/components/complaints/ComplaintParts";
import { complaintsApi, PRIORITY, STATUS, when } from "@/lib/api/complaints";
import { cn } from "@/lib/utils";

function Desk() {
  const params = useSearchParams();
  const [show, setShow] = useState("open");
  const [mine, setMine] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(params.get("id"));
  const [taking, setTaking] = useState(false);
  const q = useQuery({ queryKey: ["complaints", "desk", show, mine, overdue, category, priority, search, page], queryFn: () => complaintsApi.desk({ show, mine: mine ? "1" : undefined, overdue: overdue ? "1" : undefined, category, priority, search: search.trim(), page }), placeholderData: keepPreviousData, refetchInterval: 60_000 });
  const d = q.data;
  const reset = () => setPage(1);
  return (
    <div className="space-y-4">
      {d && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Open", d.counts.open, "open", false],
            ["Overdue", d.counts.overdue, "open", true],
            ["Resolved, to close", d.counts.resolved, "resolved", false],
            ["Closed", d.counts.closed, "closed", false],
          ].map(([t, n, s, o]) => (
            <button key={t as string} type="button" onClick={() => { setShow(s as string); setOverdue(o as boolean); reset(); }} className={cn("rounded-2xl bg-surface-container-lowest p-4 shadow-sm text-left hover:shadow-md", show === s && overdue === o && "ring-2 ring-primary/40")}>
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{t as string}</p>
              <p className={cn("text-2xl font-extrabold mt-1", t === "Overdue" && Number(n) > 0 && "text-error")}>{n as number}</p>
            </button>
          ))}
        </div>
      )}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Find" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} placeholder="Ticket, subject, words" icon="search" />
          <MasterSelect master="complaint_category" label="Category" value={category} onChange={(id) => { setCategory(id); reset(); }} placeholder="All categories" />
          <Select label="Priority" value={priority} onChange={(p) => { setPriority(p); reset(); }} options={[{ value: "", label: "Any" }, { value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "normal", label: "Normal" }]} />
          <Select label="Show" value={show} onChange={(s) => { setShow(s); reset(); }} options={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          {d?.manage && <Checkbox checked={mine} onChange={(m) => { setMine(m); reset(); }} label="Only assigned to me" />}
          <Checkbox checked={overdue} onChange={(o) => { setOverdue(o); reset(); }} label="Only overdue" />
          {d?.manage && (
            <Button variant="secondary" className="ml-auto" onClick={() => setTaking(true)}>
              Take a complaint (walk-in / call)
            </Button>
          )}
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !d?.rows.length ? (
        <FormAlert tone="info">No complaints here.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/10">
            {d.rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r.id)} className={cn("w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-container-low", r.overdue && "border-l-4 border-error")}>
                  <div className="flex-1 min-w-[14rem]">
                    <p className="font-bold text-sm">
                      <span className="text-on-surface-variant font-semibold">{r.ticketNo}</span> · {r.subject}
                    </p>
                    <p className="text-xs text-on-surface-variant/70">
                      {r.category} · {r.raisedBy}
                      {r.student ? ` · ${r.student}` : ""} · {when(r.createdAt)} · {r.handler || "not assigned"}
                    </p>
                  </div>
                  {r.priority !== "normal" && <Pill tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Pill>}
                  {r.overdue && <Pill tone="danger">Overdue</Pill>}
                  {r.escalation > 0 && <Pill tone="danger">Escalated</Pill>}
                  <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-on-surface-variant/60">{d.total} complaints</p>
            {d.total > d.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(d.total / d.pageSize)} onPageChange={setPage} />}
          </div>
        </Card>
      )}
      {open && <ComplaintDetail id={open} onClose={() => setOpen(null)} />}
      {taking && <RaiseForm office onClose={(id) => { setTaking(false); if (id) setOpen(id); }} />}
    </div>
  );
}

export default function ComplaintsPage() {
  return (
    <RequirePermission permission={["complaint.handle", "complaint.manage"]}>
      <PageHeader title="Complaints" description="Complaints assigned to you (or all of them, if you manage complaints): reply, keep internal notes, assign, resolve." />
      <Suspense fallback={<PageLoader />}>
        <Desk />
      </Suspense>
    </RequirePermission>
  );
}
