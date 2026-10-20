"use client";

import { useRef, useState } from "react";
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
import { MasterSelect } from "@/components/masters/MasterSelect";
import { Section } from "@/components/students/StudentFields";
import { StaffFieldsForm, StaffValues, staffValues, toStaffFields } from "@/components/staff/StaffFields";
import { expRows, ExperienceEditor, qualRows, QualificationsEditor, toExperience, toQualifications } from "@/components/staff/HistoryEditors";
import { STAFF_STATUS } from "@/components/staff/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { rolesApi } from "@/lib/api/admin";
import { academicApi } from "@/lib/api/academic";
import { mastersApi } from "@/lib/api/masters";
import { Staff, staffApi, StaffStatus } from "@/lib/api/staff";
import { ApiError, errorMessage } from "@/lib/api/client";
import { resizeImage } from "@/lib/images";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

const showDate = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

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
      const m = await fn();
      if (m) showToast(m, "success");
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fieldErrors, run };
}

function Overview({ s }: { s: Staff }) {
  const subjects = useQuery({ queryKey: ["academic-subject-options"], queryFn: academicApi.subjectOptions });
  const place = [s.addressLine, s.city?.name, s.district?.name, s.state?.name, s.pinCode].filter(Boolean).join(", ");
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="space-y-4 xl:col-span-2">
        <h2 className="text-lg font-bold text-primary">About</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Detail label="Designation" value={s.designation?.name ?? "—"} />
          <Detail label="Department" value={s.department?.name ?? "—"} />
          <Detail label="Type" value={[s.staffType?.name, s.employmentType?.name].filter(Boolean).join(" · ") || "—"} />
          <Detail label="Teaching post" value={s.teachingPost?.name ?? "—"} />
          <Detail label="Joined" value={showDate(s.joiningDate)} />
          <Detail label="Reports to" value={s.reportsTo ? <Link href={`/staff/${s.reportsTo.id}`} className="font-bold text-primary hover:underline">{s.reportsTo.name}</Link> : "—"} />
          <Detail label="Date of birth" value={showDate(s.dateOfBirth)} />
          <Detail label="Gender" value={s.gender?.name ?? "—"} />
          <Detail label="Mobile" value={s.mobile ?? "—"} />
          <Detail label="Email" value={s.email ?? "—"} />
          <Detail label="Bank" value={s.bank ? `${s.bank.name}${s.ifsc ? ` · ${s.ifsc}` : ""}` : "—"} />
          <Detail label="Account no" value={s.bankAccountNo ?? "—"} />
        </div>
        <Detail label="Address" value={place || "—"} />
        {s.teachableSubjectIds.length > 0 && <Detail label="Can teach" value={s.teachableSubjectIds.map((id) => subjects.data?.find((x) => x.id === id)?.name ?? "…").join(", ")} />}
      </Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-primary">This year</h2>
        <Detail label="Class teacher of" value={s.thisYear.classTeacherOf.map((c) => c.label).join(", ") || "—"} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">Teaches</p>
          {s.thisYear.teaches.length ? (
            <ul className="text-sm space-y-0.5">
              {s.thisYear.teaches.map((t, i) => (
                <li key={i}>
                  <b>{t.section.label}</b> · {t.subject.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">—</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Details({ s, reload }: { s: Staff; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("staff.update");
  const config = useQuery({ queryKey: ["staff-form-config"], queryFn: staffApi.formConfig });
  const subjects = useQuery({ queryKey: ["academic-subject-options"], queryFn: academicApi.subjectOptions });
  const others = useQuery({ queryKey: ["staff-options", "all"], queryFn: () => staffApi.options() });
  const [values, setValues] = useState<StaffValues>(() => staffValues(s));
  const [code, setCode] = useState(s.employeeCode);
  const [teaches, setTeaches] = useState<string[]>(s.teachableSubjectIds);
  const [reportsTo, setReportsTo] = useState(s.reportsTo?.id ?? "");
  const { busy, error, fieldErrors, run } = useRun();
  if (!config.data) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await staffApi.update(s.id, { ...toStaffFields(values), ...(config.data!.editable ? { employeeCode: code } : {}), teachableSubjectIds: teaches, reportsToId: reportsTo || null });
          await reload();
          return "Details saved";
        });
      }}
    >
      {error && <FormAlert>{error}</FormAlert>}
      <Section title="Employee">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Employee code" value={code} onChange={(e) => setCode(e.target.value)} error={fieldErrors.employeeCode} disabled={!config.data.editable || !canEdit} maxLength={40} />
          <Select
            label="Reports to"
            value={reportsTo}
            onChange={setReportsTo}
            disabled={!canEdit}
            error={fieldErrors.reportsToId}
            options={[{ value: "", label: "Nobody" }, ...(others.data ?? []).filter((o) => o.id !== s.id).map((o) => ({ value: o.id, label: `${o.name}${o.designation ? ` (${o.designation})` : ""}` }))]}
          />
        </div>
      </Section>
      <StaffFieldsForm values={values} onChange={setValues} config={config.data} errors={fieldErrors} disabled={busy || !canEdit} canSeeSensitive={s.sensitiveShown} />
      <Section title="Can teach">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(subjects.data ?? []).map((x) => (
            <Checkbox key={x.id} label={x.name} checked={teaches.includes(x.id)} disabled={!canEdit} onChange={(on) => setTeaches((l) => (on ? [...l, x.id] : l.filter((y) => y !== x.id)))} />
          ))}
        </div>
      </Section>
      {canEdit && (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setValues(staffValues(s))}>
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

function History({ s, reload }: { s: Staff; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("staff.update");
  const [quals, setQuals] = useState(() => qualRows(s));
  const [exp, setExp] = useState(() => expRows(s));
  const { busy, error, run } = useRun();
  return (
    <div className="space-y-6">
      {error && <FormAlert>{error}</FormAlert>}
      <Section title="Qualifications">
        <QualificationsEditor rows={quals} onChange={setQuals} disabled={!canEdit || busy} />
      </Section>
      <Section title="Previous experience">
        <ExperienceEditor rows={exp} onChange={setExp} disabled={!canEdit || busy} />
      </Section>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await staffApi.setQualifications(s.id, toQualifications(quals));
                await staffApi.setExperience(s.id, toExperience(exp));
                await reload();
                return "Saved";
              })
            }
          >
            {busy ? "Saving…" : "Save qualifications and experience"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Documents({ s, reload }: { s: Staff; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("staff.update");
  const { showToast } = useToast();
  const types = useQuery({ queryKey: ["master-options", "staff_document", null, null], queryFn: () => mastersApi.options("staff_document") });
  const required = useQuery({ queryKey: ["master-values", "staff_document", "required"], queryFn: () => mastersApi.values("staff_document", { pageSize: 100 }), enabled: can("masters.view") });
  const [typeId, setTypeId] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useRun();
  const have = new Set(s.documents.map((d) => d.type?.id).filter(Boolean));
  const missing = (required.data?.items ?? []).filter((t) => t.isActive && t.extra.required === true && !have.has(t.id));
  return (
    <div className="space-y-6">
      {error && <FormAlert>{error}</FormAlert>}
      {missing.length > 0 && <FormAlert tone="warning">Still needed: {missing.map((m) => m.name).join(", ")}</FormAlert>}
      {canEdit && (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-72">
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
                  await staffApi.addDocument(s.id, f.type.startsWith("image/") ? await resizeImage(f, 2000) : f, typeId || undefined);
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
                {d.fileName} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB
              </p>
            </div>
            <div className="flex gap-4">
              <button className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => staffApi.openDocument(s.id, d.id, d.fileName).catch((err) => showToast(errorMessage(err), "error"))}>
                Download
              </button>
              {canEdit && (
                <button className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70" onClick={() => run(async () => (await staffApi.removeDocument(s.id, d.id), await reload(), "Document removed"))}>
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

function LoginAndStatus({ s, reload }: { s: Staff; reload: () => Promise<void> }) {
  const { can } = useAuth();
  const canEdit = can("staff.update");
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: can("role.view") });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [login, setLogin] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [status, setStatus] = useState<StaffStatus>(s.status);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reasonId, setReasonId] = useState(s.relievingReason?.id ?? "");
  const [note, setNote] = useState(s.statusNote ?? "");
  const { busy, error, run } = useRun();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Login</h2>
        {error && <FormAlert>{error}</FormAlert>}
        {s.login ? (
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Username" value={<span className="font-mono">{s.login.username}</span>} />
            <Detail label="State" value={s.login.status === "active" ? "Can sign in" : "Switched off"} />
            <Detail label="Roles" value={s.login.roles.map((r) => r.name).join(", ") || "—"} />
            <Detail label="Last sign-in" value={s.login.lastLoginAt ? new Date(s.login.lastLoginAt).toLocaleString() : "Never"} />
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No login: this person can&apos;t sign in.</p>
        )}
        {s.login && (
          <Link href={`/users/${s.login.id}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Roles, password reset, unlock: open in Users
          </Link>
        )}
        {!s.login && canEdit && (
          <>
            {(roles.data ?? []).filter((r) => !r.isSystem).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(roles.data ?? [])
                  .filter((r) => !r.isSystem)
                  .map((r) => (
                    <Checkbox key={r.id} label={r.name} checked={roleIds.includes(r.id)} onChange={(on) => setRoleIds((l) => (on ? [...l, r.id] : l.filter((x) => x !== r.id)))} />
                  ))}
              </div>
            )}
            <Button disabled={busy} onClick={() => run(async () => (setLogin(await staffApi.createLogin(s.id, roleIds)), await reload()))}>
              Create login
            </Button>
          </>
        )}
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Status</h2>
        <p className="text-sm text-on-surface-variant">
          {STAFF_STATUS[s.status]}
          {s.statusDate && ` since ${showDate(s.statusDate)}`}
          {s.relievingReason && ` · ${s.relievingReason.name}`}
        </p>
        {canEdit && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Change to" value={status} onChange={(v) => setStatus(v as StaffStatus)} options={(Object.keys(STAFF_STATUS) as StaffStatus[]).map((v) => ({ value: v, label: STAFF_STATUS[v] }))} />
              {status !== "working" && <Input label="From" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
              {status !== "working" && <MasterSelect master="relieving_reason" label="Reason" value={reasonId} onChange={setReasonId} placeholder="Not given" />}
              {status !== "working" && <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />}
            </div>
            <p className="text-xs text-on-surface-variant/70">Someone not working can&apos;t sign in, and isn&apos;t offered as class or subject teacher.</p>
            <Button disabled={busy || (status === s.status && status === "working")} onClick={() => run(async () => (await staffApi.setStatus(s.id, { status, date, relievingReasonId: reasonId || null, note: note || null }), await reload(), "Status saved"))}>
              Save status
            </Button>
          </>
        )}
      </Card>
      {login && (
        <Modal isOpen onClose={() => setLogin(null)} title={`Login for ${s.name}`}>
          <div className="space-y-4">
            <p className="text-sm">
              Username <b className="font-mono">{login.username}</b> · one-time password <b className="font-mono">{login.temporaryPassword}</b>
            </p>
            <FormAlert tone="warning">The password is shown only now.</FormAlert>
            <div className="flex justify-end">
              <Button onClick={() => setLogin(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const TABS = [
  ["overview", "Overview"],
  ["details", "Details"],
  ["history-edit", "Qualifications & experience"],
  ["documents", "Documents"],
  ["login", "Login & status"],
  ["history", "History"],
] as const;

function StaffProfile({ id }: { id: string }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const staff = useQuery({ queryKey: ["staff-member", id], queryFn: () => staffApi.get(id) });
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const photo = useRef<HTMLInputElement>(null);
  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-member", id] });
    await queryClient.invalidateQueries({ queryKey: ["staff"] });
  };
  if (staff.isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (staff.isError || !staff.data) return <FormAlert>{errorMessage(staff.error)}</FormAlert>;
  const s = staff.data;
  const canEdit = can("staff.update");
  return (
    <>
      <PageHeader
        title={s.name}
        description={`${s.employeeCode}${s.designation ? ` · ${s.designation.name}` : ""}${s.department ? ` · ${s.department.name}` : ""}`}
        actions={
          <Link href="/staff" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All staff
          </Link>
        }
      />
      <div className="space-y-6 max-w-6xl">
        <Card className="flex flex-wrap items-center gap-5">
          <button type="button" disabled={!canEdit} onClick={() => photo.current?.click()} className="disabled:cursor-default">
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
                await staffApi.uploadPhoto(s.id, await resizeImage(f, 512));
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
              {s.status === "working" ? <Pill tone="success">Working</Pill> : <Pill tone="danger">{STAFF_STATUS[s.status]}</Pill>}
              {s.staffType && <Pill>{s.staffType.name}</Pill>}
              {s.login && s.login.status === "active" && <Pill tone="primary">Can sign in</Pill>}
            </div>
            <p className="text-sm text-on-surface-variant">
              Employee code <b className="font-mono">{s.employeeCode}</b> · joined {showDate(s.joiningDate)}
              {s.mobile && ` · ${s.mobile}`}
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
        {tab === "details" && <Details key={s.updatedAt} s={s} reload={reload} />}
        {tab === "history-edit" && <History key={s.updatedAt} s={s} reload={reload} />}
        {tab === "documents" && <Documents s={s} reload={reload} />}
        {tab === "login" && <LoginAndStatus key={s.updatedAt} s={s} reload={reload} />}
        {tab === "history" && <RecordHistory entity="staff" id={s.id} />}
      </div>
    </>
  );
}

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission permission="staff.view">
      <StaffProfile id={id} />
    </RequirePermission>
  );
}
