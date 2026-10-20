"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { admissionsApi, Tally } from "@/lib/api/admissions";
import { errorMessage } from "@/lib/api/client";

function Bar({ value, max, tone = "bg-primary" }: { value: number; max: number; tone?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-container-low overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function TallyTable({ title, first, rows }: { title: string; first: string; rows: (Tally & { key: string; name: string })[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card padding="none" className="overflow-hidden">
      <h3 className="px-5 pt-5 pb-3 text-sm font-black uppercase tracking-widest text-primary">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-2 font-bold">{first}</th>
              <th className="px-3 py-2 font-bold text-right">Enquiries</th>
              <th className="px-3 py-2 font-bold text-right">Open</th>
              <th className="px-3 py-2 font-bold text-right">Admitted</th>
              <th className="px-3 py-2 font-bold text-right">Lost</th>
              <th className="px-5 py-2 font-bold w-1/4">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-outline-variant/10">
                <td className="px-5 py-2.5 font-semibold">{r.name}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="w-16 hidden md:block">
                      <Bar value={r.total} max={max} />
                    </span>
                    {r.total}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">{r.open}</td>
                <td className="px-3 py-2.5 text-right text-emerald-700 font-bold">{r.won}</td>
                <td className="px-3 py-2.5 text-right text-error">{r.lost}</td>
                <td className="px-5 py-2.5 font-bold">{r.conversion}%</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant/70">
                  No enquiries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Reports() {
  const [year, setYear] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const report = useQuery({ queryKey: ["admission-report", year, from, to], queryFn: () => admissionsApi.report({ year, from, to }), enabled: !!year });
  const r = report.data;
  const month = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title="Admission reports"
        description="Where enquiries come from, how many become admissions, why the others are lost, and the seats left per class."
        actions={
          <Link href="/admissions" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Enquiries
          </Link>
        }
      />
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <YearSelect value={year} onChange={setYear} />
          <Input label="Enquired from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Enquired until" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {report.isError && <FormAlert>{errorMessage(report.error)}</FormAlert>}
      {!r ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["Enquiries", r.total.total, "text-primary"],
              ["Open", r.total.open, "text-primary"],
              ["Admitted", r.total.won, "text-emerald-700"],
              ["Lost", r.total.lost, "text-error"],
              ["Conversion", `${r.total.conversion}%`, "text-primary"],
            ].map(([label, value, tone]) => (
              <Card key={label as string}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
                <p className={`text-3xl font-black mt-1 ${tone}`}>{value}</p>
              </Card>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant/70">{r.online} of the enquiries came through the website form.</p>

          <Card>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">By stage</h3>
            <div className="space-y-2">
              {r.stages.map((s) => (
                <div key={s.id} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="font-semibold truncate">{s.name}</span>
                  <Bar value={s.count} max={Math.max(1, ...r.stages.map((x) => x.count))} tone={s.won ? "bg-emerald-600" : s.lost ? "bg-error" : "bg-primary"} />
                  <span className="text-right font-bold">{s.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <h3 className="px-5 pt-5 pb-3 text-sm font-black uppercase tracking-widest text-primary">By class, with seats</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                    <th className="px-5 py-2 font-bold">Class</th>
                    <th className="px-3 py-2 font-bold text-right">Enquiries</th>
                    <th className="px-3 py-2 font-bold text-right">Open</th>
                    <th className="px-3 py-2 font-bold text-right">Admitted</th>
                    <th className="px-3 py-2 font-bold text-right">Conversion</th>
                    <th className="px-3 py-2 font-bold text-right">Seats</th>
                    <th className="px-3 py-2 font-bold text-right">Enrolled</th>
                    <th className="px-5 py-2 font-bold text-right">Seats left</th>
                  </tr>
                </thead>
                <tbody>
                  {r.byClass.map((c) => (
                    <tr key={c.id} className="border-t border-outline-variant/10">
                      <td className="px-5 py-2.5 font-semibold">{c.name}</td>
                      <td className="px-3 py-2.5 text-right">{c.total}</td>
                      <td className="px-3 py-2.5 text-right">{c.open}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-700 font-bold">{c.won}</td>
                      <td className="px-3 py-2.5 text-right">{c.total ? `${c.conversion}%` : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{c.capacity ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right">{c.enrolled}</td>
                      <td className={`px-5 py-2.5 text-right font-bold ${c.seatsLeft === 0 ? "text-error" : ""}`}>{c.seatsLeft ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-on-surface-variant/60">Seats are the capacities of the class&apos;s sections (Configuration → Classes &amp; Sections); “—” when a section has no capacity set.</p>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TallyTable title="By source" first="Source" rows={r.bySource.map((x) => ({ ...x, key: x.id ?? "none" }))} />
            <TallyTable title="By who follows up" first="Staff" rows={r.byCounsellor.map((x) => ({ ...x, key: x.id ?? "none" }))} />
            <TallyTable title="By month" first="Month" rows={r.byMonth.map((x) => ({ ...x, key: x.month, name: month(x.month) }))} />
            <Card>
              <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Why enquiries were lost</h3>
              {r.lostReasons.length ? (
                <div className="space-y-2">
                  {r.lostReasons.map((l) => (
                    <div key={l.id ?? "none"} className="grid grid-cols-[12rem_1fr_3rem] items-center gap-3 text-sm">
                      <span className="font-semibold truncate">{l.name}</span>
                      <Bar value={l.count} max={Math.max(1, ...r.lostReasons.map((x) => x.count))} tone="bg-error" />
                      <span className="text-right font-bold">{l.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant/70">None lost.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdmissionReportsPage() {
  return (
    <RequirePermission permission="enquiry.reports">
      <Reports />
    </RequirePermission>
  );
}
