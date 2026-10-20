"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { FollowUpDate, formatDay, StatusPill } from "@/components/admissions/EnquiryBits";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi } from "@/lib/api/academic";
import { staffApi } from "@/lib/api/staff";
import { admissionsApi, EnquiryListQuery } from "@/lib/api/admissions";
import { errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
type Due = NonNullable<EnquiryListQuery["due"]>;
type Status = NonNullable<EnquiryListQuery["status"]>;

function Stat({ label, value, active, tone, onClick }: { label: string; value: number | undefined; active: boolean; tone?: "error" | "warning" | "success"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
        active ? "border-primary bg-primary/5" : "border-outline-variant/20 bg-surface-container-lowest"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
      <p className={cn("text-2xl font-black mt-1", tone === "error" ? "text-error" : tone === "warning" ? "text-amber-700" : tone === "success" ? "text-emerald-700" : "text-primary")}>{value ?? "…"}</p>
    </button>
  );
}

function Enquiries() {
  const { can } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [assigned, setAssigned] = useState("");
  const [status, setStatus] = useState<Status>("open");
  const [due, setDue] = useState<Due>("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("enquiryDate");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [year, classId, stage, source, assigned, status, due, debounced, sort]);

  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const staff = useQuery({ queryKey: ["staff-options"], queryFn: () => staffApi.options() });
  const summary = useQuery({ queryKey: ["enquiry-summary", year], queryFn: () => admissionsApi.summary(year || undefined), enabled: !!year });
  const query: EnquiryListQuery = {
    page,
    pageSize: PAGE_SIZE,
    search: debounced,
    sort,
    order: sort === "nextFollowUp" || sort === "studentName" ? "asc" : "desc",
    year,
    class: classId,
    stage,
    source,
    assigned,
    status: stage ? "" : status,
    due,
  };
  const list = useQuery({ queryKey: ["enquiries", query], queryFn: () => admissionsApi.list(query), placeholderData: keepPreviousData, enabled: !!year });
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const rows = list.data?.items ?? [];
  const show = (s: Status, d: Due = "") => {
    setStage("");
    setStatus(s);
    setDue(d);
  };

  return (
    <>
      <PageHeader
        title="Admission enquiries"
        description="Every family asking about admission, followed up until admitted or closed. Stages, sources and outcomes are set in Configuration → Masters → Admissions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => admissionsApi.export(query).catch((err) => showToast(errorMessage(err), "error"))}>
              Export
            </Button>
            {can("enquiry.reports") && (
              <Link href="/admissions/reports" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Reports
              </Link>
            )}
            {can("enquiry.manage") && (
              <Link href="/admissions/new" className="px-6 py-2.5 font-bold rounded-md bg-primary text-white hover:opacity-90 transition-all">
                New enquiry
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Stat label="Open" value={summary.data?.open} active={status === "open" && !due && !stage} onClick={() => show("open")} />
        <Stat label="Follow up today" value={summary.data?.dueToday} tone="warning" active={due === "today"} onClick={() => show("open", "today")} />
        <Stat label="Overdue" value={summary.data?.overdue} tone="error" active={due === "overdue"} onClick={() => show("open", "overdue")} />
        <Stat label="Admitted" value={summary.data?.won} tone="success" active={status === "won" && !stage} onClick={() => show("won")} />
        <Stat label="Lost" value={summary.data?.lost} active={status === "lost" && !stage} onClick={() => show("lost")} />
        <Stat label="All" value={summary.data?.total} active={status === "" && !due && !stage} onClick={() => show("")} />
      </div>

      {summary.data && (
        <div className="flex flex-wrap gap-2 mb-4">
          {summary.data.stages.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setDue("");
                setStage(stage === s.id ? "" : s.id);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold border transition-all",
                stage === s.id ? "bg-primary text-white border-primary" : "border-outline-variant/30 text-primary hover:bg-surface-container-low"
              )}
            >
              {s.name} <span className="opacity-60 ml-1">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 p-5 border-b border-outline-variant/20">
          <YearSelect value={year} onChange={setYear} />
          <Select label="Class" value={classId} onChange={setClassId} options={[{ value: "", label: "All" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <MasterSelect master="enquiry_source" label="Source" value={source} onChange={setSource} placeholder="All" />
          <Select
            label="Followed up by"
            value={assigned}
            onChange={setAssigned}
            options={[{ value: "", label: "Anyone" }, { value: "none", label: "Nobody yet" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "enquiryDate", label: "Newest first" },
              { value: "nextFollowUp", label: "Next follow-up" },
              { value: "studentName", label: "Child's name" },
              { value: "enquiryNo", label: "Enquiry no" },
            ]}
          />
        </div>
        <div className="px-5 py-3 border-b border-outline-variant/20">
          <Input placeholder="Search child or parent name, mobile, enquiry or registration no" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
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
                <th className="px-5 py-3 font-bold">Child</th>
                <th className="px-5 py-3 font-bold">Class</th>
                <th className="px-5 py-3 font-bold">Parent</th>
                <th className="px-5 py-3 font-bold">Source</th>
                <th className="px-5 py-3 font-bold">Stage</th>
                <th className="px-5 py-3 font-bold">Next follow-up</th>
                <th className="px-5 py-3 font-bold">Followed up by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} onClick={() => router.push(`/admissions/${e.id}`)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="font-bold text-primary">
                      {e.studentName}
                      {e.online && <span className="ml-2 text-[10px] uppercase tracking-widest text-on-surface-variant/60">website</span>}
                    </p>
                    <p className="text-xs font-mono text-on-surface-variant/70">
                      {e.enquiryNo} · {formatDay(e.enquiryDate)}
                    </p>
                  </td>
                  <td className="px-5 py-3">{e.class.name}</td>
                  <td className="px-5 py-3">
                    <p>{e.parentName}</p>
                    <p className="text-xs font-mono text-on-surface-variant/70">{e.mobile}</p>
                  </td>
                  <td className="px-5 py-3">{e.source?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusPill e={e} />
                    {e.registrationNo && <p className="text-[11px] font-mono text-on-surface-variant/70 mt-1">{e.registrationNo}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <FollowUpDate e={e} />
                  </td>
                  <td className="px-5 py-3">{e.assignedTo?.name ?? <span className="text-on-surface-variant/50">—</span>}</td>
                </tr>
              ))}
              {list.data && !rows.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant/70">
                    {debounced || classId || stage || source || assigned || due ? "No enquiry matches." : "No enquiries here yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">{list.data ? `${list.data.total} enquiries` : list.isLoading ? "Loading…" : ""}</span>
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

export default function AdmissionsPage() {
  return (
    <RequirePermission permission="enquiry.view">
      <Enquiries />
    </RequirePermission>
  );
}
