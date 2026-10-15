"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { schoolApi, SchoolProfile, SchoolProfileUpdate } from "@/lib/api/school";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";

type FormValues = Record<string, string>;

const TEXT_FIELDS = [
  "legalName", "shortName", "board", "affiliationNo", "udiseCode", "addressLine1", "addressLine2", "city", "district",
  "state", "pincode", "country", "phone", "email", "website", "timeZone", "dateFormat", "currency",
] as const;
const NUMBER_FIELDS = ["establishedYear", "academicYearStartMonth"] as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE_FORMATS = ["DD-MM-YYYY", "DD/MM/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"];
const COMMON_TIME_ZONES = ["Asia/Kolkata", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];

const toForm = (p: SchoolProfile): FormValues => {
  const v: FormValues = {};
  for (const k of TEXT_FIELDS) v[k] = (p[k] as string | null) ?? "";
  for (const k of NUMBER_FIELDS) v[k] = p[k] == null ? "" : String(p[k]);
  return v;
};

/** Only what changed, typed as the API expects ("" clears a text field). */
const diff = (original: FormValues, current: FormValues): SchoolProfileUpdate => {
  const out: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) if (current[k] !== original[k]) out[k] = current[k].trim();
  for (const k of NUMBER_FIELDS) {
    if (current[k] !== original[k]) out[k] = current[k] === "" ? null : Number(current[k]);
  }
  return out as SchoolProfileUpdate;
};

export default function SchoolProfilePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { reloadMe, reloadAccess, can } = useAuth();
  const canEdit = can("school_profile.update");
  const profile = useQuery({ queryKey: ["school-profile"], queryFn: schoolApi.profile });

  const original = useMemo(() => (profile.data ? toForm(profile.data) : null), [profile.data]);
  const [values, setValues] = useState<FormValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (original) setValues(original);
  }, [original]);

  if (profile.isLoading || !values || !original || !profile.data) {
    return (
      <>
        <PageHeader title="School Profile" />
        {profile.isError ? <FormAlert>{errorMessage(profile.error)}</FormAlert> : <p className="text-sm text-on-surface-variant">Loading…</p>}
      </>
    );
  }

  const changes = diff(original, values);
  const dirty = Object.keys(changes).length > 0;
  const set = (k: string) => (v: string) => setValues((cur) => ({ ...cur!, [k]: v }));
  const field = (k: string, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Input label={label} value={values[k]} error={fieldErrors[k]} onChange={(e) => set(k)(e.target.value)} disabled={busy} readOnly={!canEdit} {...extra} />
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setError(null);
    setConflict(false);
    setFieldErrors({});
    try {
      const saved = await schoolApi.updateProfile({ ...changes, updatedAt: profile.data!.updatedAt });
      queryClient.setQueryData(["school-profile"], saved);
      showToast("School profile saved", "success");
      if ("legalName" in changes || "shortName" in changes) await Promise.all([reloadMe(), reloadAccess()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setConflict(true);
      else if (err instanceof ApiError && err.status === 403) setError("You can view the school profile but not change it.");
      else {
        setError(errorMessage(err));
        setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      }
    } finally {
      setBusy(false);
    }
  };

  const tzOptions = COMMON_TIME_ZONES.includes(values.timeZone) ? COMMON_TIME_ZONES : [values.timeZone, ...COMMON_TIME_ZONES];

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="School Profile"
        description="Shown on headers, reports, receipts and ID cards."
        actions={
          canEdit && (<div className="flex gap-3">
            <Button type="button" variant="secondary" disabled={!dirty || busy} onClick={() => setValues(original)}>
              Discard changes
            </Button>
            <div className="w-40">
              <SubmitButton busy={busy} busyLabel="Saving…" disabled={!dirty} className="gradient-primary py-2.5">
                Save
              </SubmitButton>
            </div>
          </div>)
        }
      />
      {!canEdit && (
        <div className="max-w-5xl mb-6">
          <FormAlert tone="info">You can view the school profile. Changing it needs the “Edit the school’s name, address, board and formats” permission.</FormAlert>
        </div>
      )}

      <div className="space-y-6 max-w-5xl">
        {conflict && (
          <FormAlert tone="warning">
            Someone else saved the school profile after you opened it.{" "}
            <button
              type="button"
              className="underline font-bold"
              onClick={async () => {
                setConflict(false);
                await profile.refetch();
              }}
            >
              Load their version
            </button>{" "}
            (your unsaved changes will be lost).
          </FormAlert>
        )}
        {error && <FormAlert>{error}</FormAlert>}

        <Card className="space-y-6">
          <h2 className="text-lg font-bold text-primary">School</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {field("legalName", "Full name")}
            {field("shortName", "Short name (header, sidebar)")}
            {field("board", "Board (CBSE, ICSE, State…)")}
            {field("affiliationNo", "Affiliation number")}
            {field("udiseCode", "UDISE code", { inputMode: "numeric" })}
            {field("establishedYear", "Established (year)", { inputMode: "numeric", maxLength: 4 })}
          </div>
        </Card>

        <Card className="space-y-6">
          <h2 className="text-lg font-bold text-primary">Address and contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {field("addressLine1", "Address line 1")}
            {field("addressLine2", "Address line 2")}
            {field("city", "City / town")}
            {field("district", "District")}
            {field("state", "State")}
            {field("pincode", "PIN code", { inputMode: "numeric" })}
            {field("country", "Country")}
            {field("phone", "Phone", { inputMode: "tel" })}
            {field("email", "Email", { type: "email" })}
            {field("website", "Website", { placeholder: "https://" })}
          </div>
        </Card>

        <Card className="space-y-6">
          <h2 className="text-lg font-bold text-primary">Calendar and formats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Academic year starts in"
              value={values.academicYearStartMonth}
              onChange={set("academicYearStartMonth")}
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
              error={fieldErrors.academicYearStartMonth}
              disabled={busy || !canEdit}
            />
            <Select label="Date format" value={values.dateFormat} onChange={set("dateFormat")} options={DATE_FORMATS.map((d) => ({ value: d, label: d }))} error={fieldErrors.dateFormat} disabled={busy || !canEdit} />
            <Select label="Time zone" value={values.timeZone} onChange={set("timeZone")} options={tzOptions.map((t) => ({ value: t, label: t }))} error={fieldErrors.timeZone} disabled={busy || !canEdit} />
            {field("currency", "Currency (3-letter code)", { maxLength: 3 })}
          </div>
        </Card>
      </div>
    </form>
  );
}
