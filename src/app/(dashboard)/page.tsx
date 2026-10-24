"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { dashboardApi, DashboardWidget } from "@/lib/api/dashboard";
import { Widget } from "@/components/dashboard/Widget";
import { ActionCentre } from "@/components/dashboard/ActionCentre";
import { AddWidgets, Shortcuts } from "@/components/dashboard/Customise";
import { SetupChecklist } from "@/components/platform/SetupChecklist";

const greeting = () => {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const toSave = (xs: DashboardWidget[]) => xs.map((x) => ({ key: x.key, size: x.size, filter: x.filter ?? null }));

/** Home: the person's dashboard. "Waiting for you" on top; widgets they may arrange for themselves. */
export default function HomePage() {
  const { me, can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["my-dashboard"], queryFn: dashboardApi.mine, staleTime: 5 * 60_000 });
  const [editing, setEditing] = useState<DashboardWidget[] | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [links, setLinks] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const first = me.user.displayName.split(" ")[0];
  const widgets = editing ?? q.data?.widgets ?? [];

  const move = (from: number, to: number) =>
    setEditing((xs) => {
      if (!xs || to < 0 || to >= xs.length || from === to) return xs;
      const out = [...xs];
      const [it] = out.splice(from, 1);
      out.splice(to, 0, it);
      return out;
    });
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      queryClient.setQueryData(["my-dashboard"], await dashboardApi.saveMine(toSave(editing)));
      setEditing(null);
      showToast("Your dashboard is saved", "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!(await confirm({ title: "Go back to your role’s dashboard?", message: "Your own arrangement is removed; you see what the school set for your role. Your shortcuts are kept.", confirmLabel: "Reset" }))) return;
    try {
      queryClient.setQueryData(["my-dashboard"], await dashboardApi.resetMine());
      setEditing(null);
      showToast("Back to your role’s dashboard", "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  // A filter chosen on a personal dashboard is saved with it (on a role dashboard it stays in this browser).
  const remember = (key: string, value: string) => {
    if (editing) setEditing(editing.map((x) => (x.key === key ? { ...x, filter: value || null } : x)));
    else if (q.data?.personal) dashboardApi.saveMine(toSave(q.data.widgets.map((x) => (x.key === key ? { ...x, filter: value || null } : x)))).catch(() => undefined);
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">{today}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
            {greeting()}, {first}
          </h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">{me.school?.legalName}</p>
        </div>
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setAdding(true)}>
              Add widgets
            </Button>
            <Button variant="secondary" onClick={() => setLinks(true)}>
              My shortcuts
            </Button>
            {q.data?.personal && (
              <Button variant="tertiary" onClick={reset}>
                Reset
              </Button>
            )}
            <Button variant="tertiary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ["widget"] })} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              <span className="material-symbols-outlined text-base">refresh</span>
              Refresh
            </button>
            {q.data?.canCustomise && (
              <button type="button" onClick={() => setEditing(q.data!.widgets)} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                <span className="material-symbols-outlined text-base">tune</span>
                Customise
              </button>
            )}
            {q.data?.canBuild && (
              <Link href="/dashboard/widgets" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                <span className="material-symbols-outlined text-base">widgets</span>
                Widget Builder
              </Link>
            )}
            {q.data?.canSetUp && (
              <Link href="/dashboard/setup" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                <span className="material-symbols-outlined text-base">dashboard_customize</span>
                Role dashboards
              </Link>
            )}
          </div>
        )}
      </div>
      {editing && <FormAlert tone="info">Drag widgets (or use the arrows) to move them, S / M / L to resize, × to remove. Press Done to keep it.</FormAlert>}
      {!editing && can("school_profile.update") && <SetupChecklist />}
      {q.data?.actionCentre && !editing && <ActionCentre />}
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!q.data && !q.isError && <PageLoader />}
      {q.data && !widgets.length && (
        <Card className="text-center py-12 space-y-2">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">dashboard</span>
          <p className="font-semibold">Your dashboard is empty</p>
          <p className="text-sm text-on-surface-variant/70">{q.data.canCustomise ? "Choose Customise, then Add widgets." : "Your school hasn’t chosen widgets for your role yet. Use the menu to get started."}</p>
        </Card>
      )}
      {widgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 items-stretch mt-4">
          {widgets.map((w, i) => (
            <Widget
              key={w.key}
              w={w}
              onFilter={(v) => remember(w.key, v)}
              editing={
                editing
                  ? {
                      onSize: (size) => setEditing(editing.map((x) => (x.key === w.key ? { ...x, size } : x))),
                      onRemove: () => setEditing(editing.filter((x) => x.key !== w.key)),
                      onMove: (d) => move(i, i + d),
                      dragging: drag === i,
                      dragProps: {
                        draggable: true,
                        onDragStart: (e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDrag(i);
                        },
                        onDragOver: (e) => {
                          e.preventDefault();
                          if (drag !== null && drag !== i) {
                            move(drag, i);
                            setDrag(i);
                          }
                        },
                        onDragEnd: () => setDrag(null),
                        onDrop: (e) => e.preventDefault(),
                      },
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
      <AddWidgets
        open={adding}
        onClose={() => setAdding(false)}
        have={widgets.map((w) => w.key)}
        onAdd={(c) => {
          setEditing([...(editing ?? []), { key: c.key, label: c.label, type: c.type, size: c.size, href: c.href, filter: null }]);
          showToast(`${c.label} added at the end`, "success");
        }}
      />
      <Shortcuts
        open={links}
        onClose={() => setLinks(false)}
        onSaved={() => {
          setLinks(false);
          queryClient.invalidateQueries({ queryKey: ["widget", "quick_links"] });
          if (editing && !editing.some((x) => x.key === "quick_links")) setEditing([{ key: "quick_links", label: "My shortcuts", type: "list", size: "sm", href: null, filter: null }, ...editing]);
        }}
      />
    </>
  );
}
