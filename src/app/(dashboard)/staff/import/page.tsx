"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportStaffPage() {
  return (
    <RequirePermission permission="staff.import">
      <PageHeader
        title="Import staff"
        description="Add many staff at once from Excel. Employee codes and logins follow System Settings → Staff (or the Employee code and Can sign in columns)."
        actions={
          <Link href="/staff" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All staff
          </Link>
        }
      />
      <ImportWizard
        kind="staff"
        noun="staff"
        resultTitle="Added"
        resultWarning="The one-time passwords are shown only now. Download them and hand them over."
        done={{ href: "/staff", label: "See the staff" }}
      />
    </RequirePermission>
  );
}
