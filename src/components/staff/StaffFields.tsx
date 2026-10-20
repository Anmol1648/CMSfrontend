"use client";

import { Input } from "@/components/ui/Input";
import { MasterChainSelect, MasterSelect } from "@/components/masters/MasterSelect";
import { Section } from "@/components/students/StudentFields";
import type { StaffFormConfig } from "@/lib/api/staff";

/**
 * A staff member's own fields (personal, job, contact, bank and IDs), shared by "Add staff" and
 * the edit screen. Fields the school hides (System Settings → Staff) are left out; required ones
 * are marked *. `only` limits the form to some fields (what staff may change themselves).
 */

export type StaffValues = Record<string, string>;

const PLACE_CHAIN = [
  { key: "country", label: "Country", plural: "Countries" },
  { key: "state", label: "State", plural: "States" },
  { key: "district", label: "District", plural: "Districts" },
  { key: "city", label: "City / town", plural: "Cities / towns" },
];

/** Form values → what the API takes ("" = empty). */
export const toStaffFields = (v: StaffValues) => {
  const out: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(v)) if (k !== "countryId") out[k] = val.trim() === "" ? null : val.trim();
  return out;
};

export function StaffFieldsForm({
  values,
  onChange,
  config,
  errors,
  disabled,
  canSeeSensitive = true,
  only,
}: {
  values: StaffValues;
  onChange: (next: StaffValues) => void;
  config: StaffFormConfig;
  errors: Record<string, string>;
  disabled?: boolean;
  canSeeSensitive?: boolean;
  /** Field groups to show (mobile, email, address, emergency, bank); all when left out. */
  only?: string[];
}) {
  const shown = (field: string) => !config.hidden.includes(field) && (!only || only.includes(field));
  const star = (field: string, label: string) => (config.required.includes(field) ? `${label} *` : label);
  const set = (k: string) => (v: string) => onChange({ ...values, [k]: v });
  const input = (k: string, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Input label={label} value={values[k] ?? ""} onChange={(e) => set(k)(e.target.value)} error={errors[k]} disabled={disabled} {...props} />
  );
  const master = (k: string, list: string, label: string) => (
    <MasterSelect master={list} label={label} value={values[k] ?? ""} onChange={set(k)} error={errors[k]} disabled={disabled} placeholder="Not given" />
  );
  const grid = "grid grid-cols-1 md:grid-cols-3 gap-4";
  const all = !only;

  return (
    <>
      {all && (
        <Section title="Personal">
          <div className={grid}>
            {input("firstName", "First name *", { maxLength: 80 })}
            {shown("middleName") && input("middleName", star("middleName", "Middle name"), { maxLength: 80 })}
            {shown("lastName") && input("lastName", star("lastName", "Last name"), { maxLength: 80 })}
            {shown("dateOfBirth") && input("dateOfBirth", star("dateOfBirth", "Date of birth"), { type: "date" })}
            {shown("genderId") && master("genderId", "gender", star("genderId", "Gender"))}
            {shown("bloodGroupId") && master("bloodGroupId", "blood_group", star("bloodGroupId", "Blood group"))}
            {shown("religionId") && master("religionId", "religion", star("religionId", "Religion"))}
            {shown("casteCategoryId") && master("casteCategoryId", "caste_category", star("casteCategoryId", "Caste category"))}
            {shown("maritalStatusId") && master("maritalStatusId", "marital_status", star("maritalStatusId", "Marital status"))}
          </div>
        </Section>
      )}

      {all && (
        <Section title="Job">
          <div className={grid}>
            {input("joiningDate", "Joining date", { type: "date" })}
            {master("staffTypeId", "staff_type", "Staff type")}
            {shown("designationId") && master("designationId", "designation", star("designationId", "Designation"))}
            {shown("departmentId") && master("departmentId", "department", star("departmentId", "Department"))}
            {shown("employmentTypeId") && master("employmentTypeId", "employment_type", star("employmentTypeId", "Employment type"))}
            {master("teachingPostId", "teaching_post", "Teaching post (teachers)")}
          </div>
        </Section>
      )}

      {(shown("mobile") || shown("email") || shown("address")) && (
        <Section title="Contact and address">
          <div className={grid}>
            {shown("mobile") && input("mobile", star("mobile", "Mobile"), { inputMode: "tel" })}
            {shown("email") && input("email", star("email", "Email"), { type: "email" })}
          </div>
          {shown("address") && (
            <>
              {input("addressLine", star("address", "House, street, locality"), { maxLength: 200 })}
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
            </>
          )}
        </Section>
      )}

      {(shown("bank") || (all && (shown("aadhaar") || shown("pan") || shown("pf")))) && (
        <Section title="Bank and IDs" description={canSeeSensitive ? undefined : "Account, Aadhaar, PAN and PF numbers are only shown to people allowed to see sensitive details."}>
          <div className={grid}>
            {shown("bank") && master("bankId", "bank", star("bank", "Bank"))}
            {shown("bank") && (canSeeSensitive ? input("bankAccountNo", "Account number", { inputMode: "numeric", maxLength: 20 }) : input("bankAccountNo", "Account number (hidden)", { disabled: true }))}
            {shown("bank") && input("ifsc", "IFSC", { maxLength: 11, placeholder: "SBIN0001234" })}
            {all && shown("aadhaar") && canSeeSensitive && input("aadhaar", star("aadhaar", "Aadhaar"), { inputMode: "numeric", maxLength: 14 })}
            {all && shown("pan") && canSeeSensitive && input("pan", star("pan", "PAN"), { maxLength: 10, placeholder: "ABCDE1234F" })}
            {all && shown("pf") && canSeeSensitive && input("pfNumber", star("pf", "PF number"), { maxLength: 30 })}
            {all && shown("pf") && input("uan", "UAN", { inputMode: "numeric", maxLength: 12 })}
          </div>
        </Section>
      )}

      {shown("emergency") && (
        <Section title="Emergency contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input("emergencyName", star("emergency", "Name"), { maxLength: 120 })}
            {input("emergencyPhone", "Phone", { inputMode: "tel" })}
          </div>
        </Section>
      )}
    </>
  );
}

