"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportStudentsPage() {
  return (
    <RequirePermission permission="student.import">
      <PageHeader
        title="Import students"
        description="Admit many students at once from Excel, into the current academic year. Students with the same father or mother mobile are linked as siblings. Admission numbers, roll numbers and logins follow System Settings → Students."
        actions={
          <Link href="/students" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All students
          </Link>
        }
      />
      <ImportWizard
        kind="students"
        noun="students"
        resultTitle="Admitted"
        resultWarning="The one-time passwords of the student logins are shown only now. Download them and hand them over."
        done={{ href: "/students", label: "See the students" }}
      />
    </RequirePermission>
  );
}
