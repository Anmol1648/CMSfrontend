"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportUsersPage() {
  return (
    <RequirePermission permission="user.create">
      <PageHeader
        title="Import users"
        description="Add many people at once from an Excel file. Each gets a one-time password and must choose their own at first sign-in."
        actions={
          <Link href="/users" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All users
          </Link>
        }
      />
      <ImportWizard
        kind="users"
        noun="users"
        resultTitle="Sign-in details"
        resultWarning="The one-time passwords are shown only now. Download them and hand them over; people with an email address were also sent theirs."
      />
    </RequirePermission>
  );
}
