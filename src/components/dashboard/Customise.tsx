"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { CatalogueWidget, dashboardApi, Shortcut } from "@/lib/api/dashboard";
import { arrayMove, DragHandle, SortableItem, SortableList } from "@/components/ui/Sortable";

const TYPE_ICON: Record<CatalogueWidget["type"], string> = { stat: "looks_one", chart: "bar_chart", donut: "donut_large", list: "list" };

/** The widgets the person may add, by category; those already on the dashboard are marked. */
export function AddWidgets({ open, onClose, have, onAdd }: { open: boolean; onClose: () => void; have: string[]; onAdd: (w: CatalogueWidget) => void }) {
  const q = useQuery({ queryKey: ["dash-my-catalogue"], queryFn: dashboardApi.myCatalogue, enabled: open, staleTime: 10 * 60_000 });
  const [find, setFind] = useState("");
  const groups = useMemo(() => {
    const t = find.trim().toLowerCase();
    const m = new Map<string, CatalogueWidget[]>();
    for (const w of q.data ?? []) if (!t || w.label.toLowerCase().includes(t) || w.description.toLowerCase().includes(t)) m.set(w.category, [...(m.get(w.category) ?? []), w]);
    return Array.from(m.entries());
  }, [q.data, find]);
  return (
    <Drawer isOpen={open} onClose={onClose} title="Add widgets" width="max-w-md">
      <div className="space-y-4">
        <Input placeholder="Find a widget" icon="search" value={find} onChange={(e) => setFind(e.target.value)} />
        {!q.data && <p className="text-sm text-on-surface-variant">Loading…</p>}
        {groups.map(([cat, list]) => (
          <div key={cat}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{cat}</p>
            <div className="space-y-2">
              {list.map((w) => {
                const on = have.includes(w.key);
                return (
                  <div key={w.key} className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5", on ? "border-primary/30 bg-primary/5" : "border-outline-variant/30")}>
                    <span className="material-symbols-outlined mt-0.5 text-base text-on-surface-variant/60">{TYPE_ICON[w.type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{w.label}</p>
                      <p className="text-[11px] text-on-surface-variant/70">{w.description}</p>
                    </div>
                    {on ? (
                      <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Added</span>
                    ) : (
                      <button type="button" onClick={() => onAdd(w)} className="shrink-0 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {q.data && !groups.length && <p className="text-sm text-on-surface-variant">No widget matches.</p>}
      </div>
    </Drawer>
  );
}

/** The person's shortcuts: pages from their own menu, in their order (up to 12). */
export function Shortcuts({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { access } = useAuth();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["dash-links"], queryFn: dashboardApi.links, enabled: open });
  const [links, setLinks] = useState<Shortcut[] | null>(null);
  const list = links ?? q.data ?? [];
  const pages = (access?.menu ?? []).flatMap((g) => g.items.map((i) => ({ label: i.label, href: i.href, group: g.label })));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const out = [...list];
    [out[i], out[j]] = [out[j], out[i]];
    setLinks(out);
  };
  return (
    <Modal isOpen={open} onClose={onClose} title="My shortcuts" width="max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Chosen ({list.length}/12)</p>
          <div className="space-y-1">
            <SortableList ids={list.map((l) => l.href)} onDrop={(d) => setLinks(arrayMove(list, d.from, d.to))}>
            {list.map((l, i) => (
              <SortableItem key={l.href} id={l.href} className="flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1.5 text-sm">
                <DragHandle label={l.label} />
                <button type="button" className="material-symbols-outlined text-base text-on-surface-variant" onClick={() => move(i, -1)} aria-label="Up">
                  arrow_upward
                </button>
                <button type="button" className="material-symbols-outlined text-base text-on-surface-variant" onClick={() => move(i, 1)} aria-label="Down">
                  arrow_downward
                </button>
                <span className="flex-1 truncate">{l.label}</span>
                <button type="button" className="material-symbols-outlined text-base text-error" onClick={() => setLinks(list.filter((x) => x.href !== l.href))} aria-label={`Remove ${l.label}`}>
                  close
                </button>
              </SortableItem>
            ))}
            </SortableList>
            {!list.length && <p className="text-sm text-on-surface-variant">Pick pages from the list.</p>}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Your pages</p>
          {pages.map((p) => {
            const on = list.some((l) => l.href === p.href);
            return (
              <button key={`${p.group}${p.href}`} type="button" disabled={on || list.length >= 12} onClick={() => setLinks([...list, { label: p.label, href: p.href }])} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-container disabled:opacity-40">
                <span>
                  {p.label} <span className="text-[11px] text-on-surface-variant/60">{p.group}</span>
                </span>
                <span className="material-symbols-outlined text-base text-primary">{on ? "check" : "add"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="tertiary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={async () => {
            try {
              await dashboardApi.saveLinks(list);
              setLinks(null);
              showToast("Shortcuts saved", "success");
              onSaved();
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
