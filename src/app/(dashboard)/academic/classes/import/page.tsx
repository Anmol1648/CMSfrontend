"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportSectionsPage() {
  return (
    <RequirePermission permission="academic.manage">
      <PageHeader
        title="Import sections"
        description="Set up many sections at once from Excel: year, class, section, stream, capacity, room and class teacher. A row for an existing section updates it."
        actions={
          <Link href="/academic/classes" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Back to classes
          </Link>
        }
      />
      <ImportWizard kind="sections" noun="sections" resultTitle="Imported" done={{ href: "/academic/classes", label: "See the classes" }} />
    </RequirePermission>
  );
}
