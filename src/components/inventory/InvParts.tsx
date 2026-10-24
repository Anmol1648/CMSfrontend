"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, Detail, FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { day, invApi, Item, ItemInput, money, MOVE, Options, PickItem, qty } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export const useInvOptions = () => useQuery({ queryKey: ["inventory", "options"], queryFn: invApi.options, staleTime: 60_000 });
export const opts = (l: { id: string; name: string }[], none = "—") => [{ value: "", label: none }, ...l.map((x) => ({ value: x.id, label: x.name }))];
export const num = (s: string) => (s.trim() === "" ? 0 : Math.max(0, Number(s)) || 0);

/** Type to find an item (name / code / barcode); shows its stock. */
export function ItemPicker({ items, onPick, placeholder = "Add an item: type its name or code" }: { items: PickItem[]; onPick: (i: PickItem) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return items.filter((i) => i.name.toLowerCase().includes(t) || i.code.toLowerCase().includes(t)).slice(0, 12);
  }, [q, items]);
  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) {
            e.preventDefault();
            onPick(hits[0]);
            setQ("");
          }
        }}
      />
      {hits.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-xl bg-white shadow-lg border border-outline-variant/30">
          {hits.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(i);
                  setQ("");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface-container-low"
              >
                <span className="flex-1">
                  <b>{i.name}</b> <span className="text-on-surface-variant">· {i.code}</span>
                </span>
                <span className={cn("text-xs", i.qty <= 0 ? "text-error" : "text-on-surface-variant")}>
                  {qty(i.qty)} {i.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type EditLine = { itemId: string; name: string; unit: string; inStock: number; qty: string; rate: string; gstPct: string; batchNo: string; expiryOn: string; trackExpiry: boolean };
export const toLine = (i: PickItem, q = 1, rate?: number): EditLine => ({ itemId: i.id, name: i.name, unit: i.unit, inStock: i.qty, qty: String(q), rate: String(rate ?? i.avgCost ?? 0), gstPct: String(i.gstPct ?? 0), batchNo: "", expiryOn: "", trackExpiry: i.trackExpiry });

/** Rows of items with a quantity (and, for purchases, the rate, GST, batch and expiry). */
export function LinesEditor({ storeId, lines, setLines, priced, gst = true, sellable, showStock = true }: { storeId?: string; lines: EditLine[]; setLines: (l: EditLine[]) => void; priced?: boolean; gst?: boolean; sellable?: boolean; showStock?: boolean }) {
  const items = useQuery({ queryKey: ["inventory", "pick", storeId ?? "", !!sellable], queryFn: () => invApi.pick({ store: storeId, sellable }) });
  const set = (k: number, patch: Partial<EditLine>) => setLines(lines.map((l, i) => (i === k ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + num(l.qty) * num(l.rate) * (1 + (gst ? num(l.gstPct) : 0) / 100), 0);
  return (
    <div className="space-y-2">
      <ItemPicker items={items.data ?? []} onPick={(i) => !lines.some((l) => l.itemId === i.id) && setLines([...lines, toLine(i, 1, sellable ? (i.sellPrice ?? 0) : undefined)])} />
      {lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th className="py-1 pr-2">Item</th>
                {showStock && <th className="py-1 px-2 text-right">In store</th>}
                <th className="py-1 px-2 w-24">Qty</th>
                {priced && <th className="py-1 px-2 w-28">Rate (₹)</th>}
                {priced && gst && <th className="py-1 px-2 w-20">GST %</th>}
                {priced && <th className="py-1 px-2 w-28">Batch / expiry</th>}
                {(priced || sellable) && <th className="py-1 px-2 text-right">Amount</th>}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, k) => (
                <tr key={l.itemId} className="border-t border-outline-variant/15">
                  <td className="py-1.5 pr-2">
                    <b>{l.name}</b> <span className="text-xs text-on-surface-variant">{l.unit}</span>
                  </td>
                  {showStock && <td className={cn("py-1.5 px-2 text-right text-xs", l.inStock < num(l.qty) && !priced ? "text-error font-bold" : "")}>{qty(l.inStock)}</td>}
                  <td className="py-1.5 px-2">
                    <input type="number" min={0} step="any" value={l.qty} onChange={(e) => set(k, { qty: e.target.value })} className="w-20 rounded-lg bg-surface-container-low px-2 py-1.5 outline-none" aria-label={`Quantity of ${l.name}`} />
                  </td>
                  {priced && (
                    <td className="py-1.5 px-2">
                      <input type="number" min={0} step="any" value={l.rate} onChange={(e) => set(k, { rate: e.target.value })} className="w-24 rounded-lg bg-surface-container-low px-2 py-1.5 outline-none" aria-label={`Rate of ${l.name}`} />
                    </td>
                  )}
                  {priced && gst && (
                    <td className="py-1.5 px-2">
                      <input type="number" min={0} max={28} value={l.gstPct} onChange={(e) => set(k, { gstPct: e.target.value })} className="w-16 rounded-lg bg-surface-container-low px-2 py-1.5 outline-none" aria-label={`GST of ${l.name}`} />
                    </td>
                  )}
                  {priced && (
                    <td className="py-1.5 px-2">
                      {l.trackExpiry ? (
                        <div className="flex flex-col gap-1">
                          <input value={l.batchNo} onChange={(e) => set(k, { batchNo: e.target.value })} placeholder="Batch" className="w-28 rounded-lg bg-surface-container-low px-2 py-1 outline-none text-xs" aria-label="Batch" />
                          <input type="date" value={l.expiryOn} onChange={(e) => set(k, { expiryOn: e.target.value })} className="w-28 rounded-lg bg-surface-container-low px-2 py-1 outline-none text-xs" aria-label="Expiry" />
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                  )}
                  {(priced || sellable) && <td className="py-1.5 px-2 text-right">{money(Math.round(num(l.qty) * num(l.rate) * (1 + (priced && gst ? num(l.gstPct) : 0) / 100) * 100) / 100)}</td>}
                  <td>
                    <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== k))} className="p-1 text-error" aria-label={`Remove ${l.name}`}>
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(priced || sellable) && <p className="text-right font-extrabold mt-2">Total {money(Math.round(total * 100) / 100)}</p>}
        </div>
      )}
    </div>
  );
}

const EMPTY: ItemInput = { name: "", categoryId: null, unitId: null, reorderLevel: 0, reorderQty: 0, barcode: null, sellable: false, sellPrice: null, gstPct: 0, isActive: true, opening: null };

export function ItemForm({ item, options, onClose, onSaved }: { item: Item | null; options: Options; onClose: () => void; onSaved: (i: Item) => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState<ItemInput>(() => (item ? { name: item.name, categoryId: item.categoryId, unitId: item.unitId, reorderLevel: item.reorderLevel, reorderQty: item.reorderQty, barcode: item.barcode, sellable: item.sellable, sellPrice: item.sellPrice, trackExpiry: item.trackExpiry, gstPct: item.gstPct, isActive: item.isActive } : EMPTY));
  const [opening, setOpening] = useState({ storeId: options.stores[0]?.id ?? "", qty: "", rate: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ItemInput>(k: K, v: ItemInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setErr(null);
    try {
      const i = await invApi.saveItem(item?.id ?? null, { ...f, opening: !item && num(opening.qty) > 0 ? { storeId: opening.storeId, qty: num(opening.qty), rate: num(opening.rate) } : null });
      showToast(item ? "Saved" : `Added as ${i.code}`, "success");
      onSaved(i);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const catExpiry = !!options.categories.find((c) => c.id === f.categoryId)?.extra?.expiry;
  return (
    <Modal isOpen onClose={onClose} title={item ? `Change ${item.code}` : "Add an item"} width="max-w-2xl">
      <div className="space-y-4">
        {err && <FormAlert>{err}</FormAlert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={150} className="sm:col-span-2" />
          <Select label="Category" value={f.categoryId ?? ""} onChange={(v) => set("categoryId", v || null)} options={opts(options.categories)} />
          <Select label="Unit" value={f.unitId ?? ""} onChange={(v) => set("unitId", v || null)} options={opts(options.units)} />
          <Input label="Reorder when stock falls to" type="number" min={0} value={String(f.reorderLevel)} onChange={(e) => set("reorderLevel", num(e.target.value))} />
          <Input label="Usual quantity to order" type="number" min={0} value={String(f.reorderQty)} onChange={(e) => set("reorderQty", num(e.target.value))} />
          {options.settings.gst && <Input label="GST % on purchase" type="number" min={0} max={28} value={String(f.gstPct)} onChange={(e) => set("gstPct", num(e.target.value))} />}
          <Input label="Barcode (optional)" value={f.barcode ?? ""} onChange={(e) => set("barcode", e.target.value || null)} maxLength={60} />
        </div>
        <div className="flex flex-wrap gap-6">
          <Checkbox checked={f.trackExpiry ?? catExpiry} onChange={(c) => set("trackExpiry", c)} label="Has an expiry date (kept in batches)" hint="Chemicals, medicines… (the category’s choice by default)." />
          {options.settings.sales && <Checkbox checked={f.sellable} onChange={(c) => set("sellable", c)} label="Sold to students" />}
          {item && <Checkbox checked={f.isActive} onChange={(c) => set("isActive", c)} label="In use" />}
        </div>
        {f.sellable && <Input label="Selling price (₹)" type="number" min={0} value={f.sellPrice === null ? "" : String(f.sellPrice)} onChange={(e) => set("sellPrice", e.target.value ? num(e.target.value) : null)} className="max-w-xs" />}
        {!item && (
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs font-bold mb-2">Stock already on the shelf (optional)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Store" value={opening.storeId} onChange={(v) => setOpening((o) => ({ ...o, storeId: v }))} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
              <Input label="Quantity" type="number" min={0} value={opening.qty} onChange={(e) => setOpening((o) => ({ ...o, qty: e.target.value }))} />
              <Input label="Cost of one (₹)" type="number" min={0} value={opening.rate} onChange={(e) => setOpening((o) => ({ ...o, rate: e.target.value }))} />
            </div>
          </div>
        )}
        <p className="text-xs text-on-surface-variant">The code (e.g. ITM-00042) is given on saving. Stock comes in with Purchase & Receive; it goes out with Issue, sales and write-offs.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={f.name.trim().length < 2}>
            {item ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ItemDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const o = useInvOptions();
  const q = useQuery({ queryKey: ["inventory", "item", id], queryFn: () => invApi.item(id) });
  const [edit, setEdit] = useState(false);
  const i = q.data;
  return (
    <Drawer isOpen onClose={onClose} title={i ? `${i.name} · ${i.code}` : "Item"} width="max-w-2xl">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : i ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={i.totalQty <= i.reorderLevel ? "warning" : "success"}>
              {qty(i.totalQty)} {i.unit} in stock
            </Pill>
            {i.trackExpiry && <Pill>Batches with expiry</Pill>}
            {i.sellable && <Pill tone="primary">Sold at {money(i.sellPrice)}</Pill>}
            {!i.isActive && <Pill>Not in use</Pill>}
            <span className="flex-1" />
            {o.data?.can.manage && (
              <Button variant="secondary" onClick={() => setEdit(true)}>
                <span className="material-symbols-outlined text-lg">edit</span> Change
              </Button>
            )}
          </div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
            <Detail label="Category" value={i.category || "—"} />
            <Detail label="Average cost" value={money(i.avgCost)} />
            <Detail label="Reorder at" value={`${qty(i.reorderLevel)} (order ${qty(i.reorderQty)})`} />
            <Detail label="Value in stock" value={money(Math.round(i.totalQty * i.avgCost))} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">By store</p>
            <div className="flex flex-wrap gap-2">
              {i.stock.map((s) => (
                <Pill key={s.storeId}>
                  {s.store}: {qty(s.qty)}
                </Pill>
              ))}
              {!i.stock.length && <span className="text-sm text-on-surface-variant">No stock yet.</span>}
            </div>
          </div>
          {i.batches.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">Batches</p>
              <ul className="space-y-1 text-sm">
                {i.batches.map((b) => (
                  <li key={b.id} className="flex gap-3">
                    <span className="w-32">{b.store}</span>
                    <span className="w-24">{b.batchNo ?? "—"}</span>
                    <span className={cn("w-28", b.expired && "text-error font-bold")}>{b.expiryOn ? `${b.expired ? "Expired " : "Exp. "}${day(b.expiryOn)}` : "—"}</span>
                    <span>{qty(b.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">Ledger (latest first)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-on-surface-variant/70">
                  <th className="py-1">Date</th>
                  <th>Movement</th>
                  <th>Store</th>
                  <th className="text-right">In / out</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {i.moves.map((m) => (
                  <tr key={m.id} className="border-t border-outline-variant/15 align-top">
                    <td className="py-1">{day(m.at)}</td>
                    <td>
                      {MOVE[m.kind] ?? m.kind}
                      <span className="block text-on-surface-variant">{[m.refNo, m.to, m.note].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td>{m.store}</td>
                    <td className={cn("text-right font-bold", m.qty < 0 ? "text-error" : "text-emerald-700")}>{m.qty > 0 ? `+${qty(m.qty)}` : qty(m.qty)}</td>
                    <td className="text-right">{qty(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {edit && o.data && (
            <ItemForm
              item={i}
              options={o.data}
              onClose={() => setEdit(false)}
              onSaved={(x) => {
                queryClient.setQueryData(["inventory", "item", id], x);
                queryClient.invalidateQueries({ queryKey: ["inventory"] });
                setEdit(false);
              }}
            />
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

/** Builds the API lines from edited rows (quantity > 0). */
export const apiLines = (lines: EditLine[]) => lines.filter((l) => num(l.qty) > 0).map((l) => ({ itemId: l.itemId, qty: num(l.qty) }));
export const priceLines = (lines: EditLine[], gst: boolean) => lines.filter((l) => num(l.qty) > 0).map((l) => ({ itemId: l.itemId, qty: num(l.qty), rate: num(l.rate), gstPct: gst ? num(l.gstPct) : 0, batchNo: l.batchNo || null, expiryOn: l.expiryOn || null }));
