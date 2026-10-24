"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { accApi, drcr, inr, todayISO, VT } from "@/lib/api/accounts";

const monthStart = () => todayISO().slice(0, 8) + "01";

function LedgerBook({ kind }: { kind: "cash" | "bank" | "any" }) {
  const chart = useQuery({ queryKey: ["accounts", "chart"], queryFn: accApi.chart });
  const [ledger, setLedger] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const list = (chart.data?.ledgers ?? []).filter((l) => kind === "any" || l.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
  useEffect(() => {
    if (!ledger && list.length && kind !== "any") setLedger(list[0].id);
  }, [list, ledger, kind]);
  const q = useQuery({ queryKey: ["accounts", "ledger", ledger, from, to], queryFn: () => accApi.ledger(ledger, from, to), enabled: !!ledger });
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Select label={kind === "cash" ? "Cash account" : kind === "bank" ? "Bank account" : "Ledger"} value={ledger} onChange={setLedger} options={[{ value: "", label: "Choose…" }, ...list.map((l) => ({ value: l.id, label: l.name }))]} />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {!ledger ? null : q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <p className="px-5 pt-4 font-extrabold">
            {q.data!.ledger.name} <span className="text-xs font-normal text-on-surface-variant">· {q.data!.ledger.group}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-5 py-2">Date</th>
                  <th className="px-2 py-2">Voucher</th>
                  <th className="px-2 py-2">Against / narration</th>
                  <th className="px-2 py-2 text-right">Debit</th>
                  <th className="px-2 py-2 text-right">Credit</th>
                  <th className="px-5 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-outline-variant/15 bg-surface-container-low">
                  <td className="px-5 py-1.5" colSpan={5}>
                    Opening balance
                  </td>
                  <td className="px-5 py-1.5 text-right font-bold">{drcr(q.data!.opening)}</td>
                </tr>
                {q.data!.rows.map((r, i) => (
                  <tr key={i} className="border-t border-outline-variant/15">
                    <td className="px-5 py-1.5 whitespace-nowrap">{new Date(`${r.date}T00:00:00`).toLocaleDateString("en-IN")}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-xs">{r.number}</span> <Pill tone={VT[r.type].tone}>{VT[r.type].label}</Pill>
                    </td>
                    <td className="px-2 py-1.5 text-xs">
                      {r.against}
                      {r.narration && <span className="block text-on-surface-variant">{r.narration}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">{r.dr ? inr(r.dr) : ""}</td>
                    <td className="px-2 py-1.5 text-right">{r.cr ? inr(r.cr) : ""}</td>
                    <td className="px-5 py-1.5 text-right">{drcr(r.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t border-outline-variant/15 font-extrabold bg-surface-container-low">
                  <td className="px-5 py-2" colSpan={3}>
                    Totals and closing balance
                  </td>
                  <td className="px-2 py-2 text-right">{inr(q.data!.totalDr)}</td>
                  <td className="px-2 py-2 text-right">{inr(q.data!.totalCr)}</td>
                  <td className="px-5 py-2 text-right">{drcr(q.data!.closing)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function DayBook() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const q = useQuery({ queryKey: ["accounts", "daybook", from, to], queryFn: () => accApi.dayBook(from, to) });
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 max-w-md">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data!.length ? (
        <FormAlert tone="info">No vouchers in these days.</FormAlert>
      ) : (
        <div className="space-y-2">
          {q.data!.map((v) => (
            <Card key={v.id} padding="sm">
              <div className="flex flex-wrap items-center gap-2 mb-1 text-sm">
                <span className="w-24">{new Date(`${v.date}T00:00:00`).toLocaleDateString("en-IN")}</span>
                <span className="font-mono text-xs">{v.number}</span>
                <Pill tone={VT[v.type].tone}>{VT[v.type].label}</Pill>
                <span className="flex-1 text-xs text-on-surface-variant">{v.narration}</span>
                <b>{inr(v.total)}</b>
              </div>
              <ul className="text-xs pl-24 space-y-0.5">
                {v.lines.map((l, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={l.cr ? "pl-6 flex-1" : "flex-1"}>
                      {l.cr ? "To " : ""}
                      {l.ledger}
                    </span>
                    <span className="w-28 text-right">{l.dr ? inr(l.dr) : ""}</span>
                    <span className="w-28 text-right">{l.cr ? inr(l.cr) : ""}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Books() {
  const [tab, setTab] = useState("ledger");
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "ledger", label: "Ledger" }, { id: "cash", label: "Cash book" }, { id: "bank", label: "Bank book" }, { id: "day", label: "Day book" }]} activeTab={tab} onChange={setTab} />
      {tab === "ledger" && <LedgerBook key="any" kind="any" />}
      {tab === "cash" && <LedgerBook key="cash" kind="cash" />}
      {tab === "bank" && <LedgerBook key="bank" kind="bank" />}
      {tab === "day" && <DayBook />}
    </div>
  );
}

export default function AccountBooksPage() {
  return (
    <RequirePermission permission="accounts.view">
      <PageHeader title="Books & Ledgers" description="Any ledger’s statement with the running balance, the cash book, bank book and day book." />
      <Books />
    </RequirePermission>
  );
}
