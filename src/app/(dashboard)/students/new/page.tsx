"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { FieldValues, Section, StudentFieldsForm, toFields } from "@/components/students/StudentFields";
import { emptyGuardian, GuardianFields, GuardianValues, toGuardianInput } from "@/components/students/GuardianFields";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicApi } from "@/lib/api/academic";
import { mastersApi } from "@/lib/api/masters";
import { FamilyMatch, LoginCreated, Student, studentsApi } from "@/lib/api/students";
import { ApiError, errorMessage } from "@/lib/api/client";

const today = () => new Date().toISOString().slice(0, 10);

function Admission() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const sensitive = can("student.view_sensitive");
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const relations = useQuery({ queryKey: ["master-options", "relation", null, null], queryFn: () => mastersApi.options("relation") });

  // Placement
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [roll, setRoll] = useState("");
  const [houseId, setHouseId] = useState("");
  const [optional, setOptional] = useState<string[]>([]);
  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions });
  const sections = useQuery({ queryKey: ["academic-section-options", year, classId], queryFn: () => academicApi.sectionOptions(year, classId), enabled: !!year && !!classId });
  const classSubjects = useQuery({ queryKey: ["academic-class-subjects", year, classId], queryFn: () => academicApi.classSubjects(year, classId), enabled: !!year && !!classId });
  useEffect(() => setSectionId(""), [classId, year]);
  useEffect(() => setOptional([]), [sectionId]);

  // Admission number (a preview; the real one is given on saving unless typed)
  const next = useQuery({ queryKey: ["next-admission-number", sectionId], queryFn: () => studentsApi.nextAdmissionNumber(sectionId || undefined) });
  const [admissionNo, setAdmissionNo] = useState("");
  const [admissionDate, setAdmissionDate] = useState(today());
  const [admissionTypeId, setAdmissionTypeId] = useState("");

  // Student fields, family
  const [fields, setFields] = useState<FieldValues>({ firstName: "" });
  const [sibling, setSibling] = useState<FamilyMatch | null>(null);
  const [familySearch, setFamilySearch] = useState("");
  const [familyResults, setFamilyResults] = useState<FamilyMatch[] | null>(null);
  const [guardians, setGuardians] = useState<GuardianValues[]>([]);
  const [createLogin, setCreateLogin] = useState(true);

  // Father (main contact) and mother to start with.
  useEffect(() => {
    if (guardians.length || !relations.data) return;
    const rel = (n: string) => relations.data.find((r) => r.name === n)?.id ?? "";
    setGuardians([emptyGuardian(rel("Father"), true), emptyGuardian(rel("Mother"))]);
  }, [relations.data, guardians.length]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ student: Student; logins: LoginCreated[]; warning: string | null } | null>(null);

  const section = sections.data?.find((s) => s.id === sectionId);
  const streamOf = useMemo(() => {
    const label = section?.label ?? "";
    const m = label.match(/\((.+)\)$/);
    return m?.[1] ?? null;
  }, [section]);
  const optionalSubjects = (classSubjects.data ?? []).filter((c) => c.isOptional && (!c.stream || c.stream.name === streamOf));

  const findFamily = async () => {
    setFamilyResults(await studentsApi.searchFamilies(familySearch).catch(() => []));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const filled = guardians.filter((g) => g.name.trim());
      const r = await studentsApi.admit({
        student: { ...toFields(fields), admissionDate, admissionTypeId: admissionTypeId || null, ...(admissionNo.trim() ? { admissionNo: admissionNo.trim() } : {}) },
        ...(sibling ? { familyId: sibling.id } : { guardians: filled.map(toGuardianInput) }),
        enrolment: { academicYearId: year, sectionId, ...(roll.trim() ? { rollNumber: Number(roll) } : {}), houseId: houseId || null, optionalSubjectIds: optional },
        ...(config.data?.studentLogin === "on_request" ? { createLogin } : {}),
      });
      setDone(r);
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["next-admission-number"] });
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (!config.data) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  const cfg = config.data;

  return (
    <>
      <PageHeader
        title="New admission"
        description="Class, student and parents on one form. The admission number, roll number and student login are given by your settings (System Settings → Students)."
        actions={
          <Link href="/students" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All students
          </Link>
        }
      />
      <form onSubmit={submit} noValidate className="space-y-6 max-w-5xl">
        {error && <FormAlert>{error}</FormAlert>}

        <Section title="Class">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <YearSelect value={year} onChange={setYear} />
            <Select label="Class *" value={classId} onChange={setClassId} options={[{ value: "", label: "Choose…" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            <Select
              label="Section *"
              value={sectionId}
              onChange={setSectionId}
              error={fieldErrors.sectionId}
              disabled={!classId}
              options={[{ value: "", label: classId ? "Choose…" : "Choose the class first" }, ...(sections.data ?? []).map((s) => ({ value: s.id, label: s.label }))]}
            />
            <Input label="Roll no (optional)" type="number" min={1} value={roll} onChange={(e) => setRoll(e.target.value)} error={fieldErrors.rollNumber} placeholder="Given automatically" />
            {cfg.houses && <MasterSelect master="house" label="House" value={houseId} onChange={setHouseId} placeholder="Not given" />}
          </div>
          {optionalSubjects.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Optional subjects chosen</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {optionalSubjects.map((c) => (
                  <Checkbox
                    key={c.subject.id}
                    label={c.subject.name}
                    checked={optional.includes(c.subject.id)}
                    onChange={(on) => setOptional((list) => (on ? [...list, c.subject.id] : list.filter((x) => x !== c.subject.id)))}
                  />
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="Admission">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label={cfg.editable ? "Admission no" : "Admission no (given automatically)"}
              value={admissionNo}
              onChange={(e) => setAdmissionNo(e.target.value)}
              placeholder={next.data ? `${next.data.next} (next)` : ""}
              error={fieldErrors.admissionNo}
              disabled={!cfg.editable}
              maxLength={40}
            />
            <Input label="Admission date" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} error={fieldErrors.admissionDate} />
            <MasterSelect master="admission_type" label="Admission type" value={admissionTypeId} onChange={setAdmissionTypeId} placeholder="Not given" />
          </div>
          <p className="text-xs text-on-surface-variant/60">
            Leave the admission number empty to get the next one ({next.data?.next ?? "…"}, pattern <code>{next.data?.pattern}</code>).
          </p>
        </Section>

        <StudentFieldsForm values={fields} onChange={setFields} config={cfg} errors={fieldErrors} disabled={busy} canSeeSensitive={sensitive} />

        <Section title={cfg.required.includes("guardian") ? "Parents / guardians *" : "Parents / guardians"} description="A brother or sister already studies here? Link to their family, and the parents are shared.">
          {sibling ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/30 p-4">
              <div>
                <p className="font-bold text-primary">Sibling of {sibling.students.map((s) => s.name).join(", ")}</p>
                <p className="text-sm text-on-surface-variant">{sibling.guardians.map((g) => `${g.name}${g.relation ? ` (${g.relation})` : ""}${g.mobile ? ` · ${g.mobile}` : ""}`).join(" · ")}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setSibling(null)}>
                Not a sibling
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-80">
                  <Input label="Find a sibling's family" placeholder="Parent's mobile or name" value={familySearch} onChange={(e) => setFamilySearch(e.target.value)} icon="search" />
                </div>
                <Button type="button" variant="secondary" disabled={familySearch.trim().length < 3} onClick={findFamily}>
                  Find
                </Button>
              </div>
              {familyResults && (
                <div className="space-y-2">
                  {!familyResults.length && <p className="text-sm text-on-surface-variant/70">No family found. Enter the parents below.</p>}
                  {familyResults.map((f) => (
                    <button key={f.id} type="button" onClick={() => setSibling(f)} className="w-full text-left rounded-xl border border-outline-variant/30 p-3 hover:bg-surface-container-low">
                      <p className="text-sm font-bold text-primary">{f.guardians.map((g) => g.name).join(" & ")}</p>
                      <p className="text-xs text-on-surface-variant">
                        Children: {f.students.map((s) => `${s.name} (${s.admissionNo})`).join(", ")}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-6 pt-2">
                {guardians.map((g, i) => (
                  <div key={i} className="space-y-3 rounded-xl border border-outline-variant/20 p-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                        <input type="radio" name="primary" checked={g.isPrimary} onChange={() => setGuardians((list) => list.map((x, k) => ({ ...x, isPrimary: k === i })))} className="accent-[#1A365D]" />
                        Main contact
                      </label>
                      {guardians.length > 1 && (
                        <button type="button" onClick={() => setGuardians((list) => list.filter((_, k) => k !== i))} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                          Remove
                        </button>
                      )}
                    </div>
                    <GuardianFields value={g} onChange={(v) => setGuardians((list) => list.map((x, k) => (k === i ? v : x)))} canSeeSensitive={sensitive} />
                  </div>
                ))}
                {fieldErrors.guardians && <FormAlert>{fieldErrors.guardians}</FormAlert>}
                <Button type="button" variant="secondary" onClick={() => setGuardians((list) => [...list, emptyGuardian()])}>
                  + Add another guardian
                </Button>
              </div>
            </>
          )}
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {cfg.studentLogin === "on_request" ? (
            <Checkbox label="Create the student's login now" checked={createLogin} onChange={setCreateLogin} />
          ) : (
            <p className="text-xs text-on-surface-variant/70">{cfg.studentLogin === "auto" ? "A student login is created automatically." : "Student logins are switched off."}</p>
          )}
          <div className="flex gap-3">
            <Link href="/students" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest">
              Cancel
            </Link>
            <Button type="submit" disabled={busy || !sectionId || !fields.firstName?.trim()}>
              {busy ? "Admitting…" : "Admit student"}
            </Button>
          </div>
        </div>
      </form>

      {done && (
        <Modal isOpen onClose={() => router.push(`/students/${done.student.id}`)} title={`${done.student.name} is admitted`} width="max-w-lg">
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Admission no <b className="font-mono text-on-surface">{done.student.admissionNo}</b> · {done.student.enrolments[0]?.section.label} · roll {done.student.enrolments[0]?.rollNumber ?? "—"}
            </p>
            {done.warning && <FormAlert tone="warning">{done.warning}</FormAlert>}
            {done.logins.map((l) => (
              <div key={l.username} className="rounded-xl bg-surface-container-low p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Login for {l.for}</p>
                <p className="text-sm">
                  Username <b className="font-mono">{l.username}</b> · one-time password <b className="font-mono">{l.temporaryPassword}</b>
                </p>
              </div>
            ))}
            {done.logins.length > 0 && <FormAlert tone="warning">The one-time password is shown only now. Note it down or print it for the student.</FormAlert>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Admit another
              </Button>
              <Button onClick={() => router.push(`/students/${done.student.id}`)}>Open the student</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function NewAdmissionPage() {
  return (
    <RequirePermission permission="student.create">
      <Admission />
    </RequirePermission>
  );
}
