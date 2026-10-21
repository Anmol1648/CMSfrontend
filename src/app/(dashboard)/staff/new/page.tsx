"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { Section } from "@/components/students/StudentFields";
import { StaffFieldsForm, StaffValues, toStaffFields } from "@/components/staff/StaffFields";
import { ExperienceEditor, ExpRow, QualificationsEditor, QualRow, toExperience, toQualifications } from "@/components/staff/HistoryEditors";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { rolesApi } from "@/lib/api/admin";
import { mastersApi } from "@/lib/api/masters";
import { academicApi } from "@/lib/api/academic";
import { Staff, staffApi } from "@/lib/api/staff";
import { ApiError, errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";

function AddStaff() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const config = useQuery({ queryKey: ["staff-form-config"], queryFn: staffApi.formConfig });
  const next = useQuery({ queryKey: ["staff-next-code"], queryFn: staffApi.nextCode });
  const types = useQuery({ queryKey: ["master-values", "staff_type", "all"], queryFn: () => mastersApi.values("staff_type", { pageSize: 50 }), enabled: can("masters.view") });
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: can("role.view") });
  const subjects = useQuery({ queryKey: ["academic-subject-options"], queryFn: academicApi.subjectOptions });

  const [values, setValues] = useState<StaffValues>({ firstName: "", joiningDate: new Date().toISOString().slice(0, 10) });
  const [code, setCode] = useState("");
  const [quals, setQuals] = useState<QualRow[]>([]);
  const [exp, setExp] = useState<ExpRow[]>([]);
  const [teaches, setTeaches] = useState<string[]>([]);
  const [canSignIn, setCanSignIn] = useState<boolean | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ staff: Staff; login: { for: string; username: string; temporaryPassword: string } | null } | null>(null);

  // "Can sign in" follows the setting (and the staff type) until it is changed by hand.
  const teaching = !!types.data?.items.find((t) => t.id === values.staffTypeId)?.extra.teaching;
  const byDefault = config.data?.loginDefault === "all" || (config.data?.loginDefault === "teaching" && teaching);
  const signIn = canSignIn ?? byDefault;
  useEffect(() => setCanSignIn(null), [values.staffTypeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const r = await staffApi.create({
        staff: { ...toStaffFields(values), ...(code.trim() ? { employeeCode: code.trim() } : {}), teachableSubjectIds: teaches },
        qualifications: toQualifications(quals),
        experience: toExperience(exp),
        login: { enabled: signIn, roleIds },
      });
      setDone(r);
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-next-code"] });
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (!config.data) return <PageLoader />;
  const assignable = (roles.data ?? []).filter((r) => !r.isSystem);

  return (
    <>
      <PageHeader
        title="Add staff"
        description="The employee code and login follow System Settings → Staff."
        actions={
          <Link href="/staff" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All staff
          </Link>
        }
      />
      <form onSubmit={submit} noValidate className="space-y-6 max-w-5xl">
        {error && <FormAlert>{error}</FormAlert>}
        <Section title="Employee code">
          <div className="w-80">
            <Input
              label={config.data.editable ? "Employee code" : "Employee code (given automatically)"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={next.data ? `${next.data.next} (next)` : ""}
              error={fieldErrors.employeeCode}
              disabled={!config.data.editable}
              maxLength={40}
            />
          </div>
          <p className="text-xs text-on-surface-variant/60">Leave it empty to get {next.data?.next ?? "the next one"}, or type the existing code (e.g. the KV employee code).</p>
        </Section>

        <StaffFieldsForm values={values} onChange={setValues} config={config.data} errors={fieldErrors} disabled={busy} canSeeSensitive={can("staff.view_sensitive")} />

        <Section title="Can teach" description="Subjects this person is able to teach (helps when choosing subject teachers).">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {(subjects.data ?? []).map((s) => (
              <Checkbox key={s.id} label={s.name} checked={teaches.includes(s.id)} onChange={(on) => setTeaches((l) => (on ? [...l, s.id] : l.filter((x) => x !== s.id)))} />
            ))}
          </div>
        </Section>

        <Section title="Qualifications">
          <QualificationsEditor rows={quals} onChange={setQuals} disabled={busy} />
        </Section>
        <Section title="Previous experience">
          <ExperienceEditor rows={exp} onChange={setExp} disabled={busy} />
        </Section>

        <Section title="Login">
          <Checkbox label="Can sign in" hint="A login is made now with a one-time password. Drivers, cooks and others who don't use the system need none." checked={signIn} onChange={setCanSignIn} />
          {signIn && assignable.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Roles (none ticked = Teacher)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {assignable.map((r) => (
                  <Checkbox key={r.id} label={r.name} checked={roleIds.includes(r.id)} onChange={(on) => setRoleIds((l) => (on ? [...l, r.id] : l.filter((x) => x !== r.id)))} />
                ))}
              </div>
            </div>
          )}
        </Section>

        <div className="flex justify-end gap-3">
          <Link href="/staff" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest">
            Cancel
          </Link>
          <Button type="submit" disabled={busy || !values.firstName?.trim()}>
            {busy ? "Saving…" : "Add staff member"}
          </Button>
        </div>
      </form>

      {done && (
        <Modal isOpen onClose={() => router.push(`/staff/${done.staff.id}`)} title={`${done.staff.name} is added`} width="max-w-lg">
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Employee code <b className="font-mono text-on-surface">{done.staff.employeeCode}</b>
            </p>
            {done.login && (
              <>
                <div className="rounded-xl bg-surface-container-low p-4 text-sm">
                  Username <b className="font-mono">{done.login.username}</b> · one-time password <b className="font-mono">{done.login.temporaryPassword}</b>
                </div>
                <FormAlert tone="warning">The one-time password is shown only now.</FormAlert>
              </>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Add another
              </Button>
              <Button onClick={() => router.push(`/staff/${done.staff.id}`)}>Open the record</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function AddStaffPage() {
  return (
    <RequirePermission permission="staff.create">
      <AddStaff />
    </RequirePermission>
  );
}