/** A staff record as form values (master options by id). */
export const staffValues = (s: import("@/lib/api/staff").Staff): StaffValues => ({
  firstName: s.firstName,
  middleName: s.middleName ?? "",
  lastName: s.lastName ?? "",
  dateOfBirth: s.dateOfBirth ?? "",
  genderId: s.gender?.id ?? "",
  bloodGroupId: s.bloodGroup?.id ?? "",
  religionId: s.religion?.id ?? "",
  casteCategoryId: s.casteCategory?.id ?? "",
  maritalStatusId: s.maritalStatus?.id ?? "",
  joiningDate: s.joiningDate,
  staffTypeId: s.staffType?.id ?? "",
  designationId: s.designation?.id ?? "",
  departmentId: s.department?.id ?? "",
  employmentTypeId: s.employmentType?.id ?? "",
  teachingPostId: s.teachingPost?.id ?? "",
  mobile: s.mobile ?? "",
  email: s.email ?? "",
  addressLine: s.addressLine ?? "",
  countryId: "",
  stateId: s.state?.id ?? "",
  districtId: s.district?.id ?? "",
  cityId: s.city?.id ?? "",
  pinCode: s.pinCode ?? "",
  bankId: s.bank?.id ?? "",
  ifsc: s.ifsc ?? "",
  uan: s.uan ?? "",
  ...(s.sensitiveShown ? { bankAccountNo: s.bankAccountNo ?? "", aadhaar: s.aadhaar ?? "", pan: s.pan ?? "", pfNumber: s.pfNumber ?? "" } : {}),
  emergencyName: s.emergencyName ?? "",
  emergencyPhone: s.emergencyPhone ?? "",
});
