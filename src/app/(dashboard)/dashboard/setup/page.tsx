"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MoveButtons } from "@/components/ui/MoveButtons";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { CatalogueWidget, dashboardApi, SIZE_LABEL, WidgetSize } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";
import { Widget } from "@/components/dashboard/Widget";
import { APP_HOME } from "@/lib/auth/home";
import { arrayMove, SortableItem, SortableList } from "@/components/ui/Sortable";

const TYPE_ICON: Record<CatalogueWidget["type"], string> = { stat: "looks_one", chart: "bar_chart", donut: "donut_large", list: "list" };
const SPAN: Record<WidgetSize, string> = { sm: "col-span-1", md: "col-span-2", lg: "col-span-4" };

type Item = { key: string; size: WidgetSize };

/** Choosing each role’s dashboard: which widgets, their order and size. */
function Setup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const roles = useQuery({ queryKey: ["dash-roles"], queryFn: dashboardApi.roles });
  const catalogue = useQuery({ queryKey: ["dash-catalogue"], queryFn: dashboardApi.catalogue, staleTime: 10 * 60_000 });
  const [roleId, setRoleId] = useState("");
  const layout = useQuery({ queryKey: ["dash-layout", roleId], queryFn: () => dashboardApi.layout(roleId), enabled: !!roleId });
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!roleId && roles.data?.length) setRoleId((roles.data.find((r) => r.slug === "principal") ?? roles.data[0]).id);
  }, [roles.data, roleId]);
  useEffect(() => {
    if (layout.data) setItems(layout.data.widgets.map((w) => ({ key: w.key, size: w.size })));
  }, [layout.data]);

  const byKey = useMemo(() => new Map((catalogue.data ?? []).map((w) => [w.key, w])), [catalogue.data]);
  const hiddenFor = useMemo(() => new Map((layout.data?.widgets ?? []).map((w) => [w.key, w.hiddenFor])), [layout.data]);
  const saved = JSON.stringify(layout.data?.widgets.map((w) => ({ key: w.key, size: w.size })) ?? []);
  const dirty = !!items && JSON.stringify(items) !== saved;
  const categories = useMemo(() => {
    const m = new Map<string, CatalogueWidget[]>();
    for (const w of catalogue.data ?? []) m.set(w.category, [...(m.get(w.category) ?? []), w]);
    return Array.from(m.entries());
  }, [catalogue.data]);

  const choose = async (id: string) => {
    if (dirty && !(await confirm({ title: "Leave without saving?", message: "Your changes to this role’s dashboard will be lost.", confirmLabel: "Leave", danger: true }))) return;
    setItems(null);
    setRoleId(id);
  };
  const move = (i: number, d: "up" | "down") =>
    setItems((xs) => {
      if (!xs) return xs;
      const j = d === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= xs.length) return xs;
      const out = [...xs];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  const save = async () => {
    if (!items) return;
    setBusy(true);
    try {
      await dashboardApi.save(roleId, items);
      showToast(`${layout.data?.role.name}: dashboard saved`, "success");
      queryClient.invalidateQueries({ queryKey: ["dash-layout", roleId] });
      queryClient.invalidateQueries({ queryKey: ["dash-roles"] });
      queryClient.invalidateQueries({ queryKey: ["my-dashboard"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!(await confirm({ title: `Use the built-in dashboard for ${layout.data?.role.name}?`, message: "The widgets chosen here are replaced by the ones the system suggests for this role.", confirmLabel: "Use built-in" }))) return;
    try {
      await dashboardApi.reset(roleId);
      showToast("Back to the built-in dashboard", "success");
      queryClient.invalidateQueries({ queryKey: ["dash-layout", roleId] });
      queryClient.invalidateQueries({ queryKey: ["dash-roles"] });
      queryClient.invalidateQueries({ queryKey: ["my-dashboard"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (roles.isError) return <FormAlert>{errorMessage(roles.error)}</FormAlert>;
  if (!roles.data || !catalogue.data) return <PageLoader />;
  const role = roles.data.find((r) => r.id === roleId);

  return (
    <>
      <PageHeader
        title="Dashboard Setup"
        description="Choose what each role sees on its home page. A person with several roles sees all of their widgets (each once), and a widget only shows to people whose permissions allow it."
        actions={
          <Link href={APP_HOME} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            My dashboard
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4 min-w-0">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <Select label="Role" value={roleId} onChange={choose} options={roles.data.map((r) => ({ value: r.id, label: `${r.name}${r.customised ? " · set by the school" : ""}` }))} className="w-full sm:w-72" />
              {layout.data && <Pill tone={layout.data.customised ? "primary" : "neutral"}>{layout.data.customised ? "Set by the school" : "Built-in"}</Pill>}
              <div className="flex flex-wrap gap-3 sm:ml-auto">
                {layout.data?.customised && (
                  <Button variant="secondary" onClick={reset}>
                    Use built-in
                  </Button>
                )}
                <Button onClick={save} loading={busy} disabled={!dirty}>
                  Save
                </Button>
              </div>
            </div>
            {role && !role.hasDefault && !layout.data?.customised && <FormAlert tone="info">This role has no built-in dashboard: add the widgets its people should see.</FormAlert>}
          </Card>

          {!items && <PageLoader />}
          {items && (
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary">On the dashboard ({items.length})</h3>
                {dirty && <Pill tone="warning">Not saved</Pill>}
              </div>
              <div className="divide-y divide-outline-variant/10 mt-3">
                <SortableList ids={items.map((it) => it.key)} onDrop={(d) => setItems((xs) => arrayMove(xs!, d.from, d.to))}>
                {items.map((it, i) => {
                  const w = byKey.get(it.key);
                  const hidden = hiddenFor.get(it.key);
                  return (
                    <SortableItem key={it.key} id={it.key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <MoveButtons label={w?.label ?? it.key} position={i + 1} first={i === 0} last={i === items.length - 1} onMove={(d) => move(i, d)} />
                      <span className="material-symbols-outlined text-on-surface-variant/60">{w ? TYPE_ICON[w.type] : "widgets"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{w?.label ?? it.key}</p>
                        <p className="text-[11px] text-on-surface-variant/70">{w?.category}</p>
                        {hidden && <p className="text-[11px] font-semibold text-amber-700">This role can’t see it ({hidden}).</p>}
                      </div>
                      <Select value={it.size} onChange={(v) => setItems((xs) => xs!.map((x, k) => (k === i ? { ...x, size: v as WidgetSize } : x)))} options={(Object.keys(SIZE_LABEL) as WidgetSize[]).map((s) => ({ value: s, label: SIZE_LABEL[s] }))} className="w-44" />
                      <button type="button" onClick={() => setItems((xs) => xs!.filter((_, k) => k !== i))} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                        Remove
                      </button>
                    </SortableItem>
                  );
                })}
                </SortableList>
                {!items.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">No widgets. Add some from the list.</p>}
              </div>
            </Card>
          )}

          {items && items.length > 0 && (
            <Card>
              <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">How it will look</h3>
              <div className="grid grid-cols-4 gap-2">
                {items.map((it) => (
                  <div key={it.key} className={cn("rounded-lg border border-outline-variant/30 bg-surface-container-low px-2 py-3 text-[11px] font-semibold truncate", SPAN[it.size], hiddenFor.get(it.key) && "opacity-40 line-through")}>
                    {byKey.get(it.key)?.label ?? it.key}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant/60 mt-2">On a laptop: four columns. On a phone the widgets stack one under another.</p>
              <button type="button" onClick={() => setLive((v) => !v)} className="mt-3 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                {live ? "Hide live preview" : "Show live preview"}
              </button>
            </Card>
          )}

          {live && items && (
            <div className="space-y-3">
              <FormAlert tone="info">The widgets this role sees, in this order and size. The numbers are worked out for you (a teacher sees their own classes, a parent their children).</FormAlert>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                {items
                  .filter((it) => !hiddenFor.get(it.key) && byKey.get(it.key))
                  .map((it) => {
                    const w = byKey.get(it.key)!;
                    return <Widget key={`${roleId}-${it.key}`} w={{ key: w.key, label: w.label, type: w.type, size: it.size, href: w.href }} />;
                  })}
              </div>
            </div>
          )}
        </div>

        <Card className="space-y-5 h-fit">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">Add widgets</h3>
          {categories.map(([cat, list]) => (
            <div key={cat}>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">{cat}</p>
              <div className="space-y-2">
                {list.map((w) => {
                  const on = !!items?.some((x) => x.key === w.key);
                  return (
                    <div key={w.key} className={cn("rounded-xl border px-3 py-2.5", on ? "border-primary/30 bg-primary/5" : "border-outline-variant/30")}>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base text-on-surface-variant/60 mt-0.5">{TYPE_ICON[w.type]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{w.label}</p>
                          <p className="text-[11px] text-on-surface-variant/70">{w.description}</p>
                          {!!w.permissions.length && <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Needs: {w.permissions.join(" or ")}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={!items}
                          onClick={() => setItems((xs) => (on ? xs!.filter((x) => x.key !== w.key) : [...(xs ?? []), { key: w.key, size: w.size }]))}
                          className={cn("shrink-0 text-xs font-bold uppercase tracking-widest hover:opacity-70", on ? "text-error" : "text-primary")}
                        >
                          {on ? "Remove" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

export default function DashboardSetupPage() {
  return (
    <RequirePermission permission="dashboard.setup">
      <Setup />
    </RequirePermission>
  );
}
