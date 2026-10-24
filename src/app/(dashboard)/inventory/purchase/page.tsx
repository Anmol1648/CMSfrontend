"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { logoSrc } from "@/lib/api/school";
import { day, invApi, money, Options, Po, PO, qty, todayISO } from "@/lib/api/inventory";
import { apiLines, EditLine, LinesEditor, opts, priceLines, toLine, useInvOptions } from "@/components/inventory/InvParts";
import { PrintPortal } from "@/components/print/PrintPortal";

/** New / changed draft order. */
function PoForm({ po, options, onClose, onSaved }: { po: Po | null; options: Options; onClose: () => void; onSaved: (p: Po) => void }) {
  const { showToast } = useToast();
  const [vendorId, setVendorId] = useState(po?.vendorId ?? "");
  const [storeId, setStoreId] = useState(po?.storeId ?? options.stores[0]?.id ?? "");
  const [orderDate, setOrderDate] = useState(po?.orderDate ?? todayISO());
  const [expectedOn, setExpectedOn] = useState(po?.expectedOn ?? "");
  const [note, setNote] = useState(po?.note ?? "");
  const [lines, setLines] = useState<EditLine[]>(() => (po ? po.lines.map((l) => ({ itemId: l.itemId, name: l.item, unit: l.unit, inStock: 0, qty: String(l.qty), rate: String(l.rate), gstPct: String(l.gstPct), batchNo: "", expiryOn: "", trackExpiry: false })) : []));
  const fillLow = async () => {
    const [low, items] = await Promise.all([invApi.low(), invApi.pick({})]);
    const add = low.filter((x) => !lines.some((l) => l.itemId === x.id)).map((x) => ({ ...toLine(items.find((i) => i.id === x.id)!, x.suggest), trackExpiry: false }));
    setLines([...lines, ...add]);
    showToast(`${add.length} low item(s) added`, "success");
  };
  const save = async (send: boolean) => {
    try {
      let p = await invApi.savePo(po?.id ?? null, { vendorId, storeId: storeId || null, orderDate, expectedOn: expectedOn || null, note: note || null, lines: priceLines(lines, options.settings.gst).map(({ itemId, qty, rate, gstPct }) => ({ itemId, qty, rate, gstPct })) });
      if (send) p = await invApi.submitPo(p.id);
      showToast(send ? (p.status === "approved" ? `${p.number} approved` : `${p.number} sent for approval`) : `${p.number} saved as a draft`, "success");
      onSaved(p);
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={po ? `Change ${po.number}` : "New purchase order"} width="max-w-5xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Vendor" value={vendorId} onChange={setVendorId} options={opts(options.vendors, "Choose…")} />
          <Select label="Deliver to" value={storeId} onChange={setStoreId} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
          <Input label="Order date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          <Input label="Expected by" type="date" value={expectedOn} onChange={(e) => setExpectedOn(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button variant="tertiary" onClick={fillLow}>
            <span className="material-symbols-outlined text-lg">playlist_add</span> Add everything low in stock
          </Button>
        </div>
        <LinesEditor lines={lines} setLines={setLines} priced gst={options.settings.gst} showStock={false} />
        <Input label="Note on the order (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <p className="text-xs text-on-surface-variant">Vendors are in Masters → Assets → Vendors. Orders above the limit in System Settings → Inventory wait for approval.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={!vendorId || !lines.length}>
            Save draft
          </Button>
          <Button onClick={() => save(true)} disabled={!vendorId || !lines.length}>
            Save and send
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Goods received: against an order, a direct purchase or a donation. */
function ReceiveForm({ options, po, onDone }: { options: Options; po?: Po | null; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [source, setSource] = useState<"po" | "direct" | "donation">(po ? "po" : "direct");
  const [vendorId, setVendorId] = useState(po?.vendorId ?? "");
  const [storeId, setStoreId] = useState(po?.storeId ?? options.stores[0]?.id ?? "");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(todayISO());
  const [bill, setBill] = useState<{ id: string; name: string } | null>(null);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<EditLine[]>(() => (po ? po.lines.filter((l) => l.qty > l.receivedQty).map((l) => ({ itemId: l.itemId, name: l.item, unit: l.unit, inStock: 0, qty: String(l.qty - l.receivedQty), rate: String(l.rate), gstPct: String(l.gstPct), batchNo: "", expiryOn: "", trackExpiry: l.trackExpiry })) : []));
  const file = useRef<HTMLInputElement>(null);
  const save = async () => {
    try {
      const r = await invApi.receive({ source, poId: po?.id ?? null, vendorId: vendorId || null, storeId, billNo: billNo || null, billDate: billDate || null, billFileId: bill?.id ?? null, note: note || null, lines: priceLines(lines, options.settings.gst) });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(`Received (${r.number})${r.total ? `: ${money(r.total)}` : ""}`, "success");
      setLines([]);
      setBillNo("");
      setBill(null);
      onDone?.();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {!po && <Select label="What is it" value={source} onChange={(v) => setSource(v as "direct" | "donation")} options={[{ value: "direct", label: "Bought without an order (cash / small purchase)" }, { value: "donation", label: "Donation (no cost)" }]} />}
        <Select label={source === "donation" ? "Donated by (vendor list, optional)" : "Vendor"} value={vendorId} onChange={setVendorId} options={opts(options.vendors, "—")} />
        <Select label="Into store" value={storeId} onChange={setStoreId} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
        {source !== "donation" && <Input label="Bill no." value={billNo} onChange={(e) => setBillNo(e.target.value)} maxLength={60} />}
        {source !== "donation" && <Input label="Bill date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />}
        {source !== "donation" && (
          <div className="flex items-end gap-2 pb-1">
            <Button variant="secondary" onClick={() => file.current?.click()}>
              <span className="material-symbols-outlined text-lg">upload</span> {bill ? "Change bill" : "Attach bill"}
            </Button>
            {bill && <span className="text-xs truncate">{bill.name}</span>}
            <input
              ref={file}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  setBill(await invApi.upload(f));
                } catch (er) {
                  showToast(errorMessage(er), "error");
                }
              }}
            />
          </div>
        )}
      </div>
      <LinesEditor storeId={storeId} lines={lines} setLines={setLines} priced={source !== "donation"} gst={options.settings.gst} />
      <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      <p className="text-xs text-on-surface-variant">Items with an expiry date need the batch’s expiry. The cost of one unit (with GST) updates the item’s average cost.</p>
      <div className="flex justify-end">
        <Button onClick={save} disabled={!lines.length || !storeId}>
          Receive into the store
        </Button>
      </div>
    </div>
  );
}

function PoDocument({ po }: { po: Po }) {
  const logo = logoSrc(po.school?.logoUrl);
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#111" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "2px solid #1A365D", paddingBottom: 8 }}>
        {logo && <img src={logo} alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{po.school?.name}</div>
          <div>{po.school?.address}</div>
          <div>{[po.school?.phone, po.school?.email].filter(Boolean).join(" · ")}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>PURCHASE ORDER</div>
          <div>No. {po.number}</div>
          <div>Date {day(po.orderDate)}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
        <div>
          <b>To:</b> {po.vendor}
          <br />
          {po.vendorInfo.phone && <>Ph {po.vendorInfo.phone}<br /></>}
          {po.vendorInfo.gstin && <>GSTIN {po.vendorInfo.gstin}</>}
        </div>
        <div style={{ textAlign: "right" }}>
          <b>Deliver to:</b> {po.store}
          <br />
          {po.expectedOn && <>By {day(po.expectedOn)}</>}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["#", "Item", "Qty", "Rate", "GST %", "Amount"].map((h) => (
              <th key={h} style={{ border: "1px solid #999", padding: 4, background: "#eef1f5", textAlign: h === "Item" ? "left" : "right" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {po.lines.map((l, i) => (
            <tr key={l.id}>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{i + 1}</td>
              <td style={{ border: "1px solid #999", padding: 4 }}>{l.item}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>
                {qty(l.qty)} {l.unit}
              </td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{money(l.rate)}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{l.gstPct}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{money(l.amount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 800 }}>
              Total
            </td>
            <td style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 800 }}>{money(po.total)}</td>
          </tr>
        </tbody>
      </table>
      {po.note && <p style={{ marginTop: 10 }}>Note: {po.note}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50 }}>
        <div>Prepared by: {po.createdByName}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #333", paddingTop: 4, minWidth: 180 }}>Approved by{po.approvedByName ? `: ${po.approvedByName}` : ""}</div>
        </div>
      </div>
    </div>
  );
}

function PoModal({ id, options, onClose }: { id: string; options: Options; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["inventory", "po", id], queryFn: () => invApi.po(id) });
  const [edit, setEdit] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const act = async (fn: () => Promise<Po>, msg: string) => {
    try {
      queryClient.setQueryData(["inventory", "po", id], await fn());
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const po = q.data;
  return (
    <Modal isOpen onClose={onClose} title={po ? `${po.number} · ${po.vendor}` : "Order"} width="max-w-5xl">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : po ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={PO[po.status]?.tone ?? "neutral"}>{PO[po.status]?.label ?? po.status}</Pill>
            <span className="flex-1 text-sm text-on-surface-variant">
              {po.createdByName} · {day(po.orderDate)}
              {po.approvedByName ? ` · approved by ${po.approvedByName}` : ""}
            </span>
            <Button variant="secondary" onClick={() => window.print()}>
              <span className="material-symbols-outlined text-lg">print</span> Print
            </Button>
            {["draft", "rejected"].includes(po.status) && options.can.purchase && (
              <>
                <Button variant="secondary" onClick={() => setEdit(true)}>
                  Change
                </Button>
                {po.status === "draft" && <Button onClick={() => act(() => invApi.submitPo(po.id), "Sent")}>Send</Button>}
              </>
            )}
            {po.status === "pending" && options.can.approve && (
              <>
                <Button variant="secondary" onClick={() => act(() => invApi.answerPo(po.id, false), "Not approved")}>
                  Not approve
                </Button>
                <Button onClick={() => act(() => invApi.answerPo(po.id, true), "Approved")}>Approve</Button>
              </>
            )}
            {["approved", "partly"].includes(po.status) && options.can.store && <Button onClick={() => setReceiving(true)}>Receive goods</Button>}
            {["draft", "pending", "approved", "rejected"].includes(po.status) && options.can.purchase && (
              <Button variant="tertiary" onClick={async () => (await confirm({ title: `Cancel ${po.number}?`, confirmLabel: "Cancel order", danger: true })) && act(() => invApi.cancelPo(po.id), "Cancelled")}>
                Cancel order
              </Button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th className="py-1">Item</th>
                <th className="text-right">Ordered</th>
                <th className="text-right">Received</th>
                <th className="text-right">Rate</th>
                <th className="text-right">GST</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l) => (
                <tr key={l.id} className="border-t border-outline-variant/15">
                  <td className="py-1.5">{l.item}</td>
                  <td className="text-right">
                    {qty(l.qty)} {l.unit}
                  </td>
                  <td className={l.receivedQty >= l.qty ? "text-right text-emerald-700 font-bold" : "text-right"}>{qty(l.receivedQty)}</td>
                  <td className="text-right">{money(l.rate)}</td>
                  <td className="text-right">{l.gstPct}%</td>
                  <td className="text-right">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-extrabold">Total {money(po.total)}</p>
          {po.receipts.length > 0 && <p className="text-xs text-on-surface-variant">Received: {po.receipts.map((r) => `${r.number} (${day(r.at)}${r.billNo ? `, bill ${r.billNo}` : ""})`).join(" · ")}</p>}
          {receiving && (
            <Card>
              <ReceiveForm
                options={options}
                po={po}
                onDone={() => {
                  setReceiving(false);
                  void q.refetch();
                }}
              />
            </Card>
          )}
          <PrintPortal>
            <PoDocument po={po} />
          </PrintPortal>
          {edit && (
            <PoForm
              po={po}
              options={options}
              onClose={() => setEdit(false)}
              onSaved={(p) => {
                queryClient.setQueryData(["inventory", "po", id], p);
                queryClient.invalidateQueries({ queryKey: ["inventory"] });
                setEdit(false);
              }}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function Orders({ options }: { options: Options }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState("open");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ["inventory", "pos", show], queryFn: () => invApi.pos(show) });
  const low = useQuery({ queryKey: ["inventory", "low"], queryFn: invApi.low });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <Select className="max-w-xs" value={show} onChange={setShow} options={[{ value: "open", label: "Open orders" }, { value: "pending", label: "Waiting for approval" }, { value: "received", label: "Received / closed" }, { value: "all", label: "All" }]} />
        {(low.data?.length ?? 0) > 0 && <Pill tone="warning">{low.data!.length} item(s) low in stock</Pill>}
        {options.can.purchase && (
          <Button onClick={() => setCreating(true)}>
            <span className="material-symbols-outlined text-lg">add</span> New purchase order
          </Button>
        )}
      </div>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/15">
            {q.data!.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p.id)} className="w-full flex flex-wrap items-center gap-3 px-5 py-3 text-left hover:bg-surface-container-low text-sm">
                  <span className="w-24 font-mono text-xs">{p.number}</span>
                  <span className="flex-1">
                    <b>{p.vendor}</b>
                    <span className="block text-xs text-on-surface-variant">
                      {day(p.orderDate)} · {p.store} · {p.received}/{p.lines} line(s) received · {p.by}
                    </span>
                  </span>
                  <span className="w-24 text-right font-bold">{money(p.total)}</span>
                  <Pill tone={PO[p.status]?.tone ?? "neutral"}>{PO[p.status]?.label ?? p.status}</Pill>
                </button>
              </li>
            ))}
            {!q.data!.length && <li className="px-5 py-6 text-center text-sm text-on-surface-variant">No orders.</li>}
          </ul>
        </Card>
      )}
      {open && <PoModal id={open} options={options} onClose={() => setOpen(null)} />}
      {creating && (
        <PoForm
          po={null}
          options={options}
          onClose={() => setCreating(false)}
          onSaved={(p) => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            setOpen(p.id);
          }}
        />
      )}
    </div>
  );
}

function Receipts() {
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["inventory", "receipts"], queryFn: invApi.receipts });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const SRC: Record<string, string> = { po: "Order", direct: "Direct", donation: "Donation" };
  return (
    <Card padding="none">
      <ul className="divide-y divide-outline-variant/15 text-sm">
        {q.data!.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
            <span className="w-24 font-mono text-xs">{r.number}</span>
            <span className="flex-1">
              <b>{r.vendor || SRC[r.source]}</b>
              <span className="block text-xs text-on-surface-variant">
                {day(r.at)} · {SRC[r.source]}
                {r.po ? ` ${r.po}` : ""} · {r.store} · {r.lines} item(s) · {r.by}
              </span>
            </span>
            {r.billNo && (
              <span className="text-xs">
                Bill {r.billNo}
                {r.billFileId && (
                  <button type="button" className="ml-1 font-bold text-primary" onClick={async () => { try { window.open(await authedImageUrl(invApi.filePath(r.billFileId!)), "_blank", "noopener"); } catch (e) { showToast(errorMessage(e), "error"); } }}>
                    open
                  </button>
                )}
              </span>
            )}
            <span className="w-24 text-right font-bold">{money(r.total)}</span>
          </li>
        ))}
        {!q.data!.length && <li className="px-5 py-6 text-center text-on-surface-variant">Nothing received yet.</li>}
      </ul>
    </Card>
  );
}

