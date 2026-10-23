"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { examsApi, ScopeKind } from "@/lib/api/exams";

/** Students and parents: the published results, each opening its report card. */
function Mine() {
  const q = useQuery({ queryKey: ["my-results"], queryFn: examsApi.mine });
  const [open, setOpen] = useState<{ scope: ScopeKind; id: string; student: string; title: string } | null>(null);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data) return <PageLoader />;
  return (
    <>
      <PageHeader title="Results" description="Report cards appear here once the school publishes them." />
      <div className="space-y-6">
        {q.data.map((c) => (
          <Card key={c.student.id} className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">{c.student.name}</h3>
            {!c.cards.length && <p className="text-sm text-on-surface-variant/70">No results published yet.</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {c.cards.map((card) => (
                <button key={`${card.scope}-${card.id}`} type="button" onClick={() => setOpen({ scope: card.scope, id: card.id, student: c.student.id, title: `${card.label} · ${c.student.name}` })} className="text-left">
                  <div className="rounded-xl border border-outline-variant/30 px-4 py-3 hover:bg-surface-container-low">
                    <p className="font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">workspace_premium</span>
                      {card.label}
                    </p>
                    <p className="text-xs text-on-surface-variant/70">{card.year} · report card</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        ))}
        {!q.data.length && <Card className="text-center text-on-surface-variant/70 py-12">No student is linked to your login.</Card>}
      </div>
      {open && <DocumentViewer docKey="report_card" params={{ scope: open.scope, id: open.id, student: open.student }} title={open.title} filename="report-card.pdf" onClose={() => setOpen(null)} />}
    </>
  );
}

export default function MyResultsPage() {
  return (
    <RequirePermission permission="exam.mine">
      <Mine />
    </RequirePermission>
  );
}
