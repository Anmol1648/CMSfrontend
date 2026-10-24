"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { IncidentDetail, RecordForm } from "@/components/discipline/DisciplineParts";
import { disciplineApi, SEVERITY, when } from "@/lib/api/discipline";
import { cn } from "@/lib/utils";

function Pending({ onOpen }: { onOpen: (id: string) => void }) {
  const q = useQuery({ queryKey: ["discipline", "pending"], queryFn: disciplineApi.pending });
  if (!q.data?.length) return null;
  return (
    <Card>
      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Waiting for your approval</p>
      <ul className="mt-2 space-y-2">
        {q.data.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.incidentId)} className="w-full text-left rounded-xl bg-amber-50 px-4 py-2.5 hover:bg-amber-100">
              <p className="text-sm font-bold">
                {p.action} · {p.student}
                {p.fromDate ? ` · ${p.fromDate}${p.toDate ? ` – ${p.toDate}` : ""}` : ""}
              </p>
              <p className="text-xs text-on-surface-variant">
                {p.title} · proposed by {p.by}
                {p.note ? ` · ${p.note}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function List() {
  const { can } = useAuth();
  const [kind, setKind] = useState("incidents");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [recording, setRecording] = useState<"incident" | "positive" | null>(null);
  const q = useQuery({ queryKey: ["discipline", "list", kind, severity, status, type, search, from, to, page], queryFn: () => disciplineApi.list({ kind, severity, status, type, search: search.trim(), from, to, page }), placeholderData: keepPreviousData });
  const reset = () => setPage(1);
  return (
    <div className="space-y-4">
      {can("discipline.approve") && <Pending onOpen={setOpen} />}
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["incidents", "Incidents"],
          ["positive", "Positive notes"],
          ["all", "All"],
        ].map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setKind(v); reset(); }} className={cn("rounded-full px-4 py-1.5 text-sm font-bold", kind === v ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant")}>
            {l}
          </button>
        ))}
        {can("discipline.record") && (
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => setRecording("positive")}>
              🌟 Positive note
            </Button>
            <Button onClick={() => setRecording("incident")}>Record an incident</Button>
          </div>
        )}
      </div>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Input label="Find a student" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} icon="search" />
          <MasterSelect master="incident_type" label="Type" value={type} onChange={(t) => { setType(t); reset(); }} placeholder="Any type" />
          <Select label="Severity" value={severity} onChange={(s) => { setSeverity(s); reset(); }} options={[{ value: "", label: "Any" }, { value: "minor", label: "Minor" }, { value: "moderate", label: "Moderate" }, { value: "serious", label: "Serious" }]} />
          <Select label="Status" value={status} onChange={(s) => { setStatus(s); reset(); }} options={[{ value: "", label: "Any" }, { value: "open", label: "Open" }, { value: "resolved", label: "Settled" }, { value: "pending", label: "Action waiting approval" }]} />
          <Input label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} />
          <Input label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.rows.length ? (
        <FormAlert tone="info">Nothing here.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/10">
            {q.data.rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r.id)} className="w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-2xl" style={{ color: r.positive ? "#2F855A" : r.severity === "serious" ? "#C53030" : r.severity === "moderate" ? "#C05621" : "#718096" }}>
                    {r.positive ? "star" : "report"}
                  </span>
                  <div className="flex-1 min-w-[12rem]">
                    <p className="text-sm font-bold">{r.title}</p>
                    <p className="text-xs text-on-surface-variant/70">
                      {r.students.join(", ")} · {when(r.occurredAt)}
                      {r.actions ? ` · ${r.actions} action${r.actions === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  {r.pending > 0 && <Pill tone="warning">Approval needed</Pill>}
                  {!r.positive && <Pill tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</Pill>}
                  {!r.positive && <Pill tone={r.status === "open" ? "warning" : "success"}>{r.status === "open" ? "Open" : "Settled"}</Pill>}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-on-surface-variant/60">{q.data.total} records</p>
            {q.data.total > q.data.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />}
          </div>
        </Card>
      )}
      {open && <IncidentDetail id={open} onClose={() => setOpen(null)} />}
      {recording && <RecordForm positive={recording === "positive"} onClose={(id) => { setRecording(null); if (id) setOpen(id); }} />}
    </div>
  );
}

export default function DisciplinePage() {
  return (
    <RequirePermission permission={["discipline.view", "discipline.record"]}>
      <PageHeader title="Discipline" description="Incidents and positive notes: who was involved, what was done, whether parents were told. Click a student’s name for their conduct history." />
      <List />
    </RequirePermission>
  );
}
