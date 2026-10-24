"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { inr, monthName, payrollApi, thisMonth } from "@/lib/api/payroll";

function Loans() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["payroll", "loans"], queryFn: payrollApi.loans });
  const staff = useQuery({ queryKey: ["payroll", "salaries"], queryFn: payrollApi.salaries, enabled: can("payroll.salary") });
  const [f, setF] = useState({ staffId: "", kind: "loan" as "loan" | "advance", amount: "", emi: "", startMonth: thisMonth(), note: "" });
  const [show, setShow] = useState("active");
  const rows = (q.data ?? []).filter((l) => show === "all" || l.status === show);
  return (
    <div className="space-y-4">
      {can("payroll.loans") && (
        <Card>
          <p className="font-bold mb-3">Give a loan or advance</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 items-end">
            {staff.data ? (
              <Select className="lg:col-span-2" label="Staff member" value={f.staffId} onChange={(v) => setF((x) => ({ ...x, staffId: v }))} options={[{ value: "", label: "Choose…" }, ...staff.data.map((s) => ({ value: s.staffId, label: `${s.name} (${s.employeeCode})` }))]} />
            ) : (
              <p className="text-xs text-on-surface-variant lg:col-span-2">Needs “staff salaries” permission to list staff.</p>
            )}
            <Select label="Kind" value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v as "loan" | "advance" }))} options={[{ value: "loan", label: "Loan" }, { value: "advance", label: "Salary advance" }]} />
            <Input label="Amount (₹)" type="number" min={0} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} />
            <Input label="Monthly instalment (₹)" type="number" min={0} value={f.emi} onChange={(e) => setF((x) => ({ ...x, emi: e.target.value }))} />
            <Input label="First instalment" type="month" value={f.startMonth} onChange={(e) => setF((x) => ({ ...x, startMonth: e.target.value }))} />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Input label="Note" value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} maxLength={300} className="flex-1" />
            {Number(f.amount) > 0 && Number(f.emi) > 0 && <span className="text-sm">{Math.ceil(Number(f.amount) / Number(f.emi))} instalments</span>}
            <Button
              disabled={!f.staffId || !(Number(f.amount) > 0) || !(Number(f.emi) > 0)}
              onClick={async () => {
                try {
                  queryClient.setQueryData(["payroll", "loans"], await payrollApi.giveLoan({ staffId: f.staffId, kind: f.kind, amount: Number(f.amount), emi: Number(f.emi), startMonth: f.startMonth, note: f.note || null }));
                  setF({ staffId: "", kind: "loan", amount: "", emi: "", startMonth: thisMonth(), note: "" });
                  showToast("Given: instalments come off the salary from the first month", "success");
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Give
            </Button>
          </div>
        </Card>
      )}
      <Select className="max-w-xs" value={show} onChange={setShow} options={[{ value: "active", label: "Being recovered" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]} />
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th className="px-5 py-2">Staff</th>
                <th className="px-2 py-2">Kind</th>
                <th className="px-2 py-2 text-right">Amount</th>
                <th className="px-2 py-2 text-right">Instalment</th>
                <th className="px-2 py-2 text-right">Recovered</th>
                <th className="px-2 py-2 text-right">Balance</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-outline-variant/15">
                  <td className="px-5 py-2">
                    <b>{l.name}</b>
                    <p className="text-xs text-on-surface-variant">
                      from {monthName(l.startMonth)}
                      {l.note ? ` · ${l.note}` : ""}
                    </p>
                  </td>
                  <td className="px-2 py-2">{l.kind === "advance" ? "Advance" : "Loan"}</td>
                  <td className="px-2 py-2 text-right">{inr(l.amount)}</td>
                  <td className="px-2 py-2 text-right">{inr(l.emi)}</td>
                  <td className="px-2 py-2 text-right">{inr(l.paid)}</td>
                  <td className="px-2 py-2 text-right font-bold">
                    {inr(l.balance)}
                    {l.status === "active" && <p className="text-xs font-normal text-on-surface-variant">{l.left} month(s) left</p>}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {l.status === "closed" ? (
                      <Pill>Closed</Pill>
                    ) : (
                      can("payroll.loans") && (
                        <Button variant="tertiary" onClick={async () => (await confirm({ title: "Close this loan?", message: `The balance ${inr(l.balance)} is treated as settled (paid in cash or waived). No more instalments.`, confirmLabel: "Close" })) && payrollApi.closeLoan(l.id).then((d) => queryClient.setQueryData(["payroll", "loans"], d)).catch((e) => showToast(errorMessage(e), "error"))}>
                          Close
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-on-surface-variant">
                    None.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function PayrollLoansPage() {
  return (
    <RequirePermission permission={["payroll.loans", "payroll.view"]}>
      <PageHeader title="Loans & Advances" description="Loans and salary advances to staff, recovered from each month’s salary until cleared." />
      <Loans />
    </RequirePermission>
  );
}
