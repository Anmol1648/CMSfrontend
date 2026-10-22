"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, Detail, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RecordHistory } from "@/components/admin/RecordHistory";
import { UserPhoto } from "@/components/account/UserPhoto";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { FieldValues, Section, StudentFieldsForm, toFields } from "@/components/students/StudentFields";
import { emptyGuardian, GuardianFields, GuardianValues, toGuardianInput } from "@/components/students/GuardianFields";
import { STATUS_LABELS } from "@/components/students/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi } from "@/lib/api/academic";
import { mastersApi } from "@/lib/api/masters";
import { Guardian, Student, studentsApi, StudentStatus } from "@/lib/api/students";
import { ApiError, errorMessage } from "@/lib/api/client";
import { resizeImage } from "@/lib/images";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";

const showDate = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const age = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

/** A student as form values (master options by id). */
const toValues = (s: Student): FieldValues => ({
  firstName: s.firstName,
  middleName: s.middleName ?? "",
  lastName: s.lastName ?? "",
  dateOfBirth: s.dateOfBirth ?? "",
  genderId: s.gender?.id ?? "",
  bloodGroupId: s.bloodGroup?.id ?? "",
  religionId: s.religion?.id ?? "",
  casteCategoryId: s.casteCategory?.id ?? "",
  categoryId: s.category?.id ?? "",
  motherTongueId: s.motherTongue?.id ?? "",
  nationalityId: s.nationality?.id ?? "",
  disabilityId: s.disability?.id ?? "",
  ...(s.sensitiveShown ? { aadhaar: s.aadhaar ?? "", medicalNotes: s.medicalNotes ?? "" } : {}),
  apaarId: s.apaarId ?? "",
  pen: s.pen ?? "",
  mobile: s.mobile ?? "",
  email: s.email ?? "",
  addressLine: s.addressLine ?? "",
  countryId: "",
  stateId: s.state?.id ?? "",
  districtId: s.district?.id ?? "",
  cityId: s.city?.id ?? "",
  pinCode: s.pinCode ?? "",
  previousSchool: s.previousSchool ?? "",
  previousBoardId: s.previousBoard?.id ?? "",
  previousClass: s.previousClass ?? "",
  tcNumber: s.tcNumber ?? "",
  emergencyName: s.emergencyName ?? "",
  emergencyPhone: s.emergencyPhone ?? "",
});

function useRun() {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const message = await fn();
      if (message) showToast(message, "success");
      return true;
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fieldErrors, run, setError };
}

