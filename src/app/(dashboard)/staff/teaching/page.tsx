"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { academicApi } from "@/lib/api/academic";
import { staffApi } from "@/lib/api/staff";
import { errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

/** Who teaches each subject in each section of a class (one teacher per subject and section). */
function Teaching() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copying, setCopying] = useState(false);
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const teachers = useQuery({ queryKey: ["staff-options", "teaching"], queryFn: () => staffApi.options(true) });
  const grid = useQuery({ queryKey: ["teaching-grid", year, classId], queryFn: () => staffApi.grid(year, classId), enabled: !!year && !!classId });
  useEffect(() => {
    if (!classId && classes.data?.length) setClassId(classes.data[0].id);
  }, [classId, classes.data]);

  const cell = (sectionId: string, subjectId: string) => grid.data?.cells.find((c) => c.sectionId === sectionId && c.subjectId === subjectId);
  const assign = async (sectionId: string, subjectId: string, staffId: string) => {
    setSaving(`${sectionId}|${subjectId}`);
    try {
      queryClient.setQueryData(["teaching-grid", year, classId], await staffApi.assign(sectionId, subjectId, staffId || null));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(null);
    }
  };
  const open = years.data?.find((y) => y.id === year)?.status === "open";

  return (
    <>
      <PageHeader
        title="Subject Teachers"
        description="Choose who teaches each subject in each section. Teachers who can teach the subject are listed first. Class teachers are set under Classes & Sections."
        actions={
          <Button variant="secondary" disabled={!year} onClick={() => setCopyOpen(true)}>
            Copy from another year
          </Button>
        }
      />
      <div className="space-y-4">
        <Card className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <YearSelect value={year} onChange={setYear} />
          <Select label="Class" value={classId} onChange={setClassId} options={(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </Card>
        {grid.isError && <FormAlert>{errorMessage(grid.error)}</FormAlert>}
        {grid.data && !grid.data.sections.length && <FormAlert tone="info">This class has no sections this year (Configuration → Classes & Sections).</FormAlert>}
        {grid.data && grid.data.sections.length > 0 && (
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                  <th className="px-5 py-3 font-bold w-56">Subject</th>
                  {grid.data.sections.map((s) => (
                    <th key={s.id} className="px-3 py-3 font-bold min-w-48">
                      {s.label}
                      <span className="block normal-case tracking-normal font-medium text-on-surface-variant/60">Class teacher: {s.classTeacher?.name ?? "—"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.data.subjects.map((sub) => (
                  <tr key={sub.id} className="border-t border-outline-variant/10">
                    <td className="px-5 py-2 font-semibold text-on-surface">{sub.name}</td>
                    {grid.data!.sections.map((sec) => {
                      if (!sub.appliesTo.includes(sec.id)) return <td key={sec.id} className="px-3 py-2 text-on-surface-variant/40">—</td>;
                      const current = cell(sec.id, sub.id);
                      const able = (teachers.data ?? []).filter((t) => t.teachableSubjectIds.includes(sub.id));
                      const rest = (teachers.data ?? []).filter((t) => !t.teachableSubjectIds.includes(sub.id));
                      return (
                        <td key={sec.id} className="px-3 py-2">
                          <select
                            value={current?.staff.id ?? ""}
                            disabled={!open || saving === `${sec.id}|${sub.id}`}
                            onChange={(e) => assign(sec.id, sub.id, e.target.value)}
                            className="w-full bg-surface-container-low rounded-lg border-none py-2 px-2 text-sm text-primary font-semibold focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                          >
                            <option value="">Not chosen</option>
                            {able.length > 0 && (
                              <optgroup label="Can teach this subject">
                                {able.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Other teaching staff">
                              {rest.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!grid.data.subjects.length && (
                  <tr>
                    <td colSpan={grid.data.sections.length + 1} className="px-5 py-8 text-center text-on-surface-variant/70">
                      No subjects set for this class (<Link href="/academic/subjects" className="font-bold underline">Subjects</Link>).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
        {!open && year && <p className="text-xs text-on-surface-variant/60">This year is closed, so subject teachers can&apos;t change.</p>}
      </div>

      <Modal isOpen={copyOpen} onClose={() => !copying && setCopyOpen(false)} title="Copy subject teachers">
        <div className="space-y-4">
          <Select label="From" value={copyFrom} onChange={setCopyFrom} options={[{ value: "", label: "Choose a year…" }, ...(years.data ?? []).filter((y) => y.id !== year).map((y) => ({ value: y.id, label: y.name }))]} />
          <p className="text-xs text-on-surface-variant/70">Sections are matched by class and name (VI-A to VI-A). Subjects that already have a teacher are left as they are; staff who have left are skipped.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCopyOpen(false)} disabled={copying}>
              Cancel
            </Button>
            <Button
              disabled={!copyFrom || copying}
              onClick={async () => {
                setCopying(true);
                try {
                  const r = await staffApi.copyTeaching(year, copyFrom);
                  showToast(`Copied ${r.copied} subject teacher(s)`, "success");
                  await queryClient.invalidateQueries({ queryKey: ["teaching-grid"] });
                  setCopyOpen(false);
                } catch (err) {
                  showToast(errorMessage(err), "error");
                } finally {
                  setCopying(false);
                }
              }}
            >
              {copying ? "Copying…" : "Copy"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function TeachingPage() {
  return (
    <RequirePermission permission="teaching.assign">
      <Teaching />
    </RequirePermission>
  );
}
