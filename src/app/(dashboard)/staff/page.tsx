"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { UserPhoto } from "@/components/account/UserPhoto";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { STAFF_STATUS } from "@/components/staff/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { staffApi, StaffListQuery, StaffStatus } from "@/lib/api/staff";
import { errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

const PAGE_SIZE = 50;

function StaffList() {
  const { can } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<StaffStatus | "">("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [department, designation, type, status, debounced, sort]);

  const query: StaffListQuery = { page, pageSize: PAGE_SIZE, search: debounced, sort, department, designation, type, status };
  const list = useQuery({ queryKey: ["staff", query], queryFn: () => staffApi.list(query), placeholderData: keepPreviousData });
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const rows = list.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Staff"
        description="Teaching and non-teaching staff. Search by name, employee code or mobile."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => staffApi.export(query).catch((err) => showToast(errorMessage(err), "error"))}>
              Export
            </Button>
            {can("staff.import") && (
              <Link href="/staff/import" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Import
              </Link>
            )}
            {can("staff.create") && (
              <Link href="/staff/new" className="px-6 py-2.5 font-bold rounded-md bg-primary text-white hover:opacity-90 transition-all">
                Add staff
              </Link>
            )}
          </div>
        }
      />
      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 p-5 border-b border-outline-variant/20">
          <MasterSelect master="department" label="Department" value={department} onChange={setDepartment} placeholder="All" />
          <MasterSelect master="designation" label="Designation" value={designation} onChange={setDesignation} placeholder="All" />
          <MasterSelect master="staff_type" label="Type" value={type} onChange={setType} placeholder="All" />
          <Select label="Status" value={status} onChange={(v) => setStatus(v as StaffStatus | "")} options={[{ value: "", label: "Working" }, ...(["relieved", "retired", "suspended"] as const).map((v) => ({ value: v, label: STAFF_STATUS[v] }))]} />
          <Select label="Sort by" value={sort} onChange={setSort} options={[{ value: "name", label: "Name" }, { value: "code", label: "Employee code" }, { value: "joiningDate", label: "Joining date" }]} />
        </div>
        <div className="px-5 py-3 border-b border-outline-variant/20">
          <Input placeholder="Search name, employee code or mobile" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
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
                <th className="px-5 py-3 font-bold">Staff member</th>
                <th className="px-5 py-3 font-bold">Designation</th>
                <th className="px-5 py-3 font-bold">Department</th>
                <th className="px-5 py-3 font-bold">Type</th>
                <th className="px-5 py-3 font-bold">Mobile</th>
                <th className="px-5 py-3 font-bold">Login</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => router.push(`/staff/${s.id}`)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <UserPhoto name={s.name} avatarUrl={s.photoUrl} />
                      <div>
                        <p className="font-bold text-primary">{s.name}</p>
                        <p className="text-xs font-mono text-on-surface-variant/70">{s.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">{s.designation?.name ?? "—"}</td>
                  <td className="px-5 py-3">{s.department?.name ?? "—"}</td>
                  <td className="px-5 py-3">{s.staffType?.name ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{s.mobile ?? "—"}</td>
                  <td className="px-5 py-3">{s.canSignIn ? <Pill tone="success">Can sign in</Pill> : <Pill>No login</Pill>}</td>
                </tr>
              ))}
              {list.data && !rows.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-on-surface-variant/70">
                    {debounced || department || designation || type || status ? "Nobody matches." : "No staff yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">{list.data ? `${list.data.total} staff` : list.isLoading ? "Loading…" : ""}</span>
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

export default function StaffPage() {
  return (
    <RequirePermission permission="staff.view">
      <StaffList />
    </RequirePermission>
  );
}
