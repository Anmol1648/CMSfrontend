"use client";

import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/forms";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { Section } from "@/components/students/StudentFields";
import { academicApi } from "@/lib/api/academic";
import { staffApi } from "@/lib/api/staff";
import type { Enquiry, EnquiryFields } from "@/lib/api/admissions";

/** The enquiry's fields as form strings ("" = empty). */
export type EnquiryValues = Record<
  | "enquiryDate"
  | "academicYearId"
  | "classId"
  | "studentFirstName"
  | "studentLastName"
  | "dateOfBirth"
  | "genderId"
  | "parentName"
  | "relationId"
  | "mobile"
  | "email"
  | "area"
  | "currentSchool"
  | "sourceId"
  | "assignedToId"
  | "nextFollowUp"
  | "remarks",
  string
>;

const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export const emptyEnquiry = (followUpDays: number): EnquiryValues => ({
  enquiryDate: today(),
  academicYearId: "",
  classId: "",
  studentFirstName: "",
  studentLastName: "",
  dateOfBirth: "",
  genderId: "",
  parentName: "",
  relationId: "",
  mobile: "",
  email: "",
  area: "",
  currentSchool: "",
  sourceId: "",
  assignedToId: "",
  nextFollowUp: addDays(today(), followUpDays),
  remarks: "",
});

export const fromEnquiry = (e: Enquiry): EnquiryValues => ({
  enquiryDate: e.enquiryDate,
  academicYearId: e.academicYear.id,
  classId: e.class.id,
  studentFirstName: e.studentFirstName,
  studentLastName: e.studentLastName ?? "",
  dateOfBirth: e.dateOfBirth ?? "",
  genderId: e.gender?.id ?? "",
  parentName: e.parentName,
  relationId: e.relation?.id ?? "",
  mobile: e.mobile,
  email: e.email ?? "",
  area: e.area ?? "",
  currentSchool: e.currentSchool ?? "",
  sourceId: e.source?.id ?? "",
  assignedToId: e.assignedTo?.id ?? "",
  nextFollowUp: e.nextFollowUp ?? "",
  remarks: e.remarks ?? "",
});

/** Empty strings become null (cleared), so the API gets what the form shows. */
export const toEnquiryInput = (v: EnquiryValues, opts: { includeFollowUp: boolean }): EnquiryFields => {
  const out: EnquiryFields = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "nextFollowUp" && !opts.includeFollowUp) continue;
    out[k] = val.trim() === "" ? (k === "academicYearId" || k === "enquiryDate" ? undefined : null) : val.trim();
  }
  return out;
};

export function EnquiryForm({
  values,
  onChange,
  errors,
  showFollowUp = true,
}: {
  values: EnquiryValues;
  onChange: (v: EnquiryValues) => void;
  errors: Record<string, string>;
  /** The next follow-up date (on a new enquiry; later it is set by the follow-ups). */
  showFollowUp?: boolean;
}) {
  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const staff = useQuery({ queryKey: ["staff-options"], queryFn: () => staffApi.options() });
  const set = (k: keyof EnquiryValues) => (val: string) => onChange({ ...values, [k]: val });
  const text = (k: keyof EnquiryValues) => ({ value: values[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value), error: errors[k] });

  return (
    <div className="space-y-6">
      <Section title="Applying for">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <YearSelect value={values.academicYearId} onChange={set("academicYearId")} />
          <Select
            label="Class *"
            value={values.classId}
            onChange={set("classId")}
            error={errors.classId}
            options={[{ value: "", label: "Choose…" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Input label="Enquiry date" type="date" max={today()} {...text("enquiryDate")} />
          <MasterSelect master="enquiry_source" label="How did they hear of us" value={values.sourceId} onChange={set("sourceId")} placeholder="Not recorded" error={errors.sourceId} />
        </div>
      </Section>

      <Section title="Child">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="First name *" maxLength={80} {...text("studentFirstName")} />
          <Input label="Last name" maxLength={80} {...text("studentLastName")} />
          <Input label="Date of birth" type="date" max={today()} {...text("dateOfBirth")} />
          <MasterSelect master="gender" label="Gender" value={values.genderId} onChange={set("genderId")} placeholder="Not given" error={errors.genderId} />
          <div className="md:col-span-2">
            <Input label="Current school" maxLength={150} {...text("currentSchool")} />
          </div>
        </div>
      </Section>

      <Section title="Parent / contact">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="Name *" maxLength={120} {...text("parentName")} />
          <MasterSelect master="relation" label="Relation" value={values.relationId} onChange={set("relationId")} placeholder="Not given" error={errors.relationId} />
          <Input label="Mobile *" inputMode="tel" maxLength={20} {...text("mobile")} />
          <Input label="Email" type="email" maxLength={120} {...text("email")} />
          <div className="md:col-span-2">
            <Input label="Area / locality" maxLength={120} {...text("area")} />
          </div>
        </div>
      </Section>

      <Section title="Follow-up">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Select
              label="Followed up by"
              value={values.assignedToId}
              onChange={set("assignedToId")}
              error={errors.assignedToId}
              options={[{ value: "", label: "Nobody yet" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.name}${s.designation ? ` · ${s.designation}` : ""}` }))]}
            />
          </div>
          {showFollowUp && <Input label="Next follow-up" type="date" min={values.enquiryDate || undefined} {...text("nextFollowUp")} />}
        </div>
        <TextArea label="Remarks" value={values.remarks} onChange={(e) => set("remarks")(e.target.value)} error={errors.remarks} rows={3} maxLength={1000} />
      </Section>
    </div>
  );
}
