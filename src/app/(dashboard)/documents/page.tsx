"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { documentsApi, PAPER_SIZES } from "@/lib/api/documents";
import { errorMessage } from "@/lib/api/client";

function Documents() {
  const list = useQuery({ queryKey: ["documents"], queryFn: documentsApi.list });
  if (list.isError) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data) return <PageLoader />;
  return (
    <>
      <PageHeader
        title="Document templates"
        description="The school's printed documents: receipts, slips and (as modules come) certificates and report cards. Each is made as a PDF on the server, so it looks the same everywhere. Change the wording and layout here and see it at once."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.data.map((d) => (
          <Link key={d.key} href={`/documents/${d.key}`} className="block">
            <Card className="h-full hover:shadow-md hover:ring-2 hover:ring-primary/10 transition-all">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <h3 className="font-black text-primary">{d.label}</h3>
                {d.custom ? <Pill tone="primary">Changed</Pill> : <Pill>Built-in</Pill>}
              </div>
              <p className="text-sm text-on-surface-variant">{d.description}</p>
              <p className="text-xs text-on-surface-variant/60 mt-3">
                {PAPER_SIZES[d.paper.size]} · {d.paper.copies.join(" + ")}
                {d.updatedAt ? ` · changed ${new Date(d.updatedAt).toLocaleDateString("en-IN")}` : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function DocumentsPage() {
  return (
    <RequirePermission permission="documents.manage">
      <Documents />
    </RequirePermission>
  );
}
