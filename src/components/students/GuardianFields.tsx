"use client";

import { Input } from "@/components/ui/Input";
import { MasterSelect } from "@/components/masters/MasterSelect";
import type { GuardianInput } from "@/lib/api/students";

/** One parent / guardian: relation, name, contact, work and education. */

export type GuardianValues = Record<"relationId" | "name" | "mobile" | "email" | "occupationId" | "qualificationId" | "incomeRangeId" | "aadhaar", string> & { isPrimary: boolean };

export const emptyGuardian = (relationId = "", isPrimary = false): GuardianValues => ({
  relationId,
  name: "",
  mobile: "",
  email: "",
  occupationId: "",
  qualificationId: "",
  incomeRangeId: "",
  aadhaar: "",
  isPrimary,
});

export const toGuardianInput = (g: GuardianValues): GuardianInput => ({
  relationId: g.relationId || null,
  name: g.name.trim(),
  mobile: g.mobile.trim() || null,
  email: g.email.trim() || null,
  occupationId: g.occupationId || null,
  qualificationId: g.qualificationId || null,
  incomeRangeId: g.incomeRangeId || null,
  aadhaar: g.aadhaar.trim() || null,
  isPrimary: g.isPrimary,
});

export function GuardianFields({
  value,
  onChange,
  errors = {},
  disabled,
  canSeeSensitive = true,
}: {
  value: GuardianValues;
  onChange: (next: GuardianValues) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  canSeeSensitive?: boolean;
}) {
  const set = (k: keyof GuardianValues) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MasterSelect master="relation" label="Relation" value={value.relationId} onChange={set("relationId")} disabled={disabled} placeholder="Choose…" />
      <div className="md:col-span-2">
        <Input label="Name *" value={value.name} onChange={(e) => set("name")(e.target.value)} error={errors.name} maxLength={120} disabled={disabled} />
      </div>
      <Input label="Mobile" inputMode="tel" value={value.mobile} onChange={(e) => set("mobile")(e.target.value)} error={errors.mobile} disabled={disabled} />
      <Input label="Email" type="email" value={value.email} onChange={(e) => set("email")(e.target.value)} error={errors.email} disabled={disabled} />
      <MasterSelect master="occupation" label="Occupation" value={value.occupationId} onChange={set("occupationId")} disabled={disabled} placeholder="Not given" />
      <MasterSelect master="qualification" label="Qualification" value={value.qualificationId} onChange={set("qualificationId")} disabled={disabled} placeholder="Not given" />
      {canSeeSensitive && <MasterSelect master="income_range" label="Annual income" value={value.incomeRangeId} onChange={set("incomeRangeId")} disabled={disabled} placeholder="Not given" />}
      {canSeeSensitive && <Input label="Aadhaar" inputMode="numeric" maxLength={14} value={value.aadhaar} onChange={(e) => set("aadhaar")(e.target.value)} error={errors.aadhaar} disabled={disabled} />}
    </div>
  );
}
