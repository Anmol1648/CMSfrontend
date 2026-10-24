"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { accApi, fyStartISO, inr, todayISO } from "@/lib/api/accounts";
import { cn } from "@/lib/utils";

type Amt = { name: string; group?: string; amount: number };

function Side({ title, rows, total }: { title: string; rows: Amt[]; total: number }) {
  const groups = Array.from(new Set(rows.map((r) => r.group ?? "")));
  return (
    <Card padding="sm">
      <p className="font-extrabold mb-2">{title}</p>
      {groups.map((g) => (
        <div key={g} className="mb-2">
          {g && <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/70">{g}</p>}
          <ul className="text-sm">
            {rows.filter((r) => (r.group ?? "") === g).map((r, i) => (
              <li key={i} className="flex justify-between gap-3 py-0.5">
                <span>{r.name}</span>
                <span className={cn(r.amount < 0 && "text-error")}>{inr(r.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="flex justify-between border-t pt-2 font-extrabold">
        <span>Total</span>
        <span>{inr(total)}</span>
      </p>
    </Card>
  );
}

function Period({ children }: { children: (from: string, to: string) => React.ReactNode }) {
  const [from, setFrom] = useState(fyStartISO());
  const [to, setTo] = useState(todayISO());
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 max-w-md">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {children(from, to)}
    </div>
  );
}

function TB() {
  const [asOf, setAsOf] = useState(todayISO());
  const q = useQuery({ queryKey: ["accounts", "tb", asOf], queryFn: () => accApi.trialBalance(asOf) });
  return (
    <div className="space-y-4">
      <Input label="As on" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="max-w-[12rem]" />
      {q.isLoading ? <PageLoader /> : q.error ? <FormAlert>{errorMessage(q.error)}</FormAlert> : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th className="px-5 py-2">Ledger</th>
                <th className="px-2 py-2">Group</th>
                <th className="px-2 py-2 text-right">Debit</th>
                <th className="px-5 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {q.data!.rows.map((r) => (
                <tr key={r.id} className="border-t border-outline-variant/15">
                  <td className="px-5 py-1.5">{r.name}</td>
                  <td className="px-2 py-1.5 text-xs text-on-surface-variant">{r.top} · {r.group}</td>
                  <td className="px-2 py-1.5 text-right">{r.dr ? inr(r.dr) : ""}</td>
                  <td className="px-5 py-1.5 text-right">{r.cr ? inr(r.cr) : ""}</td>
                </tr>
              ))}
              <tr className="border-t font-extrabold bg-surface-container-low">
                <td className="px-5 py-2" colSpan={2}>
                  Total {Math.abs(q.data!.totalDr - q.data!.totalCr) > 0.5 ? <Pill tone="danger">Does not agree: check opening balances</Pill> : <Pill tone="success">Agrees</Pill>}
                </td>
                <td className="px-2 py-2 text-right">{inr(q.data!.totalDr)}</td>
                <td className="px-5 py-2 text-right">{inr(q.data!.totalCr)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function IE({ from, to }: { from: string; to: string }) {
  const q = useQuery({ queryKey: ["accounts", "ie", from, to], queryFn: () => accApi.incomeExpenditure(from, to) });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <Side title="Expenditure" rows={d.expense} total={d.totalExpense} />
        <Side title="Income" rows={d.income} total={d.totalIncome} />
      </div>
      <Card padding="sm">
        <p className={cn("text-lg font-extrabold", d.surplus >= 0 ? "text-emerald-700" : "text-error")}>
          {d.surplus >= 0 ? "Surplus" : "Deficit"} of the period: {inr(Math.abs(d.surplus))}
        </p>
      </Card>
    </div>
  );
}

function BS() {
  const [asOf, setAsOf] = useState(todayISO());
  const q = useQuery({ queryKey: ["accounts", "bs", asOf], queryFn: () => accApi.balanceSheet(asOf) });
  return (
    <div className="space-y-4">
      <Input label="As on" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="max-w-[12rem]" />
      {q.isLoading ? <PageLoader /> : q.error ? <FormAlert>{errorMessage(q.error)}</FormAlert> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Side title="Liabilities and funds" rows={q.data!.liabilities} total={q.data!.totalLiabilities} />
            <Side title="Assets" rows={q.data!.assets} total={q.data!.totalAssets} />
          </div>
          {Math.abs(q.data!.difference) > 0.5 && <FormAlert tone="warning">The two sides differ by {inr(q.data!.difference)}: the opening balances don’t agree (Chart of Accounts → Opening balances).</FormAlert>}
        </>
      )}
    </div>
  );
}

function RP({ from, to }: { from: string; to: string }) {
  const q = useQuery({ queryKey: ["accounts", "rp", from, to], queryFn: () => accApi.receiptsPayments(from, to) });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <Side title="Opening cash and bank" rows={d.opening} total={d.openingTotal} />
        <Side title="Receipts" rows={d.receipts} total={d.totalReceipts} />
      </div>
      <div className="space-y-3">
        <Side title="Payments" rows={d.payments} total={d.totalPayments} />
        <Card padding="sm">
          <p className="flex justify-between font-extrabold">
            <span>Closing cash and bank</span>
            <span>{inr(d.closing)}</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

function Budget() {
  const q = useQuery({ queryKey: ["accounts", "budget", fyStartISO()], queryFn: () => accApi.budget(fyStartISO()) });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  return (
    <Card padding="none">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
            <th className="px-5 py-2">Expense</th>
            <th className="px-2 py-2 text-right">Budget</th>
            <th className="px-2 py-2 text-right">Spent</th>
            <th className="px-2 py-2 w-40">Used</th>
            <th className="px-5 py-2 text-right">Left</th>
          </tr>
        </thead>
        <tbody>
          {q.data!.map((r) => (
            <tr key={r.ledgerId} className="border-t border-outline-variant/15">
              <td className="px-5 py-1.5">
                {r.name} <span className="text-xs text-on-surface-variant">· {r.group}</span>
              </td>
              <td className="px-2 py-1.5 text-right">{r.budget ? inr(r.budget) : "—"}</td>
              <td className="px-2 py-1.5 text-right">{inr(r.actual)}</td>
              <td className="px-2 py-1.5">
                {r.used != null && (
                  <div className="h-2 rounded-full bg-surface-container">
                    <div className={cn("h-2 rounded-full", r.used > 100 ? "bg-red-500" : r.used > 80 ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.min(100, r.used)}%` }} />
                  </div>
                )}
              </td>
              <td className={cn("px-5 py-1.5 text-right", r.left < 0 && "text-error font-bold")}>{r.budget ? inr(r.left) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Payables() {
  const q = useQuery({ queryKey: ["accounts", "payables"], queryFn: accApi.payables });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data!.length) return <FormAlert tone="info">Nothing owed to vendors.</FormAlert>;
  return (
    <Card padding="none" className="max-w-2xl">
      <ul className="divide-y divide-outline-variant/15 text-sm">
        {q.data!.map((p) => (
          <li key={p.ledgerId} className="flex justify-between px-5 py-2">
            <span>{p.name}</span>
            <b>{inr(p.owed)}</b>
          </li>
        ))}
      </ul>
      <p className="px-5 py-2 text-xs text-on-surface-variant">Pay a vendor with a payment voucher: debit the vendor, credit the bank.</p>
    </Card>
  );
}

function Statements() {
  const [tab, setTab] = useState("tb");
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "tb", label: "Trial balance" }, { id: "ie", label: "Income & expenditure" }, { id: "bs", label: "Balance sheet" }, { id: "rp", label: "Receipts & payments" }, { id: "budget", label: "Budget vs actual" }, { id: "pay", label: "Owed to vendors" }]} activeTab={tab} onChange={setTab} />
      {tab === "tb" && <TB />}
      {tab === "ie" && <Period>{(f, t) => <IE from={f} to={t} />}</Period>}
      {tab === "bs" && <BS />}
      {tab === "rp" && <Period>{(f, t) => <RP from={f} to={t} />}</Period>}
      {tab === "budget" && <Budget />}
      {tab === "pay" && <Payables />}
      <p className="text-xs text-on-surface-variant">These are also in Report Center → Accounts as PDF / Excel.</p>
    </div>
  );
}

export default function AccountStatementsPage() {
  return (
    <RequirePermission permission="accounts.view">
      <PageHeader title="Financial Statements" description="Trial balance, income and expenditure, balance sheet, receipts and payments, budget against actual and what is owed to vendors." />
      <Statements />
    </RequirePermission>
  );
}
