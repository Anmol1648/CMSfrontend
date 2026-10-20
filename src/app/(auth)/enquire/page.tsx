"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { FormAlert, Select, SubmitButton } from "@/components/forms";
import { admissionsApi } from "@/lib/api/admissions";
import { ApiError, errorMessage } from "@/lib/api/client";

/** The school website's admission enquiry form (no login). Switched on in System Settings → Admissions. */
export default function EnquirePage() {
  const form = useQuery({ queryKey: ["public-enquiry-form"], queryFn: admissionsApi.publicForm, retry: false });
  const [v, setV] = useState({ classId: "", studentFirstName: "", studentLastName: "", dateOfBirth: "", parentName: "", mobile: "", email: "", area: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null | undefined>(undefined);
  const text = (k: keyof typeof v) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }), error: errors[k] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim() || null]));
      const r = await admissionsApi.submitPublic({ ...body, website: v.website });
      setSent(r.enquiryNo);
    } catch (err) {
      setError(errorMessage(err));
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  if (form.isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (form.isError || !form.data?.enabled) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-primary tracking-tight">Admission enquiry</h1>
        <FormAlert tone="info">The school doesn&apos;t take enquiries online at the moment. Please call or visit the school office.</FormAlert>
      </div>
    );
  }

  if (sent !== undefined) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-primary tracking-tight">Thank you</h1>
        <FormAlert tone="success">
          Your enquiry has reached the school{sent ? <> (number <b className="font-mono">{sent}</b>)</> : ""}. The admission office will call you on the mobile number you gave.
        </FormAlert>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight">Admission enquiry</h1>
        <p className="text-sm text-on-surface-variant mt-2">{form.data.academicYear ? `For the session ${form.data.academicYear.name}. ` : ""}Leave your details and the school will call you.</p>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <Select
        label="Class *"
        value={v.classId}
        onChange={(classId) => setV({ ...v, classId })}
        error={errors.classId}
        options={[{ value: "", label: "Choose the class…" }, ...form.data.classes.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Child's first name *" maxLength={80} {...text("studentFirstName")} />
        <Input label="Last name" maxLength={80} {...text("studentLastName")} />
      </div>
      <Input label="Child's date of birth" type="date" {...text("dateOfBirth")} />
      <Input label="Parent's name *" maxLength={120} {...text("parentName")} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Mobile *" inputMode="tel" maxLength={20} {...text("mobile")} />
        <Input label="Email" type="email" maxLength={120} {...text("email")} />
      </div>
      <Input label="Area / locality" maxLength={120} {...text("area")} />
      <TextArea label="Anything you'd like to ask" rows={3} maxLength={1000} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} error={errors.message} />
      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <SubmitButton busy={busy} busyLabel="Sending…" disabled={!v.classId || !v.studentFirstName.trim() || !v.parentName.trim() || !v.mobile.trim()}>
        Send enquiry
      </SubmitButton>
      <p className="text-center text-xs text-on-surface-variant/60">
        Staff and parents with a login?{" "}
        <Link href="/login" className="font-bold text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