function VendorReturn({ options }: { options: Options }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [storeId, setStoreId] = useState(options.stores[0]?.id ?? "");
  const [vendorId, setVendorId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<EditLine[]>([]);
  return (
    <Card>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="From store" value={storeId} onChange={setStoreId} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
          <Select label="Back to vendor" value={vendorId} onChange={setVendorId} options={opts(options.vendors, "Choose…")} />
        </div>
        <LinesEditor storeId={storeId} lines={lines} setLines={setLines} />
        <Input label="Why (damaged, wrong item…)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        <div className="flex justify-end">
          <Button
            disabled={!vendorId || !lines.length}
            onClick={async () => {
              try {
                const r = await invApi.vendorReturn({ storeId, vendorId, note: note || null, lines: apiLines(lines) });
                queryClient.invalidateQueries({ queryKey: ["inventory"] });
                showToast(`Returned (${r.refNo})`, "success");
                setLines([]);
                setNote("");
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Return to vendor
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Purchase() {
  const o = useInvOptions();
  const [tab, setTab] = useState("orders");
  if (o.isLoading) return <PageLoader />;
  if (o.error) return <FormAlert>{errorMessage(o.error)}</FormAlert>;
  const options = o.data!;
  const tabs = [{ id: "orders", label: "Purchase orders" }, ...(options.can.store ? [{ id: "receive", label: "Receive without an order" }, { id: "vreturn", label: "Return to vendor" }] : []), { id: "receipts", label: "Goods received" }];
  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab === "orders" && <Orders options={options} />}
      {tab === "receive" && (
        <Card>
          <ReceiveForm options={options} />
        </Card>
      )}
      {tab === "vreturn" && <VendorReturn options={options} />}
      {tab === "receipts" && <Receipts />}
    </div>
  );
}

export default function InventoryPurchasePage() {
  return (
    <RequirePermission permission={["inventory.purchase", "inventory.store", "inventory.approve"]}>
      <PageHeader title="Purchase & Receive" description="Purchase orders to vendors (with approval above the limit), goods received against them or bought directly, donations, and returns to vendors." />
      <Purchase />
    </RequirePermission>
  );
}
