"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { clock, VISIT_STATUS, visitorsApi } from "@/lib/api/visitors";

const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

function Log() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [purpose, setPurpose] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["visitors", "log", from, to, purpose, status, search, page], queryFn: () => visitorsApi.log({ from, to, purpose, status, search: search.trim(), page }), placeholderData: keepPreviousData });
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <MasterSelect master="visit_purpose" label="Purpose" value={purpose} onChange={(id) => { setPurpose(id); setPage(1); }} placeholder="All purposes" />
          <Select label="State" value={status} onChange={(s) => { setStatus(s); setPage(1); }} options={[{ value: "", label: "All" }, ...Object.entries(VISIT_STATUS).map(([value, v]) => ({ value, label: v.label }))]} />
          <Input label="Find" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, mobile, pass, vehicle" icon="search" />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.rows.length ? (
        <FormAlert tone="info">No visits here.</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3">Visitor</th>
                  <th className="px-4 py-3">Purpose · met</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">In – out</th>
                  <th className="px-4 py-3">State</th>
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((v) => (
                  <tr key={v.id} className="border-b border-outline-variant/10">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <AuthedPhoto path={v.photoFileId ? visitorsApi.visitPhoto(v.id) : null} className="h-10 w-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold">{v.visitor.name}</p>
                          <p className="text-xs text-on-surface-variant/70">
                            {v.visitor.mobile}
                            {v.passNo ? ` · ${v.passNo}` : ""}
                            {v.vehicleNo ? ` · ${v.vehicleNo}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {v.purpose ?? "—"}
                      <span className="block text-on-surface-variant/70">{v.host}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{v.day}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {clock(v.inAt) || "—"} – {clock(v.outAt) || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Pill tone={VISIT_STATUS[v.status].tone}>{VISIT_STATUS[v.status].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-on-surface-variant/60">{q.data.total} visits</p>
            {q.data.total > q.data.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function VisitorLogPage() {
  return (
    <RequirePermission permission="visitor.view">
      <PageHeader title="Visitor Log" description="Every visit: who came, whom they met, why, and when they came and left. Reports → Visitors for more." />
      <Log />
    </RequirePermission>
  );
}
