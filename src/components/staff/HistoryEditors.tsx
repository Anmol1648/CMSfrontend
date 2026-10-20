"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MasterSelect } from "@/components/masters/MasterSelect";
import type { ExperienceInput, QualificationInput, Staff } from "@/lib/api/staff";

/** Editable lists of qualifications and previous jobs. */

export type QualRow = { qualificationId: string; subject: string; institution: string; year: string };
export type ExpRow = { organisation: string; role: string; fromDate: string; toDate: string };

export const qualRows = (s: Staff | null): QualRow[] =>
  (s?.qualifications ?? []).map((q) => ({ qualificationId: q.qualification?.id ?? "", subject: q.subject ?? "", institution: q.institution ?? "", year: q.year ? String(q.year) : "" }));
export const expRows = (s: Staff | null): ExpRow[] => (s?.experience ?? []).map((e) => ({ organisation: e.organisation, role: e.role ?? "", fromDate: e.fromDate ?? "", toDate: e.toDate ?? "" }));

export const toQualifications = (rows: QualRow[]): QualificationInput[] =>
  rows
    .filter((r) => r.qualificationId || r.subject.trim() || r.institution.trim())
    .map((r) => ({ qualificationId: r.qualificationId || null, subject: r.subject.trim() || null, institution: r.institution.trim() || null, year: r.year.trim() ? Number(r.year) : null }));
export const toExperience = (rows: ExpRow[]): ExperienceInput[] =>
  rows.filter((r) => r.organisation.trim()).map((r) => ({ organisation: r.organisation.trim(), role: r.role.trim() || null, fromDate: r.fromDate || null, toDate: r.toDate || null }));

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" aria-label="Remove" onClick={onClick} className="w-9 h-9 mb-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-error self-end">
    <span className="material-symbols-outlined text-lg">close</span>
  </button>
);

export function QualificationsEditor({ rows, onChange, disabled }: { rows: QualRow[]; onChange: (rows: QualRow[]) => void; disabled?: boolean }) {
  const set = (i: number, k: keyof QualRow, v: string) => onChange(rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr_110px_auto] gap-3">
          <MasterSelect master="qualification" label="Qualification" value={r.qualificationId} onChange={(v) => set(i, "qualificationId", v)} placeholder="Choose…" disabled={disabled} />
          <Input label="Subject" value={r.subject} onChange={(e) => set(i, "subject", e.target.value)} maxLength={120} disabled={disabled} />
          <Input label="University / institution" value={r.institution} onChange={(e) => set(i, "institution", e.target.value)} maxLength={150} disabled={disabled} />
          <Input label="Year" type="number" value={r.year} onChange={(e) => set(i, "year", e.target.value)} disabled={disabled} />
          {!disabled && <RemoveButton onClick={() => onChange(rows.filter((_, n) => n !== i))} />}
        </div>
      ))}
      {!rows.length && <p className="text-sm text-on-surface-variant/70">None added.</p>}
      {!disabled && (
        <Button type="button" variant="secondary" onClick={() => onChange([...rows, { qualificationId: "", subject: "", institution: "", year: "" }])}>
          + Add qualification
        </Button>
      )}
    </div>
  );
}

export function ExperienceEditor({ rows, onChange, disabled }: { rows: ExpRow[]; onChange: (rows: ExpRow[]) => void; disabled?: boolean }) {
  const set = (i: number, k: keyof ExpRow, v: string) => onChange(rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_150px_150px_auto] gap-3">
          <Input label="School / organisation" value={r.organisation} onChange={(e) => set(i, "organisation", e.target.value)} maxLength={150} disabled={disabled} />
          <Input label="Role" value={r.role} onChange={(e) => set(i, "role", e.target.value)} maxLength={120} disabled={disabled} />
          <Input label="From" type="date" value={r.fromDate} onChange={(e) => set(i, "fromDate", e.target.value)} disabled={disabled} />
          <Input label="To" type="date" value={r.toDate} onChange={(e) => set(i, "toDate", e.target.value)} disabled={disabled} />
          {!disabled && <RemoveButton onClick={() => onChange(rows.filter((_, n) => n !== i))} />}
        </div>
      ))}
      {!rows.length && <p className="text-sm text-on-surface-variant/70">None added.</p>}
      {!disabled && (
        <Button type="button" variant="secondary" onClick={() => onChange([...rows, { organisation: "", role: "", fromDate: "", toDate: "" }])}>
          + Add previous job
        </Button>
      )}
    </div>
  );
}
