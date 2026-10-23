"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportQuestionsPage() {
  return (
    <RequirePermission permission="question.add">
      <PageHeader
        title="Import questions"
        description="Add many questions at once from Excel: every kind, with choices, the correct answer, marks and difficulty."
        actions={
          <Link href="/questions" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Back to the question bank
          </Link>
        }
      />
      <ImportWizard kind="questions" noun="questions" resultTitle="Imported" done={{ href: "/questions", label: "See the question bank" }} />
    </RequirePermission>
  );
}
