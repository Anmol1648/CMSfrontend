"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { day, invApi, money, Options, qty } from "@/lib/api/inventory";
import { ItemPicker, useInvOptions } from "@/components/inventory/InvParts";
import { cn } from "@/lib/utils";

function CountSheet({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["inventory", "count", id], queryFn: () => invApi.count(id) });
  const [values, setValues] = useState<Record<string, string>>({});
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (q.data) setValues(Object.fromEntries(q.data.lines.map((l) => [l.itemId, l.counted === null ? "" : String(l.counted)])));
  }, [q.data]);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const c = q.data!;
  const open = c.status === "open";
  const save = async () => {
    await invApi.saveCount(id, c.lines.map((l) => ({ itemId: l.itemId, counted: values[l.itemId] === "" || values[l.itemId] === undefined ? null : Number(values[l.itemId]) })));
    await q.refetch();
  };
  const t = search.trim().toLowerCase();
  const rows = c.lines.filter((l) => (!t || l.item.toLowerCase().includes(t) || l.code.toLowerCase().includes(t)) && (!onlyDiff || (values[l.itemId] !== "" && Number(values[l.itemId]) !== l.systemQty)));
  const counted = c.lines.filter((l) => values[l.itemId] !== "" && values[l.itemId] !== undefined).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          <span className="material-symbols-outlined text-lg">arrow_back</span> All counts
        </Button>
        <p className="flex-1 font-extrabold">
          {c.name} · {c.store}
        </p>
        <Pill tone={open ? "warning" : "neutral"}>{open ? "Open" : "Closed"}</Pill>
        <span className="text-sm">
          {counted} / {c.lines.length} counted
        </span>
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <Input label="Find" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Checkbox checked={onlyDiff} onChange={setOnlyDiff} label="Only differences" />
          <span className="flex-1" />
          {open && (
            <>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await save();
                    showToast("Saved", "success");
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                Save
              </Button>
              <Button
                onClick={async () => {
                  if (!(await confirm({ title: "Finish the count?", message: "Each difference becomes an adjustment (it needs approval unless you may approve). Items left empty are not changed.", confirmLabel: "Finish" }))) return;
                  try {
                    await save();
                    const r = await invApi.submitCount(id);
                    queryClient.invalidateQueries({ queryKey: ["inventory"] });
                    showToast(r.differences ? `${r.differences} difference(s) ${r.approved ? "adjusted" : "sent for approval"}` : "No differences", "success");
                    void q.refetch();
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                Finish count
              </Button>
            </>
          )}
        </div>
      </Card>
      <Card padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="px-4 py-2">Item</th>
              <th className="px-2 py-2 text-right">Books say</th>
              <th className="px-2 py-2">Counted</th>
              <th className="px-4 py-2 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const v = values[l.itemId];
              const diff = v === "" || v === undefined ? null : Math.round((Number(v) - l.systemQty) * 1000) / 1000;
              return (
                <tr key={l.itemId} className="border-t border-outline-variant/15">
                  <td className="px-4 py-1.5">
                    <b>{l.item}</b> <span className="text-xs text-on-surface-variant">· {l.category}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {qty(l.systemQty)} {l.unit}
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step="any" disabled={!open} value={v ?? ""} onChange={(e) => setValues((x) => ({ ...x, [l.itemId]: e.target.value }))} className="w-24 rounded-lg bg-surface-container-low px-2 py-1 outline-none" aria-label={`Counted ${l.item}`} />
                  </td>
                  <td className={cn("px-4 py-1.5 text-right font-bold", diff !== null && diff < 0 && "text-error", diff !== null && diff > 0 && "text-emerald-700")}>{diff === null ? "" : diff === 0 ? "✓" : diff > 0 ? `+${qty(diff)}` : qty(diff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Counts({ options }: { options: Options }) {
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["inventory", "counts"], queryFn: invApi.counts });
  const [open, setOpen] = useState<string | null>(null);
  const [storeId, setStoreId] = useState(options.stores[0]?.id ?? "");
  const [name, setName] = useState("");
  if (open) return <CountSheet id={open} onBack={() => setOpen(null)} />;
  return (
    <div className="space-y-4 max-w-3xl">
      {options.can.store && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <Select label="Store to count" value={storeId} onChange={setStoreId} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
            <Input label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Half-yearly count" />
            <Button
              onClick={async () => {
                try {
                  const c = await invApi.startCount(storeId, name);
                  setOpen(c.id);
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Start a count
            </Button>
          </div>
        </Card>
      )}
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {q.data!.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-container-low">
                  <span className="flex-1">
                    <b>{c.name}</b>
                    <span className="block text-xs text-on-surface-variant">
                      {c.store} · {day(c.startedAt)} · {c.counted}/{c.items} counted · {c.differences} difference(s)
                    </span>
                  </span>
                  <Pill tone={c.status === "open" ? "warning" : "neutral"}>{c.status === "open" ? "Open" : "Closed"}</Pill>
                </button>
              </li>
            ))}
            {!q.data!.length && <li className="px-5 py-6 text-center text-on-surface-variant">No count yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}

function WriteOffs({ options }: { options: Options }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [show, setShow] = useState("pending");
  const [storeId, setStoreId] = useState(options.stores[0]?.id ?? "");
  const [item, setItem] = useState<{ id: string; name: string; qty: number; unit: string } | null>(null);
  const [n, setN] = useState("");
  const [reason, setReason] = useState("damaged");
  const [note, setNote] = useState("");
  const items = useQuery({ queryKey: ["inventory", "pick", storeId, false], queryFn: () => invApi.pick({ store: storeId }) });
  const q = useQuery({ queryKey: ["inventory", "adjustments", show], queryFn: () => invApi.adjustments(show) });
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      {options.can.store && (
        <Card>
          <p className="font-bold mb-3">Write stock off</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <Select label="Store" value={storeId} onChange={(v) => { setStoreId(v); setItem(null); }} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
            {item ? (
              <div className="rounded-xl bg-surface-container-low px-4 py-3 text-sm flex gap-2">
                <span className="flex-1">
                  <b>{item.name}</b> ({qty(item.qty)} {item.unit})
                </span>
                <button type="button" className="text-xs font-bold text-primary" onClick={() => setItem(null)}>
                  Change
                </button>
              </div>
            ) : (
              <ItemPicker items={items.data ?? []} onPick={(i) => setItem(i)} placeholder="Item" />
            )}
            <Input label="Quantity" type="number" min={0} value={n} onChange={(e) => setN(e.target.value)} />
            <Select label="Why" value={reason} onChange={setReason} options={[{ value: "damaged", label: "Damaged / broken" }, { value: "expired", label: "Expired" }, { value: "lost", label: "Lost / missing" }]} />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="flex-1" />
            <Button
              disabled={!item || !(Number(n) > 0)}
              onClick={() =>
                act(async () => {
                  const r = await invApi.writeoff({ storeId, itemId: item!.id, qty: Number(n), reason, note: note || null });
                  setItem(null);
                  setN("");
                  setNote("");
                  if (r.status === "pending") showToast("Sent for approval", "success");
                }, "Saved")
              }
            >
              Write off
            </Button>
          </div>
        </Card>
      )}
      <Select className="max-w-xs" value={show} onChange={setShow} options={[{ value: "pending", label: "Waiting for approval" }, { value: "all", label: "All" }]} />
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data!.length ? (
        <FormAlert tone="info">Nothing here.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {q.data!.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="flex-1">
                  <b>{a.item}</b> <span className="text-on-surface-variant">· {a.store}</span>
                  <span className="block text-xs text-on-surface-variant">
                    {a.kind === "count" ? "Count difference" : `Write-off (${a.reason})`}
                    {a.note ? ` · ${a.note}` : ""} · {a.by} · {day(a.at)}
                  </span>
                </span>
                <span className={cn("font-bold", a.qty < 0 ? "text-error" : "text-emerald-700")}>{a.qty > 0 ? `+${qty(a.qty)}` : qty(a.qty)}</span>
                <span className="w-20 text-right">{money(Math.round(a.value))}</span>
                {a.status === "pending" && options.can.approve ? (
                  <span className="flex gap-2">
                    <Button variant="secondary" onClick={() => act(() => invApi.answerAdjustment(a.id, false), "Refused")}>
                      Refuse
                    </Button>
                    <Button onClick={() => act(() => invApi.answerAdjustment(a.id, true), "Approved: stock adjusted")}>Approve</Button>
                  </span>
                ) : (
                  <Pill tone={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "warning"}>{a.status === "pending" ? "Waiting" : a.status === "approved" ? "Approved" : "Refused"}</Pill>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CountPage() {
  const o = useInvOptions();
  const [tab, setTab] = useState("writeoffs");
  if (o.isLoading) return <PageLoader />;
  if (o.error) return <FormAlert>{errorMessage(o.error)}</FormAlert>;
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "writeoffs", label: "Write-offs & approvals" }, { id: "counts", label: "Stock counts" }]} activeTab={tab} onChange={setTab} />
      {tab === "writeoffs" ? <WriteOffs options={o.data!} /> : <Counts options={o.data!} />}
    </div>
  );
}

export default function InventoryCountPage() {
  return (
    <RequirePermission permission={["inventory.store", "inventory.approve"]}>
      <PageHeader title="Stock Count & Write-off" description="Write off damaged, expired or lost stock, count a store’s shelves and adjust the differences (with approval)." />
      <CountPage />
    </RequirePermission>
  );
}
