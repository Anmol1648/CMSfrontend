"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { day, invApi, money, qty } from "@/lib/api/inventory";
import { ItemDrawer, ItemForm, opts, useInvOptions } from "@/components/inventory/InvParts";
import { cn } from "@/lib/utils";

function Stock() {
  const queryClient = useQueryClient();
  const o = useInvOptions();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [f, setF] = useState({ category: "", store: "", show: "active" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [term, f]);
  const q = useQuery({ queryKey: ["inventory", "items", term, f, page], queryFn: () => invApi.items({ search: term, ...f, page }) });
  const exp = useQuery({ queryKey: ["inventory", "expiring"], queryFn: invApi.expiring });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs text-on-surface-variant">Value of the stock shown</p>
          <p className="text-2xl font-extrabold">{money(Math.round(q.data?.value ?? 0))}</p>
        </Card>
        <button type="button" onClick={() => setF((x) => ({ ...x, show: "low" }))} className="text-left">
          <Card padding="sm" className={cn((q.data?.low ?? 0) > 0 && "ring-2 ring-amber-300")}>
            <p className="text-xs text-on-surface-variant">Items at or below reorder level</p>
            <p className="text-2xl font-extrabold text-amber-700">{q.data?.low ?? 0}</p>
          </Card>
        </button>
        <Card padding="sm" className={cn((exp.data?.length ?? 0) > 0 && "ring-2 ring-red-200")}>
          <p className="text-xs text-on-surface-variant">Batches expiring soon / expired</p>
          <p className="text-2xl font-extrabold text-error">{exp.data?.length ?? 0}</p>
        </Card>
      </div>
      {(exp.data?.length ?? 0) > 0 && (
        <Card padding="sm">
          <p className="font-bold mb-2">Expiring</p>
          <ul className="text-sm divide-y divide-outline-variant/15">
            {exp.data!.map((b) => (
              <li key={b.id} className="flex flex-wrap gap-3 py-1.5">
                <button type="button" className="font-bold text-primary flex-1 text-left" onClick={() => setOpen(b.itemId)}>
                  {b.item}
                </button>
                <span className="text-on-surface-variant">{b.store}</span>
                <span>{b.batchNo ?? ""}</span>
                <span>
                  {qty(b.qty)} {b.unit}
                </span>
                <Pill tone={b.expired ? "danger" : "warning"}>{b.expired ? `Expired ${day(b.expiryOn)}` : `Expires ${day(b.expiryOn)}`}</Pill>
              </li>
            ))}
          </ul>
          <p className="text-xs text-on-surface-variant mt-2">Write expired stock off on Stock Count & Write-off.</p>
        </Card>
      )}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end">
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or barcode" />
          <Select label="Category" value={f.category} onChange={set("category")} options={opts(o.data?.categories ?? [], "All")} />
          <Select label="Store" value={f.store} onChange={set("store")} options={opts(o.data?.stores ?? [], "All stores")} />
          <Select label="Show" value={f.show} onChange={set("show")} options={[{ value: "active", label: "Items in use" }, { value: "low", label: "Low stock" }, { value: "expiry", label: "With expiry" }, { value: "sellable", label: "Sold to students" }, { value: "inactive", label: "Not in use" }, { value: "all", label: "All" }]} />
          {o.data?.can.manage && (
            <Button onClick={() => setAdding(true)}>
              <span className="material-symbols-outlined text-lg">add</span> Add item
            </Button>
          )}
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2 text-right">Stock</th>
                  <th className="px-2 py-2 text-right">Reorder at</th>
                  <th className="px-2 py-2 text-right">Avg cost</th>
                  <th className="px-2 py-2 text-right">Value</th>
                  <th className="px-4 py-2">Stores</th>
                </tr>
              </thead>
              <tbody>
                {q.data!.rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/15 hover:bg-surface-container-low cursor-pointer" onClick={() => setOpen(r.id)}>
                    <td className="px-4 py-2">
                      <b>{r.name}</b>
                      <p className="text-xs text-on-surface-variant">
                        {r.code}
                        {r.sellable ? ` · sold at ${money(r.sellPrice)}` : ""}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-xs">{r.category}</td>
                    <td className={cn("px-2 py-2 text-right font-bold", r.low && "text-amber-700")}>
                      {qty(r.qty)} <span className="font-normal text-xs">{r.unit}</span>
                    </td>
                    <td className="px-2 py-2 text-right">{qty(r.reorderLevel)}</td>
                    <td className="px-2 py-2 text-right">{money(r.avgCost)}</td>
                    <td className="px-2 py-2 text-right">{money(Math.round(r.value))}</td>
                    <td className="px-4 py-2 text-xs text-on-surface-variant">{r.stores.map((s) => `${s.store}: ${qty(s.qty)}`).join(" · ")}</td>
                  </tr>
                ))}
                {!q.data!.rows.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                      No items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {q.data!.total > q.data!.pageSize && <Pagination className="px-4 py-3" currentPage={page} totalPage={Math.ceil(q.data!.total / q.data!.pageSize)} onPageChange={setPage} />}
        </Card>
      )}
      {open && <ItemDrawer id={open} onClose={() => setOpen(null)} />}
      {adding && o.data && (
        <ItemForm
          item={null}
          options={o.data}
          onClose={() => setAdding(false)}
          onSaved={(i) => {
            setAdding(false);
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            setOpen(i.id);
          }}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequirePermission permission={["inventory.view", "inventory.store", "inventory.manage"]}>
      <PageHeader title="Stock" description="Every item in the stores: how much there is, its value, what is low and what is expiring. Click an item for its stock ledger." />
      <Stock />
    </RequirePermission>
  );
}
