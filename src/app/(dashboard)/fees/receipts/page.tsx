"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { academicApi } from "@/lib/api/academic";
import { feesApi, PAYMENT_MODES, PaymentMode, ReceiptListQuery, rupees } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";

const PAGE_SIZE = 50;
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

function Receipts() {
  const router = useRouter();
  const { showToast } = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [mode, setMode] = useState<PaymentMode | "">("");
  const [status, setStatus] = useState<"active" | "cancelled" | "">("");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [from, to, mode, status, classId, debounced]);

  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const query: ReceiptListQuery = { page, pageSize: PAGE_SIZE, from, to, mode, status, class: classId, search: debounced };
  const list = useQuery({ queryKey: ["fee-receipts", query], queryFn: () => feesApi.receipts(query), placeholderData: keepPreviousData });
  const rows = list.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Fee receipts"
        description="Every receipt, at the counter and online. A receipt is never edited: cancel it and make a new one."
        actions={
          <Button variant="secondary" onClick={() => feesApi.exportReceipts(query).catch((err) => showToast(errorMessage(err), "error"))}>
            Export
          </Button>
        }
      />
      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 p-5 border-b border-outline-variant/20">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select label="Mode" value={mode} onChange={(v) => setMode(v as PaymentMode | "")} options={[{ value: "", label: "All" }, ...(Object.keys(PAYMENT_MODES) as PaymentMode[]).map((m) => ({ value: m, label: PAYMENT_MODES[m] }))]} />
          <Select label="Class" value={classId} onChange={setClassId} options={[{ value: "", label: "All" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Status" value={status} onChange={(v) => setStatus(v as "active" | "cancelled" | "")} options={[{ value: "", label: "All" }, { value: "active", label: "Valid" }, { value: "cancelled", label: "Cancelled" }]} />
        </div>
        <div className="px-5 py-3 border-b border-outline-variant/20">
          <Input placeholder="Search receipt no, cheque / transaction no, student name or admission no" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
        </div>
        {list.isError && (
          <div className="p-5">
            <FormAlert>{errorMessage(list.error)}</FormAlert>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="px-5 py-3 font-bold">Receipt</th>
                <th className="px-5 py-3 font-bold">Student</th>
                <th className="px-5 py-3 font-bold">For</th>
                <th className="px-5 py-3 font-bold">Mode</th>
                <th className="px-5 py-3 font-bold text-right">Amount</th>
                <th className="px-5 py-3 font-bold">Collected by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/fees/receipts/${r.id}`)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="font-mono font-bold text-primary">{r.receiptNo}</p>
                    <p className="text-xs text-on-surface-variant/70">{new Date(`${r.date}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC" })}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{r.student.name}</p>
                    <p className="text-xs text-on-surface-variant/70">
                      {r.student.admissionNo} · {r.student.section ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-xs">{r.instalments.map((i) => i.name).join(", ")}</td>
                  <td className="px-5 py-3">
                    {PAYMENT_MODES[r.mode]}
                    {r.reference && <p className="text-[11px] font-mono text-on-surface-variant/70">{r.reference}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-bold">
                    {r.status === "cancelled" ? <span className="line-through text-on-surface-variant/60">{rupees(r.amount)}</span> : rupees(r.amount)}
                    {r.status === "cancelled" && (
                      <div>
                        <Pill tone="danger">Cancelled</Pill>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs">{r.collectedBy ?? "—"}</td>
                </tr>
              ))}
              {list.data && !rows.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-on-surface-variant/70">
                    No receipts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">
            {list.data ? (
              <>
                {list.data.total} receipts · valid total <b className="text-primary">{rupees(list.data.totalAmount)}</b>
              </>
            ) : (
              "Loading…"
            )}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-on-surface-variant/70">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

export default function ReceiptsPage() {
  return (
    <RequirePermission permission="fee.view">
      <Receipts />
    </RequirePermission>
  );
}
