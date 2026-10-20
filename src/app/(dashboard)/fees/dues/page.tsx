"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi } from "@/lib/api/academic";
import { DuesQuery, feesApi, rupees } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";

const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "—");

function Dues() {
  const router = useRouter();
  const { can } = useAuth();
  const { showToast } = useToast();
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("");
  const [show, setShow] = useState<NonNullable<DuesQuery["show"]>>("overdue");
  const [asOf, setAsOf] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setSection(""), [classId, year]);

  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const sections = useQuery({ queryKey: ["academic-section-options", year, classId], queryFn: () => academicApi.sectionOptions(year, classId), enabled: !!year && !!classId });
  const q: DuesQuery = { year, class: classId, section, show, asOf, search: debounced };
  const report = useQuery({ queryKey: ["fee-dues", q], queryFn: () => feesApi.dues(q), enabled: !!year, placeholderData: keepPreviousData });
  const r = report.data;

  return (
    <>
      <PageHeader
        title="Fee dues"
        description="Who still has fees to pay, worked out from the fee set-up, concessions and receipts. Class teachers see their own sections."
        actions={
          <Button variant="secondary" onClick={() => feesApi.exportDues(q).catch((err) => showToast(errorMessage(err), "error"))}>
            Export
          </Button>
        }
      />
      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 p-5 border-b border-outline-variant/20">
          <YearSelect value={year} onChange={setYear} />
          <Select label="Class" value={classId} onChange={setClassId} options={[{ value: "", label: "All" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section" value={section} onChange={setSection} disabled={!classId} options={[{ value: "", label: "All" }, ...(sections.data ?? []).map((s) => ({ value: s.id, label: s.label }))]} />
          <Select
            label="Show"
            value={show}
            onChange={(v) => setShow(v as NonNullable<DuesQuery["show"]>)}
            options={[
              { value: "overdue", label: "Overdue only (defaulters)" },
              { value: "all", label: "Anything left to pay" },
              { value: "everyone", label: "Every student" },
            ]}
          />
          <Input label="As on" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <div className="px-5 py-3 border-b border-outline-variant/20">
          <Input placeholder="Search name or admission no" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
        </div>
        {report.isError && (
          <div className="p-5">
            <FormAlert>{errorMessage(report.error)}</FormAlert>
          </div>
        )}
        {r && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-outline-variant/20">
            {[
              ["Students", String(r.totals.students), "text-primary"],
              ["Fees this year", rupees(r.totals.net), "text-primary"],
              ["Overdue", rupees(r.totals.overdue), "text-error"],
              ["Balance", rupees(r.totals.balance), "text-primary"],
            ].map(([label, value, tone]) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
                <p className={`text-xl font-black ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="px-5 py-3 font-bold">Class</th>
                <th className="px-5 py-3 font-bold">Student</th>
                <th className="px-5 py-3 font-bold">Parent</th>
                <th className="px-5 py-3 font-bold text-right">Paid</th>
                <th className="px-5 py-3 font-bold text-right">Overdue</th>
                <th className="px-5 py-3 font-bold">Since</th>
                <th className="px-5 py-3 font-bold text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(r?.students ?? []).map((s) => (
                <tr key={s.id} onClick={() => can("fee.collect") && router.push(`/fees/collect?student=${s.id}`)} className={`border-t border-outline-variant/10 ${can("fee.collect") ? "hover:bg-surface-container-low/60 cursor-pointer" : ""}`}>
                  <td className="px-5 py-2.5">
                    {s.section}
                    {s.roll ? <span className="text-xs text-on-surface-variant/70"> · {s.roll}</span> : null}
                  </td>
                  <td className="px-5 py-2.5">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs font-mono text-on-surface-variant/70">{s.admissionNo}</p>
                  </td>
                  <td className="px-5 py-2.5">
                    <p>{s.parent?.name ?? "—"}</p>
                    {s.parent?.mobile && (
                      <a href={`tel:${s.parent.mobile}`} onClick={(e) => e.stopPropagation()} className="text-xs font-mono text-primary underline">
                        {s.parent.mobile}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right text-emerald-700">{rupees(s.paid)}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-error">{s.overdue ? rupees(s.overdue) : "—"}</td>
                  <td className="px-5 py-2.5 text-xs">{fmt(s.overdueSince)}</td>
                  <td className="px-5 py-2.5 text-right font-black">{rupees(s.balance)}</td>
                </tr>
              ))}
              {r && !r.students.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant/70">
                    {show === "overdue" ? "Nobody is overdue." : "No students."}
                  </td>
                </tr>
              )}
              {!r && report.isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant/70">
                    Working out the dues…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function FeeDuesPage() {
  return (
    <RequirePermission permission="fee.view">
      <Dues />
    </RequirePermission>
  );
}
