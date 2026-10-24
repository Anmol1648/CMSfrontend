"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { menuApi, MenuGroupSetup, MenuItemSetup, MenuSetup } from "@/lib/api/settings";

type G = MenuGroupSetup & { name: string; order: number };
type I = MenuItemSetup & { name: string; ico: string; group: string; order: number };

const toState = (d: MenuSetup) => ({
  groups: d.groups.map((g) => ({ ...g, name: g.label ?? g.defaultLabel, order: g.sortOrder ?? g.defaultOrder })).sort((a, b) => a.order - b.order) as G[],
  items: d.items.map((i) => ({ ...i, name: i.label ?? i.defaultLabel, ico: i.icon ?? i.defaultIcon, group: i.groupKey ?? i.defaultGroup, order: i.sortOrder ?? i.defaultOrder })) as I[],
});

/** Renumbers a list 10, 20, 30… in its current order (so moves are saved as positions). */
const renumber = <T extends { order: number }>(xs: T[]) => xs.map((x, n) => ({ ...x, order: (n + 1) * 10 }));

function Preview({ roles }: { roles: { id: string; name: string }[] }) {
  const [roleId, setRoleId] = useState("");
  const q = useQuery({ queryKey: ["menu-preview", roleId], queryFn: () => menuApi.preview(roleId), enabled: !!roleId });
  return (
    <Card className="space-y-3">
      <p className="font-bold">See it as a role</p>
      <Select value={roleId} onChange={setRoleId} options={[{ value: "", label: "Choose a role…" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
      <p className="text-xs text-on-surface-variant">Shows the saved menu. Save first to see your changes.</p>
      {q.data && (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-xl bg-surface-container-low p-3">
          {q.data.map((g) => (
            <div key={g.key}>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/50">{g.label}</p>
              {g.items.map((i) => (
                <p key={i.key} className="flex items-center gap-2 py-0.5 text-sm">
                  <span className="material-symbols-outlined text-base text-on-surface-variant">{i.icon}</span>
                  {i.label}
                </p>
              ))}
            </div>
          ))}
          {!q.data.length && <p className="text-sm text-on-surface-variant">This role sees no menu items.</p>}
        </div>
      )}
    </Card>
  );
}

function Setup() {
  const qc = useQueryClient();
  const { reloadAccess } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["menu-setup"], queryFn: menuApi.get });
  const [groups, setGroups] = useState<G[]>([]);
  const [items, setItems] = useState<I[]>([]);
  const [dirty, setDirty] = useState(false);
  const [find, setFind] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!q.data) return;
    const s = toState(q.data);
    setGroups(s.groups);
    setItems(s.items);
    setDirty(false);
  }, [q.data]);
  const byGroup = useMemo(() => {
    const t = find.trim().toLowerCase();
    return (key: string) => items.filter((i) => i.group === key && (!t || i.name.toLowerCase().includes(t) || i.defaultLabel.toLowerCase().includes(t) || i.href.includes(t))).sort((a, b) => a.order - b.order);
  }, [items, find]);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;

  const change = () => setDirty(true);
  const moveGroup = (key: string, d: -1 | 1) => {
    const xs = [...groups];
    const i = xs.findIndex((g) => g.key === key);
    const j = i + d;
    if (j < 0 || j >= xs.length) return;
    [xs[i], xs[j]] = [xs[j], xs[i]];
    setGroups(renumber(xs));
    change();
  };
  const moveItem = (key: string, d: -1 | 1) => {
    const it = items.find((x) => x.key === key)!;
    const list = items.filter((x) => x.group === it.group).sort((a, b) => a.order - b.order);
    const i = list.findIndex((x) => x.key === key);
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const re = new Map(renumber(list).map((x) => [x.key, x.order]));
    setItems(items.map((x) => (re.has(x.key) ? { ...x, order: re.get(x.key)! } : x)));
    change();
  };
  const setItem = (key: string, v: Partial<I>) => {
    setItems(items.map((x) => {
      if (x.key !== key) return x;
      // Moved to another group: goes to its end.
      const order = v.group && v.group !== x.group ? Math.max(0, ...items.filter((y) => y.group === v.group).map((y) => y.order)) + 10 : x.order;
      return { ...x, ...v, order };
    }));
    change();
  };
  const save = async () => {
    setBusy(true);
    try {
      const data = await menuApi.save({
        groups: groups.map((g) => ({ key: g.key, label: g.name.trim() && g.name.trim() !== g.defaultLabel ? g.name.trim() : null, sortOrder: g.order !== g.defaultOrder ? g.order : null, hidden: g.hidden })),
        items: items.map((i) => ({ key: i.key, label: i.name.trim() && i.name.trim() !== i.defaultLabel ? i.name.trim() : null, icon: i.ico.trim() && i.ico.trim() !== i.defaultIcon ? i.ico.trim() : null, groupKey: i.group !== i.defaultGroup ? i.group : null, sortOrder: i.order !== i.defaultOrder ? i.order : null, hidden: i.hidden })),
      });
      qc.setQueryData(["menu-setup"], data);
      qc.invalidateQueries({ queryKey: ["menu-preview"] });
      await reloadAccess();
      showToast("Menu saved: everyone sees it the next time their page loads", "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const groupOptions = groups.map((g) => ({ value: g.key, label: g.name }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-4">
        <div className="sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-surface/95 py-2 backdrop-blur">
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a menu item" className="min-w-[12rem] flex-1 rounded-xl border border-outline-variant/40 bg-transparent px-3 py-2 text-sm" />
          {dirty && <Pill tone="warning">Not saved</Pill>}
          <Button
            variant="tertiary"
            onClick={async () => {
              if (!(await confirm({ title: "Back to the built-in menu?", message: "Every name, order, group, icon and hidden item set here is removed.", confirmLabel: "Reset" }))) return;
              qc.setQueryData(["menu-setup"], await menuApi.reset());
              await reloadAccess();
            }}
          >
            Reset all
          </Button>
          <Button onClick={save} loading={busy} disabled={!dirty}>
            Save
          </Button>
        </div>
        {groups.map((g, gi) => {
          const list = byGroup(g.key);
          if (find && !list.length) return null;
          return (
            <Card key={g.key} padding="none" className={cn(g.hidden && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/15 px-4 py-3">
                <div className="flex flex-col">
                  <button type="button" disabled={gi === 0} onClick={() => moveGroup(g.key, -1)} className="material-symbols-outlined text-base text-on-surface-variant disabled:opacity-30" aria-label="Group up">
                    keyboard_arrow_up
                  </button>
                  <button type="button" disabled={gi === groups.length - 1} onClick={() => moveGroup(g.key, 1)} className="material-symbols-outlined text-base text-on-surface-variant disabled:opacity-30" aria-label="Group down">
                    keyboard_arrow_down
                  </button>
                </div>
                <input
                  value={g.name}
                  maxLength={40}
                  onChange={(e) => (setGroups(groups.map((x) => (x.key === g.key ? { ...x, name: e.target.value } : x))), change())}
                  placeholder={g.defaultLabel || "(no heading)"}
                  className="min-w-[10rem] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-black uppercase tracking-widest text-primary hover:border-outline-variant/40 focus:border-primary focus:outline-none"
                />
                {g.name !== g.defaultLabel && <span className="text-xs text-on-surface-variant">was “{g.defaultLabel || "no heading"}”</span>}
                <label className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <input type="checkbox" checked={g.hidden} onChange={(e) => (setGroups(groups.map((x) => (x.key === g.key ? { ...x, hidden: e.target.checked } : x))), change())} />
                  Hide group
                </label>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {list.map((i, n) => (
                  <div key={i.key} className={cn("flex flex-wrap items-center gap-2 px-4 py-2", i.hidden && "opacity-50")}>
                    <div className="flex flex-col">
                      <button type="button" disabled={n === 0} onClick={() => moveItem(i.key, -1)} className="material-symbols-outlined text-sm text-on-surface-variant disabled:opacity-30" aria-label="Up">
                        keyboard_arrow_up
                      </button>
                      <button type="button" disabled={n === list.length - 1} onClick={() => moveItem(i.key, 1)} className="material-symbols-outlined text-sm text-on-surface-variant disabled:opacity-30" aria-label="Down">
                        keyboard_arrow_down
                      </button>
                    </div>
                    <span className="material-symbols-outlined w-6 text-center text-on-surface-variant" title={i.ico}>
                      {i.ico}
                    </span>
                    <div className="min-w-[12rem] flex-1">
                      <input value={i.name} maxLength={60} onChange={(e) => setItem(i.key, { name: e.target.value })} placeholder={i.defaultLabel} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-outline-variant/40 focus:border-primary focus:outline-none" />
                      <p className="px-2 text-[11px] text-on-surface-variant">
                        {i.href}
                        {i.name !== i.defaultLabel && ` · was “${i.defaultLabel}”`} · for: {i.needs}
                      </p>
                    </div>
                    <input value={i.ico} onChange={(e) => setItem(i.key, { ico: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="w-28 rounded-lg border border-outline-variant/30 bg-transparent px-2 py-1 font-mono text-xs" title="Icon name (fonts.google.com/icons)" />
                    <select value={i.group} onChange={(e) => setItem(i.key, { group: e.target.value })} className="w-40 rounded-lg border border-outline-variant/30 bg-transparent px-2 py-1 text-xs">
                      {groupOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label || "(no heading)"}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <input type="checkbox" checked={i.hidden} onChange={(e) => setItem(i.key, { hidden: e.target.checked })} />
                      Hide
                    </label>
                    {(i.name !== i.defaultLabel || i.ico !== i.defaultIcon || i.group !== i.defaultGroup || i.hidden) && (
                      <button type="button" className="text-xs font-semibold text-primary" onClick={() => setItem(i.key, { name: i.defaultLabel, ico: i.defaultIcon, group: i.defaultGroup, hidden: false })}>
                        Reset
                      </button>
                    )}
                  </div>
                ))}
                {!list.length && <p className="px-4 py-3 text-xs text-on-surface-variant">No items in this group.</p>}
              </div>
            </Card>
          );
        })}
      </div>
      <div className="space-y-4 xl:sticky xl:top-20 h-fit">
        <Preview roles={q.data!.roles} />
        <FormAlert tone="info">Names, order, groups and icons change for everyone in the school. Hiding an item removes it from the menu; who may open each page is still set in Roles &amp; Permissions. Icons are names from fonts.google.com/icons (e.g. bed, restaurant, school).</FormAlert>
      </div>
    </div>
  );
}

export default function MenuSetupPage() {
  return (
    <RequirePermission permission="menu.customize">
      <PageHeader title="Menu Setup" description="Your school’s own names, order, groups and icons for the menu. Rename a group or item, move an item to another group, or hide what the school doesn’t use." />
      <Setup />
    </RequirePermission>
  );
}
