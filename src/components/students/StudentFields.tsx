"use client";

import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { MasterChainSelect, MasterSelect } from "@/components/masters/MasterSelect";
import type { FormConfig, StudentFields as Fields } from "@/lib/api/students";
import { cn } from "@/lib/utils";

/**
 * The student's own fields (personal, IDs, address, previous school, health), shared by the
 * admission form and the edit screen. Fields the school hides (System Settings → Students) are
 * left out; required ones are marked *.
 */

export type FieldValues = Record<string, string>;

const PLACE_CHAIN = [
  { key: "country", label: "Country", plural: "Countries" },
  { key: "state", label: "State", plural: "States" },
  { key: "district", label: "District", plural: "Districts" },
  { key: "city", label: "City / town", plural: "Cities / towns" },
];

/** Form values (strings) → what the API takes ("" = empty). */
export const toFields = (v: FieldValues): Fields => {
  const out: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "countryId") continue;
    out[k] = val.trim() === "" ? null : val.trim();
  }
  return out as Fields;
};

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        {description && <p className="text-sm text-on-surface-variant/70 mt-1">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

export function StudentFieldsForm({
  values,
  onChange,
  config,
  errors,
  disabled,
  canSeeSensitive = true,
}: {
  values: FieldValues;
  onChange: (next: FieldValues) => void;
  config: FormConfig;
  errors: Record<string, string>;
  disabled?: boolean;
  canSeeSensitive?: boolean;
}) {
  const shown = (field: string) => !config.hidden.includes(field);
  const star = (field: string, label: string) => (config.required.includes(field) ? `${label} *` : label);
  const set = (k: string) => (v: string) => onChange({ ...values, [k]: v });
  const input = (k: string, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Input label={label} value={values[k] ?? ""} onChange={(e) => set(k)(e.target.value)} error={errors[k]} disabled={disabled} {...props} />
  );
  const master = (k: string, list: string, label: string) => (
    <MasterSelect master={list} label={label} value={values[k] ?? ""} onChange={set(k)} error={errors[k]} disabled={disabled} placeholder="Not given" />
  );
  const grid = "grid grid-cols-1 md:grid-cols-3 gap-4";

  return (
    <>
      <Section title="Student">
        <div className={grid}>
          {input("firstName", "First name *", { maxLength: 80 })}
          {shown("middleName") && input("middleName", star("middleName", "Middle name"), { maxLength: 80 })}
          {shown("lastName") && input("lastName", star("lastName", "Last name"), { maxLength: 80 })}
          {shown("dateOfBirth") && input("dateOfBirth", star("dateOfBirth", "Date of birth"), { type: "date" })}
          {shown("genderId") && master("genderId", "gender", star("genderId", "Gender"))}
          {shown("bloodGroupId") && master("bloodGroupId", "blood_group", star("bloodGroupId", "Blood group"))}
          {shown("religionId") && master("religionId", "religion", star("religionId", "Religion"))}
          {shown("casteCategoryId") && master("casteCategoryId", "caste_category", star("casteCategoryId", "Caste category"))}
          {shown("categoryId") && master("categoryId", "student_category", star("categoryId", "Admission category"))}
          {shown("motherTongueId") && master("motherTongueId", "mother_tongue", star("motherTongueId", "Mother tongue"))}
          {shown("nationalityId") && master("nationalityId", "nationality", star("nationalityId", "Nationality"))}
          {shown("disabilityId") && master("disabilityId", "disability", star("disabilityId", "Disability (CWSN)"))}
        </div>
      </Section>

      {(shown("aadhaar") || shown("apaarId") || shown("pen") || shown("mobile") || shown("email")) && (
        <Section title="IDs and contact">
          <div className={grid}>
            {shown("aadhaar") &&
              (canSeeSensitive ? input("aadhaar", star("aadhaar", "Aadhaar"), { inputMode: "numeric", maxLength: 14, placeholder: "12 digits" }) : input("aadhaar", "Aadhaar (hidden)", { disabled: true }))}
            {shown("apaarId") && input("apaarId", star("apaarId", "APAAR ID"), { inputMode: "numeric", maxLength: 14 })}
            {shown("pen") && input("pen", star("pen", "PEN (UDISE+)"), { maxLength: 20 })}
            {shown("mobile") && input("mobile", star("mobile", "Student mobile"), { inputMode: "tel" })}
            {shown("email") && input("email", star("email", "Student email"), { type: "email" })}
          </div>
        </Section>
      )}

      {shown("address") && (
        <Section title={config.required.includes("address") ? "Address *" : "Address"}>
          {input("addressLine", "House, street, locality", { maxLength: 200 })}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MasterChainSelect
              chain={PLACE_CHAIN}
              value={[values.countryId ?? "", values.stateId ?? "", values.districtId ?? "", values.cityId ?? ""]}
              onChange={([countryId = "", stateId = "", districtId = "", cityId = ""]) => onChange({ ...values, countryId, stateId, districtId, cityId })}
              placeholder={() => "Not given"}
              disabled={disabled}
              error={errors.cityId ?? errors.districtId ?? errors.stateId}
            />
          </div>
          <div className="w-40">{input("pinCode", "PIN", { inputMode: "numeric", maxLength: 6 })}</div>
        </Section>
      )}

      {(shown("previousSchool") || shown("medicalNotes") || shown("emergency")) && (
        <Section title="Previous school and health">
          {shown("previousSchool") && (
            <div className={cn(grid, "md:grid-cols-4")}>
              {input("previousSchool", star("previousSchool", "Previous school"), { maxLength: 150 })}
              {master("previousBoardId", "previous_board", "Board")}
              {input("previousClass", "Last class passed", { maxLength: 20 })}
              {input("tcNumber", "TC number", { maxLength: 40 })}
            </div>
          )}
          {shown("emergency") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {input("emergencyName", star("emergency", "Emergency contact"), { maxLength: 120 })}
              {input("emergencyPhone", "Emergency phone", { inputMode: "tel" })}
            </div>
          )}
          {shown("medicalNotes") &&
            (canSeeSensitive ? (
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{star("medicalNotes", "Medical notes (allergies, conditions)")}</span>
                <textarea
                  value={values.medicalNotes ?? ""}
                  onChange={(e) => set("medicalNotes")(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={disabled}
                  className="w-full bg-surface-container-low rounded-xl border-none outline-none py-3 px-4 text-sm focus:ring-2 focus:ring-primary/10"
                />
                {errors.medicalNotes && <span className="text-[10px] font-bold text-error uppercase tracking-wider ml-1">{errors.medicalNotes}</span>}
              </label>
            ) : (
              <p className="text-xs text-on-surface-variant/60">Medical notes are only shown to people allowed to see sensitive details.</p>
            ))}
        </Section>
      )}
    </>
  );
}
