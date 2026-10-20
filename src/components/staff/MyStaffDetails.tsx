"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Detail, FormAlert } from "@/components/forms";
import { Section } from "@/components/students/StudentFields";
import { StaffFieldsForm, staffValues, StaffValues, toStaffFields } from "@/components/staff/StaffFields";
import { expRows, ExperienceEditor, qualRows, QualificationsEditor, toExperience, toQualifications } from "@/components/staff/HistoryEditors";
import { staffApi } from "@/lib/api/staff";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

/** My account → my staff record (what System Settings → Staff lets me change) and my classes. */
export function MyStaffDetails() {
  const mine = useQuery({ queryKey: ["staff-me"], queryFn: staffApi.me });
  const teaching = useQuery({ queryKey: ["staff-me-teaching"], queryFn: staffApi.myTeaching, enabled: !!mine.data });
  const config = useQuery({ queryKey: ["staff-form-config-self"], queryFn: () => staffApi.formConfig().catch(() => null), enabled: !!mine.data });
  if (!mine.data) return null;
  const { record, selfEdit } = mine.data;
  return (
    <>
      <Section title="Staff record" description="Your job details are kept by the school office.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Detail label="Employee code" value={record.employeeCode} />
          <Detail label="Designation" value={record.designation?.name ?? "—"} />
          <Detail label="Department" value={record.department?.name ?? "—"} />
          <Detail label="Joined" value={new Date(record.joiningDate).toLocaleDateString()} />
          <Detail label="Reports to" value={record.reportsTo?.name ?? "—"} />
          <Detail label="Class teacher of" value={teaching.data?.classTeacherOf.map((c) => c.label).join(", ") || "—"} />
        </div>
        {!!teaching.data?.teaches.length && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">I teach this year</p>
            <p className="text-sm">{teaching.data.teaches.map((t) => `${t.section.label} ${t.subject.name}`).join(" · ")}</p>
          </div>
        )}
      </Section>
      {selfEdit.length > 0 && <SelfEdit key={record.updatedAt} selfEdit={selfEdit} config={config.data ?? { required: [], hidden: [], editable: false, loginDefault: "teaching", selfEdit }} record={record} />}
    </>
  );
}

function SelfEdit({ selfEdit, config, record }: { selfEdit: string[]; config: import("@/lib/api/staff").StaffFormConfig; record: import("@/lib/api/staff").Staff }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [values, setValues] = useState<StaffValues>(() => staffValues({ ...record, sensitiveShown: true }));
  const [quals, setQuals] = useState(() => qualRows(record));
  const [exp, setExp] = useState(() => expRows(record));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const groups = selfEdit.filter((g) => g !== "qualifications");
  const cols: Record<string, string[]> = { mobile: ["mobile"], email: ["email"], address: ["addressLine", "stateId", "districtId", "cityId", "pinCode"], emergency: ["emergencyName", "emergencyPhone"], bank: ["bankId", "bankAccountNo", "ifsc"] };

  const save = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const all = toStaffFields(values);
      const fields = Object.fromEntries(groups.flatMap((g) => cols[g] ?? []).map((k) => [k, all[k] ?? null]));
      await staffApi.updateMe({ fields, ...(selfEdit.includes("qualifications") ? { qualifications: toQualifications(quals), experience: toExperience(exp) } : {}) });
      await queryClient.invalidateQueries({ queryKey: ["staff-me"] });
      showToast("Saved", "success");
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error && <FormAlert>{error}</FormAlert>}
      {groups.length > 0 && <StaffFieldsForm values={values} onChange={setValues} config={{ ...config, hidden: [] }} errors={fieldErrors} disabled={busy} only={groups} />}
      {selfEdit.includes("qualifications") && (
        <>
          <Section title="My qualifications">
            <QualificationsEditor rows={quals} onChange={setQuals} disabled={busy} />
          </Section>
          <Section title="My previous experience">
            <ExperienceEditor rows={exp} onChange={setExp} disabled={busy} />
          </Section>
        </>
      )}
      <div className="flex justify-end">
        <Button disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save my staff details"}
        </Button>
      </div>
    </>
  );
}
