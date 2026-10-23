"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportChaptersPage() {
  return (
    <RequirePermission permission="syllabus.manage">
      <PageHeader
        title="Import chapters"
        description="Add the chapters of many subjects at once from Excel: class, subject, chapter and its topics."
        actions={
          <Link href="/questions/chapters" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Back to chapters
          </Link>
        }
      />
      <ImportWizard kind="chapters" noun="chapters" resultTitle="Imported" done={{ href: "/questions/chapters", label: "See the chapters" }} />
    </RequirePermission>
  );
}
