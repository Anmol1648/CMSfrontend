"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { SHOW_AS, widgetsApi } from "@/lib/api/widgets";

function List() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["custom-widgets"], queryFn: widgetsApi.list });
  const roles = useQuery({ queryKey: ["custom-widget-roles"], queryFn: widgetsApi.roles });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const roleName = (id: string) => roles.data?.find((r) => r.id === id)?.name ?? "";
  return (
    <div className="space-y-4">
      <FormAlert tone="info">
        A widget you make here appears under <b>Customise → Add widgets</b> (group “Made here”) for you, other widget makers, and the roles you share it with. Each person sees it worked out on the data they may see. You can also put it on a role’s dashboard in Dashboard Setup.
      </FormAlert>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {q.data!.map((w) => (
          <Card key={w.id} className={w.isActive ? "" : "opacity-60"}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined rounded-xl bg-primary/10 p-2 text-primary">{SHOW_AS.find((s) => s.value === w.definition.display.type)?.icon ?? "widgets"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{w.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {w.source} · {SHOW_AS.find((s) => s.value === w.definition.display.type)?.label}
                  {w.maker ? ` · by ${w.maker}` : ""}
                </p>
                {w.description && <p className="mt-1 text-sm">{w.description}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {!w.isActive && <Pill>Switched off</Pill>}
              {w.roleIds.length ? w.roleIds.map((id) => <Pill key={id} tone="primary">{roleName(id)}</Pill>) : <Pill>Only widget makers</Pill>}
            </div>
            <div className="mt-3 flex justify-end gap-3 text-xs font-bold uppercase tracking-widest">
              <button
                type="button"
                className="text-error hover:opacity-70"
                onClick={async () => {
                  if (!(await confirm({ title: `Delete “${w.name}”?`, message: "It disappears from every dashboard it is on.", confirmLabel: "Delete", danger: true }))) return;
                  try {
                    await widgetsApi.remove(w.id);
                    qc.invalidateQueries({ queryKey: ["custom-widgets"] });
                    qc.invalidateQueries({ queryKey: ["my-dashboard"] });
                    showToast("Deleted", "success");
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                Delete
              </button>
              <Link href={`/dashboard/widgets/edit?copy=${w.id}`} className="text-primary hover:opacity-70">
                Copy
              </Link>
              <Link href={`/dashboard/widgets/edit?id=${w.id}`} className="text-primary hover:opacity-70">
                Edit
              </Link>
            </div>
          </Card>
        ))}
        <Link href="/dashboard/widgets/edit" className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/50 text-primary hover:bg-surface-container">
          <span className="material-symbols-outlined text-3xl">add</span>
          <span className="text-sm font-bold">Make a widget</span>
        </Link>
      </div>
    </div>
  );
}

export default function WidgetBuilderPage() {
  return (
    <RequirePermission permission="dashboard.build">
      <PageHeader title="Widget Builder" description="Make your own dashboard widgets, as many as you need: pick the data, the conditions, and show it as a number, chart, donut or list." />
      <List />
    </RequirePermission>
  );
}
