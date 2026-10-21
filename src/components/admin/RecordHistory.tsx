"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { auditApi } from "@/lib/api/audit";
import { errorMessage } from "@/lib/api/client";
import { AuditChanges, actionLabel } from "./AuditChanges";
import { formatDateTime } from "./labels";
import { PageLoader } from "@/components/ui/PageLoader";

/** "History" card on a record's page: the latest audit entries for it (needs audit.view). */
export function RecordHistory({ entity, id, title = "History" }: { entity: string; id: string; title?: string }) {
  const { can } = useAuth();
  const allowed = can("audit.view");
  const history = useQuery({ queryKey: ["history", entity, id], queryFn: () => auditApi.history(entity, id), enabled: allowed });
  if (!allowed) return null;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        <Link href="/audit" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-70">
          Audit trail
        </Link>
      </div>
      {history.isLoading && <PageLoader />}
      {history.isError && <p className="text-sm text-error">{errorMessage(history.error)}</p>}
      {history.data?.length === 0 && <p className="text-sm text-on-surface-variant/70">No changes recorded yet.</p>}
      <ol className="space-y-4">
        {history.data?.map((e) => (
          <li key={e.id} className="border-l-2 border-primary/20 pl-4">
            <p className="text-xs text-on-surface-variant/70">
              {formatDateTime(e.at)} · {e.user?.displayName ?? "System"}
            </p>
            <p className="text-sm font-bold text-on-surface">{actionLabel(e.action)}</p>
            <div className="mt-1">
              <AuditChanges entry={e} />
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
