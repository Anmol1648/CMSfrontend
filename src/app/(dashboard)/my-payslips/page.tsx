"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { inr, monthName, payrollApi } from "@/lib/api/payroll";

function Mine() {
  const q = useQuery({ queryKey: ["payroll", "mine"], queryFn: payrollApi.mine });
  const [open, setOpen] = useState<{ id: string; label: string } | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="space-y-4 max-w-3xl">
      <Card padding="none">
        <ul className="divide-y divide-outline-variant/15">
          {d.slips.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setOpen({ id: s.id, label: s.label })} className="w-full flex flex-wrap items-center gap-3 px-5 py-3 text-left text-sm hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                <span className="flex-1 font-bold">{s.label}</span>
                <span className="text-xs text-on-surface-variant">
                  {s.paidDays}/{s.totalDays} days · gross {inr(s.gross)} · deductions {inr(s.deducted)}
                </span>
                <b className="w-28 text-right">{inr(s.net)}</b>
              </button>
            </li>
          ))}
          {!d.slips.length && <li className="px-5 py-6 text-center text-sm text-on-surface-variant">No payslips yet. They appear when the school finalises a month’s payroll.</li>}
        </ul>
      </Card>
      {d.loans.length > 0 && (
        <Card>
          <p className="font-bold mb-2">My loans and advances</p>
          <ul className="space-y-1 text-sm">
            {d.loans.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3">
                <span className="flex-1">
                  {l.kind === "advance" ? "Salary advance" : "Loan"} of {inr(l.amount)} from {monthName(l.startMonth)} · {inr(l.emi)} a month
                </span>
                {l.status === "active" ? <b>Balance {inr(l.balance)}</b> : <Pill>Closed</Pill>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {open && <DocumentViewer docKey="payslip" params={{ slip: open.id }} title={`Payslip · ${open.label}`} filename="payslip.pdf" onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function MyPayslipsPage() {
  return (
    <RequirePermission permission="payroll.mine">
      <PageHeader title="My Payslips" description="Your monthly payslips (download or print) and any loan you are repaying." />
      <Mine />
    </RequirePermission>
  );
}
