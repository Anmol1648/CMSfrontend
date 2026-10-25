"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { EnquiryForm, EnquiryValues, emptyEnquiry, toEnquiryInput } from "@/components/admissions/EnquiryForm";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { admissionsApi } from "@/lib/api/admissions";
import { ApiError, errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";
import type { CustomValues } from "@/lib/api/forms";

function NewEnquiry() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const config = useQuery({ queryKey: ["enquiry-form-config"], queryFn: admissionsApi.formConfig });
  const [values, setValues] = useState<EnquiryValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<CustomValues>({});

  useEffect(() => {
    if (config.data && !values) setValues(emptyEnquiry(config.data.followUpDays));
  }, [config.data, values]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const r = await admissionsApi.create({ ...toEnquiryInput(values, { includeFollowUp: true }), custom });
      await queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      await queryClient.invalidateQueries({ queryKey: ["enquiry-summary"] });
      showToast(r.warning ?? `Enquiry ${r.enquiry.enquiryNo} added`, r.warning ? "warning" : "success");
      router.push(`/admissions/${r.enquiry.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (!values || !config.data) return <PageLoader />;

  return (
    <>
      <PageHeader
        title="New enquiry"
        description={`The enquiry number is given on saving (next: ${config.data.numbers.enquiryNo}). Only the class, the child's first name, the parent's name and mobile are needed.`}
        actions={
          <Link href="/admissions" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All enquiries
          </Link>
        }
      />
      <form onSubmit={submit} noValidate className="space-y-6 max-w-5xl">
        {error && <FormAlert>{error}</FormAlert>}
        <EnquiryForm values={values} onChange={setValues} errors={fieldErrors} custom={custom} onCustomChange={setCustom} />
        <div className="flex justify-end gap-3">
          <Link href="/admissions" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest">
            Cancel
          </Link>
          <Button type="submit" disabled={busy || !values.classId || !values.studentFirstName.trim() || !values.parentName.trim() || !values.mobile.trim()}>
            {busy ? "Saving…" : "Save enquiry"}
          </Button>
        </div>
      </form>
    </>
  );
}

export default function NewEnquiryPage() {
  return (
    <RequirePermission permission="enquiry.manage">
      <NewEnquiry />
    </RequirePermission>
  );
}
