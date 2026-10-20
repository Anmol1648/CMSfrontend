"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { Tabs } from "@/components/ui/Tabs";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { feesApi, PAYMENT_MODES, rupees } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Bar({ value, max, tone = "bg-primary" }: { value: number; max: number; tone?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-container-low overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { key: string; name: string; amount: number; count?: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">{title}</h3>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[9rem_1fr_7rem] items-center gap-3 text-sm">
              <span className="font-semibold truncate">{r.name}</span>
              <Bar value={r.amount} max={max} />
              <span className="text-right font-bold">
                {rupees(r.amount)}
                {r.count != null && <span className="block text-[10px] font-normal text-on-surface-variant/60">{r.count} receipts</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant/70">Nothing.</p>
      )}
    </Card>
  );
}

function Collection() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const report = useQuery({ queryKey: ["fee-collection", from, to], queryFn: () => feesApi.collection(from, to), enabled: !!from && !!to });
  const r = report.data;
  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {[
              ["Today", today(), today()],
              ["This month", today().slice(0, 8) + "01", today()],
              ["Last 7 days", new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10), today()],
            ].map(([label, f, t]) => (
              <button key={label} type="button" onClick={() => { setFrom(f); setTo(t); }} className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-surface-container-low">
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>
      {report.isError && <FormAlert>{errorMessage(report.error)}</FormAlert>}
      {r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Fees collected", rupees(r.total.amount), `${r.total.count} receipts`, "text-emerald-700"],
              ["Registration fees", rupees(r.registrationFees.amount), `${r.registrationFees.count} registrations`, "text-primary"],
              ["Total received", rupees(r.total.amount + r.registrationFees.amount), "fees + registration", "text-primary"],
              ["Cancelled", rupees(r.cancelled.amount), `${r.cancelled.count} receipts (not counted)`, "text-error"],
            ].map(([label, value, sub, tone]) => (
              <Card key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
                <p className={`text-2xl font-black mt-1 ${tone}`}>{value}</p>
                <p className="text-xs text-on-surface-variant/70">{sub}</p>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Breakdown title="By mode (for the cash book)" rows={r.byMode.map((m) => ({ key: m.mode, name: PAYMENT_MODES[m.mode], amount: m.amount, count: m.count }))} />
            <Breakdown title="By fee head" rows={r.byHead.map((h) => ({ key: h.id, name: h.name, amount: h.amount }))} />
            <Breakdown title="By who collected" rows={r.byCollector.map((c) => ({ key: c.id, name: c.name, amount: c.amount, count: c.count }))} />
            <Breakdown title="By class" rows={r.byClass.map((c) => ({ key: c.id, name: c.name, amount: c.amount, count: c.count }))} />
          </div>
          {r.byDay.length > 1 && <Breakdown title="By day" rows={r.byDay.map((d) => ({ key: d.date, name: fmt(d.date), amount: d.amount, count: d.count }))} />}
        </>
      )}
    </div>
  );
}

function Classes() {
  const [year, setYear] = useState("");
  const report = useQuery({ queryKey: ["fee-class-summary", year], queryFn: () => feesApi.classSummary(year), enabled: !!year });
  const r = report.data;
  return (
    <div className="space-y-6">
      <Card>
        <div className="max-w-xs">
          <YearSelect value={year} onChange={setYear} />
        </div>
      </Card>
      {report.isError && <FormAlert>{errorMessage(report.error)}</FormAlert>}
      {report.isLoading && <p className="text-sm text-on-surface-variant">Working out every student&apos;s fees…</p>}
      {r && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                  <th className="px-5 py-3 font-bold">Class</th>
                  <th className="px-5 py-3 font-bold text-right">Students</th>
                  <th className="px-5 py-3 font-bold text-right">Fees this year</th>
                  <th className="px-5 py-3 font-bold text-right">Collected</th>
                  <th className="px-5 py-3 font-bold w-40">Collected %</th>
                  <th className="px-5 py-3 font-bold text-right">Overdue</th>
                  <th className="px-5 py-3 font-bold text-right">Defaulters</th>
                  <th className="px-5 py-3 font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {[...r.classes, { id: "total", name: "All classes", ...r.totals }].map((c) => {
                  const pct = c.net ? Math.round((c.paid / c.net) * 100) : 0;
                  return (
                    <tr key={c.id} className={`border-t border-outline-variant/10 ${c.id === "total" ? "font-black bg-surface-container-low/60" : ""}`}>
                      <td className="px-5 py-2.5 font-semibold">{c.name}</td>
                      <td className="px-5 py-2.5 text-right">{c.students}</td>
                      <td className="px-5 py-2.5 text-right">{rupees(c.net)}</td>
                      <td className="px-5 py-2.5 text-right text-emerald-700">{rupees(c.paid)}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <Bar value={c.paid} max={c.net} tone="bg-emerald-600" />
                          <span className="text-xs w-9 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-right text-error">{rupees(c.overdue)}</td>
                      <td className="px-5 py-2.5 text-right">{c.defaulters}</td>
                      <td className="px-5 py-2.5 text-right">{rupees(c.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Reports() {
  const [tab, setTab] = useState("collection");
  return (
    <>
      <PageHeader title="Fee reports" description="Money received (the day book) and how much each class has paid." />
      <Tabs
        tabs={[
          { id: "collection", label: "Collection" },
          { id: "classes", label: "Class summary" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <div className="mt-6">{tab === "collection" ? <Collection /> : <Classes />}</div>
    </>
  );
}

export default function FeeReportsPage() {
  return (
    <RequirePermission permission="fee.reports">
      <Reports />
    </RequirePermission>
  );
}
