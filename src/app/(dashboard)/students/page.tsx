"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { UserPhoto } from "@/components/account/UserPhoto";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi } from "@/lib/api/academic";
import { StudentListQuery, studentsApi, StudentStatus } from "@/lib/api/students";
import { errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { STATUS_LABELS } from "@/components/students/labels";

const PAGE_SIZE = 50;

function Students() {
  const { can } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("roll");
  const [page, setPage] = useState(1);
  const [renumbering, setRenumbering] = useState(false);
  const [confirmRenumber, setConfirmRenumber] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [year, classId, section, gender, status, debounced, sort]);
  useEffect(() => setSection(""), [classId, year]);

  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const sections = useQuery({ queryKey: ["academic-section-options", year, classId], queryFn: () => academicApi.sectionOptions(year, classId || undefined), enabled: !!year });
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const query: StudentListQuery = { page, pageSize: PAGE_SIZE, search: debounced, sort, year, class: classId, section, gender, status };
  const list = useQuery({ queryKey: ["students", query], queryFn: () => studentsApi.list(query), placeholderData: keepPreviousData, enabled: !!year });
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const rows = list.data?.items ?? [];
  const sectionLabel = sections.data?.find((s) => s.id === section)?.label;

  const renumber = async () => {
    setRenumbering(true);
    try {
      const r = await studentsApi.renumber(section);
      showToast(`Roll numbers of ${r.section} renumbered (${r.students} students)`, "success");
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setConfirmRenumber(false);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setRenumbering(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone placed in a section in the chosen year. Search by name, admission number, or a parent's name or mobile."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!year} onClick={() => studentsApi.export(query).catch((err) => showToast(errorMessage(err), "error"))}>
              Export
            </Button>
            {can("student.import") && (
              <Link href="/students/import" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Import
              </Link>
            )}
            {can("student.create") && (
              <Link href="/students/new" className="px-6 py-2.5 font-bold rounded-md bg-primary text-white hover:opacity-90 transition-all">
                New admission
              </Link>
            )}
          </div>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 p-5 border-b border-outline-variant/20">
          <YearSelect value={year} onChange={setYear} />
          <Select label="Class" value={classId} onChange={setClassId} options={[{ value: "", label: "All classes" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section" value={section} onChange={setSection} options={[{ value: "", label: "All sections" }, ...(sections.data ?? []).map((s) => ({ value: s.id, label: s.label }))]} />
          <MasterSelect master="gender" label="Gender" value={gender} onChange={setGender} placeholder="All" />
          <Select
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as StudentStatus | "")}
            options={[{ value: "", label: "Studying" }, ...(["left", "passed_out", "struck_off"] as const).map((v) => ({ value: v, label: STATUS_LABELS[v] }))]}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "roll", label: "Class, roll no" },
              { value: "name", label: "Name" },
              { value: "admissionNo", label: "Admission no" },
              { value: "admissionDate", label: "Admission date" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-outline-variant/20">
          <div className="flex-1 min-w-64">
            <Input placeholder="Search name, admission no, parent's name or mobile" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
          </div>
          {section && can("student.update") && config.data?.rollOrder !== "manual" && (
            <Button variant="secondary" onClick={() => setConfirmRenumber(true)}>
              Renumber rolls of {sectionLabel}
            </Button>
          )}
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
                <th className="px-5 py-3 font-bold">Student</th>
                <th className="px-5 py-3 font-bold">Class</th>
                <th className="px-5 py-3 font-bold">Roll</th>
                <th className="px-5 py-3 font-bold">Gender</th>
                <th className="px-5 py-3 font-bold">Parent / guardian</th>
                <th className="px-5 py-3 font-bold">Mobile</th>
                {config.data?.houses && <th className="px-5 py-3 font-bold">House</th>}
                {status && <th className="px-5 py-3 font-bold">Status</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => router.push(`/students/${s.id}`)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <UserPhoto name={s.name} avatarUrl={s.photoUrl} />
                      <div>
                        <p className="font-bold text-primary">{s.name}</p>
                        <p className="text-xs font-mono text-on-surface-variant/70">{s.admissionNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">{s.section.label}</td>
                  <td className="px-5 py-3 font-mono">{s.rollNumber ?? "—"}</td>
                  <td className="px-5 py-3">{s.gender?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    {s.contact ? (
                      <>
                        {s.contact.name}
                        {s.contact.relation && <span className="text-xs text-on-surface-variant/60"> · {s.contact.relation.name}</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{s.contact?.mobile ?? "—"}</td>
                  {config.data?.houses && <td className="px-5 py-3">{s.house?.name ?? "—"}</td>}
                  {status && (
                    <td className="px-5 py-3">
                      <Pill>{STATUS_LABELS[s.status]}</Pill>
                    </td>
                  )}
                </tr>
              ))}
              {list.data && !rows.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-on-surface-variant/70">
                    {debounced || classId || gender || status ? "No students match." : "No students yet in this year."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">{list.data ? `${list.data.total} student${list.data.total === 1 ? "" : "s"}` : list.isLoading ? "Loading…" : ""}</span>
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

      <Modal isOpen={confirmRenumber} onClose={() => !renumbering && setConfirmRenumber(false)} title={`Renumber the rolls of ${sectionLabel ?? "this section"}?`}>
        <p className="text-sm text-on-surface-variant">
          Every studying student gets a new roll number 1, 2, 3… in the order set in System Settings → Students. Roll numbers typed by hand are replaced.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmRenumber(false)} disabled={renumbering}>
            Cancel
          </Button>
          <Button onClick={renumber} disabled={renumbering}>
            {renumbering ? "Renumbering…" : "Renumber"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function StudentsPage() {
  return (
    <RequirePermission permission="student.view">
      <Suspense>
        <Students />
      </Suspense>
    </RequirePermission>
  );
}
