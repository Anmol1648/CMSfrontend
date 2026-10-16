"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportSubjectsPage() {
  return (
    <RequirePermission permission="academic.manage">
      <PageHeader
        title="Import subjects"
        description="Add many subjects at once from Excel. A row with the name of an existing subject updates it."
        actions={
          <Link href="/academic/subjects" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Back to subjects
          </Link>
        }
      />
      <ImportWizard kind="subjects" noun="subjects" resultTitle="Imported" done={{ href: "/academic/subjects", label: "See the subjects" }} />
    </RequirePermission>
  );
}
