"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { FormAlert } from "@/components/forms";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { mastersApi } from "@/lib/api/masters";
import { PageLoader } from "@/components/ui/PageLoader";

/** Excel import of one master list (Configuration → Masters → Import). */
function ImportMaster({ masterKey }: { masterKey: string }) {
  const catalogue = useQuery({ queryKey: ["masters"], queryFn: mastersApi.catalogue });
  const info = catalogue.data?.flatMap((g) => g.masters).find((m) => m.key === masterKey);
  const back = `/masters?list=${masterKey}`;

  if (catalogue.isLoading) return <PageLoader />;
  if (!info) return <FormAlert>This list doesn&apos;t exist.</FormAlert>;

  return (
    <>
      <PageHeader
        title={`Import ${info.plural.toLowerCase()}`}
        description="Add many options at once from Excel. A row whose name matches an existing option updates it; the others are added."
        actions={
          <Link href={back} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Back to {info.plural.toLowerCase()}
          </Link>
        }
      />
      {!info.canManage ? (
        <FormAlert>You can see this list but not change it.</FormAlert>
      ) : (
        <ImportWizard kind={`master-${info.key}`} noun="options" resultTitle="Imported" done={{ href: back, label: `See the ${info.plural.toLowerCase()}` }} />
      )}
    </>
  );
}

export default function ImportMasterPage() {
  const { key } = useParams<{ key: string }>();
  return (
    <RequirePermission permission="masters.view">
      <ImportMaster masterKey={key} />
    </RequirePermission>
  );
}