function OneTimeLogin({ login, onClose }: { login: { for: string; username: string; temporaryPassword: string } | null; onClose: () => void }) {
  if (!login) return null;
  return (
    <Modal isOpen onClose={onClose} title={`Login for ${login.for}`}>
      <div className="space-y-4">
        <p className="text-sm">
          Username <b className="font-mono">{login.username}</b> · one-time password <b className="font-mono">{login.temporaryPassword}</b>
        </p>
        <FormAlert tone="warning">The password is shown only now; they choose their own at first sign-in.</FormAlert>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function Overview({ s }: { s: Student }) {
  const current = s.enrolments.find((e) => e.academicYear.isCurrent) ?? s.enrolments[0];
  const place = [s.addressLine, s.city?.name, s.district?.name, s.state?.name, s.pinCode].filter(Boolean).join(", ");
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="space-y-4 xl:col-span-2">
        <h2 className="text-lg font-bold text-primary">About</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Detail label="Date of birth" value={s.dateOfBirth ? `${showDate(s.dateOfBirth)} (${age(s.dateOfBirth)} yrs)` : "—"} />
          <Detail label="Gender" value={s.gender?.name ?? "—"} />
          <Detail label="Blood group" value={s.bloodGroup?.name ?? "—"} />
          <Detail label="Religion" value={s.religion?.name ?? "—"} />
          <Detail label="Caste category" value={s.casteCategory?.name ?? "—"} />
          <Detail label="Admission category" value={s.category?.name ?? "—"} />
          <Detail label="Mother tongue" value={s.motherTongue?.name ?? "—"} />
          <Detail label="Nationality" value={s.nationality?.name ?? "—"} />
          <Detail label="Disability (CWSN)" value={s.disability?.name ?? "None"} />
          <Detail label="Aadhaar" value={s.aadhaar ?? "—"} />
          <Detail label="APAAR ID" value={s.apaarId ?? "—"} />
          <Detail label="PEN" value={s.pen ?? "—"} />
        </div>
        <Detail label="Address" value={place || "—"} />
        {s.medicalNotes && <Detail label="Medical notes" value={s.medicalNotes} />}
        {s.previousSchool && <Detail label="Previous school" value={[s.previousSchool, s.previousBoard?.name, s.previousClass && `class ${s.previousClass}`, s.tcNumber && `TC ${s.tcNumber}`].filter(Boolean).join(" · ")} />}
      </Card>
      <div className="space-y-6">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-primary">This year</h2>
          {current ? (
            <>
              <Detail label="Class" value={`${current.section.label} · ${current.academicYear.name}`} />
              <Detail label="Roll no" value={current.rollNumber ?? "—"} />
              {current.house && <Detail label="House" value={current.house.name} />}
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">Not placed in a section.</p>
          )}
          <Detail label="Admitted" value={`${showDate(s.admissionDate)}${s.admissionType ? ` · ${s.admissionType.name}` : ""}`} />
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-primary">Family</h2>
          {s.family?.guardians.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-bold text-on-surface">
                {g.name} {g.isPrimary && <Pill tone="primary">Main contact</Pill>}
              </p>
              <p className="text-xs text-on-surface-variant">{[g.relation?.name, g.mobile, g.occupation?.name].filter(Boolean).join(" · ")}</p>
            </div>
          ))}
          {!!s.family?.siblings.length && (
            <p className="text-xs text-on-surface-variant">
              Siblings:{" "}
              {s.family.siblings.map((x, i) => (
                <span key={x.id}>
                  {i > 0 && ", "}
                  <Link href={`/students/${x.id}`} className="font-bold text-primary hover:underline">
                    {x.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Details ─────────────────────────────────────────────────────────────────

function Details({ s, onSaved }: { s: Student; onSaved: () => Promise<void> }) {
  const { can } = useAuth();
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const [values, setValues] = useState<FieldValues>(() => toValues(s));
  const [admissionNo, setAdmissionNo] = useState(s.admissionNo);
  const [admissionDate, setAdmissionDate] = useState(s.admissionDate);
  const [admissionTypeId, setAdmissionTypeId] = useState(s.admissionType?.id ?? "");
  const { busy, error, fieldErrors, run } = useRun();
  const canEdit = can("student.update");
  if (!config.data) return <PageLoader />;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await studentsApi.update(s.id, { ...toFields(values), admissionDate, admissionTypeId: admissionTypeId || null, ...(config.data!.editable ? { admissionNo } : {}) });
      await onSaved();
      return "Details saved";
    });
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      {error && <FormAlert>{error}</FormAlert>}
      <Section title="Admission">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Admission no" value={admissionNo} onChange={(e) => setAdmissionNo(e.target.value)} error={fieldErrors.admissionNo} disabled={!config.data.editable || !canEdit} maxLength={40} />
          <Input label="Admission date" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} disabled={!canEdit} />
          <MasterSelect master="admission_type" label="Admission type" value={admissionTypeId} onChange={setAdmissionTypeId} placeholder="Not given" disabled={!canEdit} />
        </div>
      </Section>
      <StudentFieldsForm values={values} onChange={setValues} config={config.data} errors={fieldErrors} disabled={busy || !canEdit} canSeeSensitive={s.sensitiveShown} />
      {canEdit && (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setValues(toValues(s))}>
            Discard changes
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save details"}
          </Button>
        </div>
      )}
    </form>
  );
}

// ─── Family ──────────────────────────────────────────────────────────────────

const guardianValues = (g: Guardian): GuardianValues => ({
  relationId: g.relation?.id ?? "",
  name: g.name,
  mobile: g.mobile ?? "",
  email: g.email ?? "",
  occupationId: g.occupation?.id ?? "",
  qualificationId: g.qualification?.id ?? "",
  incomeRangeId: g.incomeRange?.id ?? "",
  aadhaar: "",
  isPrimary: g.isPrimary,
});

function Family({ s, reload }: { s: Student; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("student.update");
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const [editing, setEditing] = useState<{ id: string | null; values: GuardianValues } | null>(null);
  const [login, setLogin] = useState<{ for: string; username: string; temporaryPassword: string } | null>(null);
  const { busy, error, fieldErrors, run } = useRun();

  const save = () =>
    run(async () => {
      const input = toGuardianInput(editing!.values);
      if (!s.sensitiveShown) {
        delete input.aadhaar;
        delete input.incomeRangeId;
      } else if (!input.aadhaar) delete input.aadhaar; // empty = keep the saved one
      if (editing!.id) await studentsApi.updateGuardian(s.id, editing!.id, input);
      else await studentsApi.addGuardian(s.id, input);
      setEditing(null);
      await reload();
      return editing!.id ? "Saved" : "Parent / guardian added";
    });

  return (
    <div className="space-y-6">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {s.family?.guardians.map((g) => (
          <Card key={g.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-primary">{g.name}</p>
                <p className="text-sm text-on-surface-variant">{g.relation?.name ?? "Guardian"}</p>
              </div>
              {g.isPrimary && <Pill tone="primary">Main contact</Pill>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Mobile" value={g.mobile ?? "—"} />
              <Detail label="Email" value={g.email ?? "—"} />
              <Detail label="Occupation" value={g.occupation?.name ?? "—"} />
              <Detail label="Qualification" value={g.qualification?.name ?? "—"} />
              {s.sensitiveShown && <Detail label="Annual income" value={g.incomeRange?.name ?? "—"} />}
              <Detail label="Aadhaar" value={g.aadhaar ?? "—"} />
              <Detail label="Parent login" value={g.login ? `${g.login.username}${g.login.status !== "active" ? " (off)" : ""}` : "None"} />
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-3 pt-1">
                <Button variant="secondary" onClick={() => setEditing({ id: g.id, values: guardianValues(g) })}>
                  Edit
                </Button>
                {!g.login && config.data?.parentLogin !== "off" && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const l = await studentsApi.parentLogin(s.id, g.id);
                        setLogin({ for: g.name, ...l });
                        await reload();
                      })
                    }
                  >
                    Create parent login
                  </Button>
                )}
                {!g.isPrimary && (
                  <Button variant="secondary" disabled={busy} onClick={() => run(async () => (await studentsApi.updateGuardian(s.id, g.id, { isPrimary: true }), await reload(), `${g.name} is the main contact`))}>
                    Make main contact
                  </Button>
                )}
                <Button variant="secondary" className="text-error" disabled={busy} onClick={() => run(async () => (await studentsApi.removeGuardian(s.id, g.id), await reload(), `${g.name} removed`))}>
                  Remove
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      {!s.family?.guardians.length && <p className="text-sm text-on-surface-variant">No parents or guardians yet.</p>}
      {canEdit && (
        <Button variant="secondary" onClick={() => setEditing({ id: null, values: emptyGuardian() })}>
          + Add parent / guardian
        </Button>
      )}
      {!!s.family?.siblings.length && (
        <Card className="space-y-2">
          <h2 className="text-lg font-bold text-primary">Siblings (same family)</h2>
          {s.family.siblings.map((x) => (
            <Link key={x.id} href={`/students/${x.id}`} className="block text-sm font-bold text-primary hover:underline">
              {x.name} <span className="font-mono text-xs text-on-surface-variant">{x.admissionNo}</span> {x.status !== "active" && <Pill>{STATUS_LABELS[x.status]}</Pill>}
            </Link>
          ))}
          <p className="text-xs text-on-surface-variant/60">Parents are shared: a change here shows on every sibling.</p>
        </Card>
      )}

      {editing && (
        <Modal isOpen onClose={() => !busy && setEditing(null)} title={editing.id ? `Edit ${editing.values.name}` : "Add parent / guardian"} width="max-w-3xl">
          <div className="space-y-5">
            {error && <FormAlert>{error}</FormAlert>}
            <GuardianFields value={editing.values} onChange={(v) => setEditing({ ...editing, values: v })} errors={fieldErrors} canSeeSensitive={s.sensitiveShown} />
            {editing.id && s.sensitiveShown && <p className="text-xs text-on-surface-variant/60">Leave Aadhaar empty to keep the saved number.</p>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy || !editing.values.name.trim()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <OneTimeLogin login={login} onClose={() => setLogin(null)} />
    </div>
  );
}

// ─── Class (enrolments) ──────────────────────────────────────────────────────

function ClassTab({ s, reload }: { s: Student; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("student.update");
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const [moving, setMoving] = useState(false);
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [roll, setRoll] = useState("");
  const [houseId, setHouseId] = useState("");
  const [optional, setOptional] = useState<string[]>([]);
  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const sections = useQuery({ queryKey: ["academic-section-options", year, classId], queryFn: () => academicApi.sectionOptions(year, classId), enabled: !!year && !!classId });
  const classSubjects = useQuery({ queryKey: ["academic-class-subjects", year, classId], queryFn: () => academicApi.classSubjects(year, classId), enabled: !!year && !!classId });
  const subjects = useQuery({ queryKey: ["academic-subject-options"], queryFn: academicApi.subjectOptions });
  const { busy, error, fieldErrors, run } = useRun();

  const open = (e?: Student["enrolments"][number]) => {
    setYear(e?.academicYear.id ?? "");
    setClassId(e?.section.classId ?? "");
    setSectionId(e?.section.id ?? "");
    setRoll(e?.rollNumber ? String(e.rollNumber) : "");
    setHouseId(e?.house?.id ?? "");
    setOptional(e?.optionalSubjectIds ?? []);
    setMoving(true);
  };
  const section = sections.data?.find((x) => x.id === sectionId);
  const stream = section?.label.match(/\((.+)\)$/)?.[1] ?? null;
  const optionalSubjects = (classSubjects.data ?? []).filter((c) => c.isOptional && (!c.stream || c.stream.name === stream));
  const subjectName = (id: string) => subjects.data?.find((x) => x.id === id)?.name ?? "…";

  return (
    <div className="space-y-6">
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-3 font-bold">Year</th>
              <th className="px-5 py-3 font-bold">Class</th>
              <th className="px-5 py-3 font-bold">Roll</th>
              <th className="px-5 py-3 font-bold">House</th>
              <th className="px-5 py-3 font-bold">Optional subjects</th>
              {canEdit && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {s.enrolments.map((e) => (
              <tr key={e.id} className="border-t border-outline-variant/10">
                <td className="px-5 py-3 font-bold text-primary whitespace-nowrap">
                  {e.academicYear.name} {e.academicYear.isCurrent && <Pill tone="primary">Current</Pill>}
                </td>
                <td className="px-5 py-3">{e.section.label}</td>
                <td className="px-5 py-3 font-mono">{e.rollNumber ?? "—"}</td>
                <td className="px-5 py-3">{e.house?.name ?? "—"}</td>
                <td className="px-5 py-3 text-on-surface-variant">{e.optionalSubjectIds.map(subjectName).join(", ") || "—"}</td>
                {canEdit && (
                  <td className="px-5 py-3 text-right">
                    <button className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => open(e)}>
                      Change
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!s.enrolments.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant/70">
                  Not placed in any section yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>
      {canEdit && (
        <Button variant="secondary" onClick={() => open()}>
          Place in another year
        </Button>
      )}

      {moving && (
        <Modal isOpen onClose={() => !busy && setMoving(false)} title="Section, roll number and house" width="max-w-2xl">
          <div className="space-y-5">
            {error && <FormAlert>{error}</FormAlert>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <YearSelect value={year} onChange={setYear} />
              <Select
                label="Class"
                value={classId}
                onChange={(v) => {
                  setClassId(v);
                  setSectionId("");
                }}
                options={[{ value: "", label: "Choose…" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
              />
              <Select label="Section" value={sectionId} onChange={setSectionId} error={fieldErrors.sectionId} options={[{ value: "", label: "Choose…" }, ...(sections.data ?? []).map((x) => ({ value: x.id, label: x.label }))]} />
              <Input label="Roll no" type="number" min={1} value={roll} onChange={(e) => setRoll(e.target.value)} error={fieldErrors.rollNumber} placeholder="Automatic" />
              {config.data?.houses && <MasterSelect master="house" label="House" value={houseId} onChange={setHouseId} placeholder="Not given" />}
            </div>
            {optionalSubjects.length > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {optionalSubjects.map((c) => (
                  <Checkbox key={c.subject.id} label={c.subject.name} checked={optional.includes(c.subject.id)} onChange={(on) => setOptional((l) => (on ? [...l, c.subject.id] : l.filter((x) => x !== c.subject.id)))} />
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setMoving(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                disabled={busy || !year || !sectionId}
                onClick={() =>
                  run(async () => {
                    const r = await studentsApi.place(s.id, { academicYearId: year, sectionId, rollNumber: roll.trim() ? Number(roll) : undefined, houseId: houseId || null, optionalSubjectIds: optional });
                    setMoving(false);
                    await reload();
                    return r.warning ? `Saved. ${r.warning}` : "Saved";
                  })
                }
              >
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Documents ───────────────────────────────────────────────────────────────

function Documents({ s, reload }: { s: Student; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("student.update");
  const types = useQuery({ queryKey: ["master-options", "student_document", null, null], queryFn: () => mastersApi.options("student_document") });
  const values = useQuery({ queryKey: ["master-values", "student_document", "required"], queryFn: () => mastersApi.values("student_document", { pageSize: 100 }), enabled: can("masters.view") });
  const [typeId, setTypeId] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useRun();
  const { showToast } = useToast();

  const have = new Set(s.documents.map((d) => d.type?.id).filter(Boolean));
  const missing = (values.data?.items ?? []).filter((t) => t.isActive && t.extra.required === true && !have.has(t.id));

  return (
    <div className="space-y-6">
      {error && <FormAlert>{error}</FormAlert>}
      {missing.length > 0 && <FormAlert tone="warning">Still needed: {missing.map((m) => m.name).join(", ")}</FormAlert>}
      {canEdit && (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-72">
            <Select label="Document" value={typeId} onChange={setTypeId} options={[{ value: "", label: "Choose the kind…" }, ...(types.data ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
          </div>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                run(async () => {
                  await studentsApi.addDocument(s.id, f.type.startsWith("image/") ? await resizeImage(f, 2000) : f, typeId || undefined);
                  if (input.current) input.current.value = "";
                  await reload();
                  return "Document added";
                });
            }}
          />
          <Button disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : "Upload (PDF or photo)"}
          </Button>
        </Card>
      )}
      <Card padding="none" className="overflow-hidden">
        {s.documents.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t first:border-t-0 border-outline-variant/10">
            <div>
              <p className="font-bold text-on-surface">{d.type?.name ?? "Document"}</p>
              <p className="text-xs text-on-surface-variant">
                {d.fileName} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB · {new Date(d.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-4">
              <button className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => studentsApi.openDocument(s.id, d.id, d.fileName).catch((err) => showToast(errorMessage(err), "error"))}>
                Download
              </button>
              {canEdit && (
                <button className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70" onClick={() => run(async () => (await studentsApi.removeDocument(s.id, d.id), await reload(), "Document removed"))}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {!s.documents.length && <p className="px-5 py-8 text-center text-sm text-on-surface-variant/70">No documents yet.</p>}
      </Card>
    </div>
  );
}

// ─── Login and status ────────────────────────────────────────────────────────

function LoginAndStatus({ s, reload }: { s: Student; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("student.update");
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const [login, setLogin] = useState<{ for: string; username: string; temporaryPassword: string } | null>(null);
  const [status, setStatus] = useState<StudentStatus>(s.status);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reasonId, setReasonId] = useState(s.leavingReason?.id ?? "");
  const [note, setNote] = useState(s.statusNote ?? "");
  const { busy, error, run } = useRun();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Student login</h2>
        {error && <FormAlert>{error}</FormAlert>}
        {s.login ? (
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Username" value={<span className="font-mono">{s.login.username}</span>} />
            <Detail label="State" value={s.login.status === "active" ? "Can sign in" : "Switched off"} />
            <Detail label="Last sign-in" value={s.login.lastLoginAt ? new Date(s.login.lastLoginAt).toLocaleString() : "Never"} />
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">{config.data?.studentLogin === "off" ? "Student logins are switched off (System Settings → Students)." : "No login yet."}</p>
        )}
        {!s.login && canEdit && config.data?.studentLogin !== "off" && (
          <Button disabled={busy} onClick={() => run(async () => setLogin({ for: s.name, ...(await studentsApi.createLogin(s.id)) }))}>
            Create login
          </Button>
        )}
        {s.login && <p className="text-xs text-on-surface-variant/70">Reset the password or unlock the login from Users.</p>}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Status</h2>
        <p className="text-sm text-on-surface-variant">
          {STATUS_LABELS[s.status]}
          {s.statusDate && ` since ${showDate(s.statusDate)}`}
          {s.leavingReason && ` · ${s.leavingReason.name}`}
        </p>
        {canEdit && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Change to" value={status} onChange={(v) => setStatus(v as StudentStatus)} options={(Object.keys(STATUS_LABELS) as StudentStatus[]).map((v) => ({ value: v, label: STATUS_LABELS[v] }))} />
              {status !== "active" && <Input label="From" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
              {status !== "active" && <MasterSelect master="leaving_reason" label="Reason" value={reasonId} onChange={setReasonId} placeholder="Not given" />}
              {status !== "active" && <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />}
            </div>
            <p className="text-xs text-on-surface-variant/70">A student who is not studying can&apos;t sign in, and isn&apos;t in the class lists.</p>
            <Button
              disabled={busy || (status === s.status && status === "active")}
              onClick={() => run(async () => (await studentsApi.setStatus(s.id, { status, date, leavingReasonId: reasonId || null, note: note || null }), await reload(), "Status saved"))}
            >
              Save status
            </Button>
          </>
        )}
      </Card>
      <OneTimeLogin login={login} onClose={() => (setLogin(null), reload())} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  ["overview", "Overview"],
  ["details", "Details"],
  ["family", "Family"],
  ["class", "Class"],
  ["documents", "Documents"],
  ["login", "Login & status"],
  ["history", "History"],
] as const;

function StudentPage({ id }: { id: string }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const student = useQuery({ queryKey: ["student", id], queryFn: () => studentsApi.get(id) });
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const photo = useRef<HTMLInputElement>(null);
  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ["student", id] });
    await queryClient.invalidateQueries({ queryKey: ["students"] });
  };
  useEffect(() => setTab("overview"), [id]);

  if (student.isLoading) return <PageLoader />;
  if (student.isError || !student.data) return <FormAlert>{errorMessage(student.error)}</FormAlert>;
  const s = student.data;
  const current = s.enrolments.find((e) => e.academicYear.isCurrent) ?? s.enrolments[0];
  const canEdit = can("student.update");

  return (
    <>
      <PageHeader
        title={s.name}
        description={`${s.admissionNo}${current ? ` · ${current.section.label} · roll ${current.rollNumber ?? "—"}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            {(can("fee.collect") || can("fee.view")) && (
              <Link href={`/fees/collect?student=${s.id}`} className="px-5 py-2.5 font-bold rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Fees
              </Link>
            )}
            <Link href="/students" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              All students
            </Link>
          </div>
        }
      />
      <div className="space-y-6 max-w-6xl">
        <Card className="flex flex-wrap items-center gap-5">
          <button type="button" disabled={!canEdit} onClick={() => photo.current?.click()} title={canEdit ? "Change photo" : undefined} className="disabled:cursor-default">
            <UserPhoto name={s.name} avatarUrl={s.photoUrl} size="lg" />
          </button>
          <input
            ref={photo}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                await studentsApi.uploadPhoto(s.id, await resizeImage(f, 512));
                await reload();
                showToast("Photo saved", "success");
              } catch (err) {
                showToast(errorMessage(err), "error");
              }
            }}
          />
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold text-primary">{s.name}</span>
              {s.status === "active" ? <Pill tone="success">Studying</Pill> : <Pill tone="danger">{STATUS_LABELS[s.status]}</Pill>}
              {current?.house && <Pill>{current.house.name} house</Pill>}
            </div>
            <p className="text-sm text-on-surface-variant">
              Admission no <b className="font-mono">{s.admissionNo}</b> · admitted {showDate(s.admissionDate)}
              {s.family?.guardians[0] && ` · ${s.family.guardians[0].relation?.name ?? "Contact"}: ${s.family.guardians[0].name}${s.family.guardians[0].mobile ? ` (${s.family.guardians[0].mobile})` : ""}`}
            </p>
            {canEdit && <p className="text-xs text-on-surface-variant/60">Click the photo to change it.</p>}
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={cn("px-4 py-2 rounded-xl text-sm font-bold", tab === key ? "bg-primary text-white" : "bg-surface-container-low text-primary hover:bg-surface-container-high")}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview s={s} />}
        {tab === "details" && <Details key={s.updatedAt} s={s} onSaved={reload} />}
        {tab === "family" && <Family s={s} reload={reload} />}
        {tab === "class" && <ClassTab s={s} reload={reload} />}
        {tab === "documents" && <Documents s={s} reload={reload} />}
        {tab === "login" && <LoginAndStatus key={s.updatedAt} s={s} reload={reload} />}
        {tab === "history" && <RecordHistory entity="student" id={s.id} />}
      </div>
    </>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission permission="student.view">
      <StudentPage id={id} />
    </RequirePermission>
  );
}
