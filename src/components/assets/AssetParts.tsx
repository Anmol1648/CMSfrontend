"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Detail, FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { Asset, AssetInput, assetsApi, day, EVENT, ISSUE, Options, REASON, rupees, STATUS } from "@/lib/api/assets";

const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const opts = (l: { id: string; name: string }[], none = "—") => [{ value: "", label: none }, ...l.map((x) => ({ value: x.id, label: x.name }))];
const num = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))) || 0);

export const useAssetOptions = () => useQuery({ queryKey: ["assets", "options"], queryFn: assetsApi.options, staleTime: 60_000 });

/** A file (photo / bill) picker that uploads at once. */
function FilePick({ label, value, onChange, accept }: { label: string; value: string | null; onChange: (id: string | null) => void; accept: string }) {
  const { showToast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</span>
      <div className="flex items-center gap-2 text-sm">
        <Button variant="secondary" disabled={busy} onClick={() => ref.current?.click()}>
          <span className="material-symbols-outlined text-lg">upload</span> {value ? "Change" : "Choose"}
        </Button>
        {value && <span className="truncate text-xs">{name ?? "Attached"}</span>}
        {value && (
          <button type="button" className="text-xs font-bold text-error" onClick={() => { onChange(null); setName(null); }}>
            Remove
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            const r = await assetsApi.upload(f);
            onChange(r.id);
            setName(r.name);
          } catch (err) {
            showToast(errorMessage(err), "error");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Opens a stored file (bill) in a new tab. */
export async function openAssetFile(fileId: string) {
  const url = await authedImageUrl(assetsApi.fileUrl(fileId)).catch(() => null);
  if (url) window.open(url, "_blank", "noopener");
}

const EMPTY: AssetInput = { name: "", categoryId: null, conditionId: null, vendorId: null, roomId: null, staffId: null, make: null, model: null, serialNo: null, quantity: 1, purchasedOn: null, billNo: null, cost: null, warrantyUntil: null, amcUntil: null, maintainEvery: null, nextMaintenanceOn: null, photoFileId: null, billFileId: null, notes: null };

/** Add or change an asset. */
export function AssetForm({ asset, options, onClose, onSaved }: { asset: Asset | null; options: Options; onClose: () => void; onSaved: (a: Asset) => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState<AssetInput>(() => (asset ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, asset[k as keyof Asset] ?? null])), quantity: asset.quantity } : EMPTY) as AssetInput);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof AssetInput>(k: K, v: AssetInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const txt = (k: keyof AssetInput) => ({ value: (f[k] as string | null) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value || null) as never) });
  const cat = options.categories.find((c) => c.id === f.categoryId);
  const save = async () => {
    setErr(null);
    try {
      const a = asset ? await assetsApi.update(asset.id, f) : await assetsApi.create(f);
      showToast(asset ? "Saved" : `Added as ${a.code}`, "success");
      onSaved(a);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={asset ? `Change ${asset.code}` : "Add an asset"} width="max-w-3xl">
      <div className="space-y-4">
        {err && <FormAlert>{err}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Projector, Student desk…" maxLength={150} />
          <Input label="Quantity (one entry for many of the same)" type="number" min={1} value={String(f.quantity)} onChange={(e) => set("quantity", Math.max(1, Number(e.target.value) || 1))} />
          <Select label="Category" value={f.categoryId ?? ""} onChange={(v) => set("categoryId", v || null)} options={opts(options.categories)} />
          <Select label="Condition" value={f.conditionId ?? ""} onChange={(v) => set("conditionId", v || null)} options={opts(options.conditions)} />
          <Select label="Room / place" value={f.roomId ?? ""} onChange={(v) => set("roomId", v || null)} options={opts(options.rooms)} />
          <Select label="Given to (staff)" value={f.staffId ?? ""} onChange={(v) => set("staffId", v || null)} options={opts(options.staff, "Nobody")} />
          <Input label="Make" {...txt("make")} maxLength={80} />
          <Input label="Model" {...txt("model")} maxLength={80} />
          <Input label="Serial no." {...txt("serialNo")} maxLength={80} />
          <Select label="Vendor" value={f.vendorId ?? ""} onChange={(v) => set("vendorId", v || null)} options={opts(options.vendors)} />
          <Input label="Bought on" type="date" {...txt("purchasedOn")} />
          <Input label="Bill no." {...txt("billNo")} maxLength={60} />
          <Input label="Cost of the entry (₹, all the quantity)" type="number" min={0} value={f.cost === null ? "" : String(f.cost)} onChange={(e) => set("cost", num(e.target.value))} />
          <Input label="Warranty until" type="date" {...txt("warrantyUntil")} />
          <Input label="AMC until" type="date" {...txt("amcUntil")} />
          <Input label={`Maintenance every (months)${cat ? ` · category: ${Number(cat.extra?.maintain_every ?? 0) || "none"}` : ""}`} type="number" min={0} value={f.maintainEvery === null ? "" : String(f.maintainEvery)} onChange={(e) => set("maintainEvery", num(e.target.value))} placeholder="From the category" />
          <Input label="Next maintenance on" type="date" {...txt("nextMaintenanceOn")} />
          <FilePick label="Photo" value={f.photoFileId} onChange={(v) => set("photoFileId", v)} accept="image/png,image/jpeg,image/webp" />
          <FilePick label="Bill (PDF / photo)" value={f.billFileId} onChange={(v) => set("billFileId", v)} accept="application/pdf,image/png,image/jpeg,image/webp" />
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Notes</span>
          <textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} rows={2} maxLength={1000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
        </label>
        <p className="text-xs text-on-surface-variant/70">The code (e.g. AST-00042) is given on saving; print its QR label from the register. Leave “maintenance every” empty to use the category’s.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={f.name.trim().length < 2}>
            {asset ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Reports a problem with an asset (search, or a fixed asset). */
export function ReportProblem({ asset, onClose, onDone }: { asset?: { id: string; code: string; name: string } | null; onClose: () => void; onDone?: () => void }) {
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; code: string; name: string; room: string | null }[]>([]);
  const [chosen, setChosen] = useState(asset ?? null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (chosen || q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => assetsApi.pick(q).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q, chosen]);
  const send = async () => {
    try {
      await assetsApi.report({ assetId: chosen!.id, title: title.trim(), details: details.trim() || null, photoFileId: photo });
      showToast("Reported: those who handle repairs are told", "success");
      onDone?.();
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Report a problem" width="max-w-xl">
      <div className="space-y-4">
        {chosen ? (
          <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-3">
            <span className="flex-1 text-sm font-bold">
              {chosen.name} <span className="font-normal text-on-surface-variant">({chosen.code})</span>
            </span>
            {!asset && (
              <button type="button" className="text-xs font-bold text-primary" onClick={() => setChosen(null)}>
                Change
              </button>
            )}
          </div>
        ) : (
          <div>
            <Input label="Which asset? Type its name, code or the room" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Projector, AST-00012, Physics Lab…" autoFocus />
            {hits.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-auto rounded-xl border border-outline-variant/30 divide-y divide-outline-variant/20">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => setChosen(h)} className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low">
                      <span className="font-bold">{h.name}</span> <span className="text-on-surface-variant">· {h.code}{h.room ? ` · ${h.room}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Input label="What is wrong?" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Not turning on, broken leg, leaking…" maxLength={150} />
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">More details (optional)</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
        </label>
        <FilePick label="Photo (optional)" value={photo} onChange={setPhoto} accept="image/png,image/jpeg,image/webp" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!chosen || title.trim().length < 3}>
            Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type Panel = "move" | "maintain" | "dispose" | null;

/** One asset: details, history, problems, and the actions the person may take. */
export function AssetDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["assets", "one", id], queryFn: () => assetsApi.get(id) });
  const o = useAssetOptions();
  const [edit, setEdit] = useState(false);
  const [report, setReport] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [room, setRoom] = useState("");
  const [staff, setStaff] = useState("");
  const [note, setNote] = useState("");
  const [doneOn, setDoneOn] = useState(today());
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("scrapped");
  const manage = can("asset.manage");
  const refresh = (a?: Asset) => {
    if (a) queryClient.setQueryData(["assets", "one", id], a);
    queryClient.invalidateQueries({ queryKey: ["assets"] });
  };
  const run = async (fn: () => Promise<Asset>, msg: string) => {
    try {
      refresh(await fn());
      showToast(msg, "success");
      setPanel(null);
      setNote("");
      setCost("");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const a = q.data;
  const open = (p: Panel) => {
    setPanel(p);
    setRoom(a?.roomId ?? "");
    setStaff(a?.staffId ?? "");
  };
  return (
    <Drawer isOpen onClose={onClose} title={a ? `${a.name} · ${a.code}` : "Asset"} width="max-w-2xl">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : a ? (
        <div className="space-y-5">
          <div className="flex gap-4">
            {a.photoFileId && <AuthedPhoto path={assetsApi.fileUrl(a.photoFileId)} className="h-24 w-24 rounded-xl object-cover" icon="inventory_2" />}
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                <Pill tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Pill>
                {a.condition && <Pill>{a.condition}</Pill>}
                {a.quantity > 1 && <Pill tone="primary">{a.quantity} items</Pill>}
              </div>
              <p className="text-sm">
                {a.room ?? "No room"}
                {a.staff ? ` · with ${a.staff}` : ""}
              </p>
              <p className="text-xs text-on-surface-variant">{[a.category, a.make, a.model, a.serialNo && `S/N ${a.serialNo}`].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          {a.status !== "disposed" && a.status !== "lost" && (
            <div className="flex flex-wrap gap-2">
              {manage && (
                <Button variant="secondary" onClick={() => setEdit(true)}>
                  <span className="material-symbols-outlined text-lg">edit</span> Change
                </Button>
              )}
              {manage && (
                <Button variant="secondary" onClick={() => open("move")}>
                  <span className="material-symbols-outlined text-lg">move_item</span> Move / give
                </Button>
              )}
              {(can("asset.repair") || manage) && a.maintainEvery ? (
                <Button variant="secondary" onClick={() => open("maintain")}>
                  <span className="material-symbols-outlined text-lg">build</span> Maintenance done
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setReport(true)}>
                <span className="material-symbols-outlined text-lg">report</span> Report a problem
              </Button>
              {manage && (
                <Button variant="tertiary" onClick={() => open("dispose")}>
                  Write off
                </Button>
              )}
            </div>
          )}
          {panel === "move" && o.data && (
            <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Room / place" value={room} onChange={setRoom} options={opts(o.data.rooms)} />
                <Select label="Given to (staff)" value={staff} onChange={setStaff} options={opts(o.data.staff, "Nobody (take back)")} />
              </div>
              <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPanel(null)}>
                  Cancel
                </Button>
                <Button onClick={() => run(() => assetsApi.move(a.id, { roomId: room || null, staffId: staff || null, note: note || null }), "Saved")}>Save</Button>
              </div>
            </div>
          )}
          {panel === "maintain" && (
            <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Done on" type="date" value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
                <Input label="Cost (₹, optional)" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
              <Input label="What was done (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Serviced, refilled, filter cleaned…" />
              <p className="text-xs text-on-surface-variant">The next maintenance is set {a.maintainEvery} month(s) after this.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPanel(null)}>
                  Cancel
                </Button>
                <Button onClick={() => run(() => assetsApi.maintained(a.id, { doneOn, cost: num(cost), note: note || null }), "Maintenance recorded")}>Save</Button>
              </div>
            </div>
          )}
          {panel === "dispose" && (
            <div className="space-y-3 rounded-xl bg-error-container/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Why" value={reason} onChange={setReason} options={Object.entries(REASON).map(([value, label]) => ({ value, label }))} />
                <Input label="Amount received (₹, optional)" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
              <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              <p className="text-xs text-on-surface-variant">If System Settings → Assets asks for approval, it waits for the principal (or whoever approves write-offs).</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPanel(null)}>
                  Cancel
                </Button>
                <Button onClick={async () => (await confirm({ title: `Write off ${a.code}?`, message: `${a.name}: ${REASON[reason]}.`, confirmLabel: "Write off", danger: true })) && run(() => assetsApi.dispose(a.id, { reason, note: note || null, amount: num(cost) }), "Saved")}>Write off</Button>
              </div>
            </div>
          )}
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
            <Detail label="Bought on" value={day(a.purchasedOn)} />
            <Detail label="Vendor" value={a.vendor ?? "—"} />
            <Detail label="Bill" value={a.billFileId ? <button type="button" className="font-bold text-primary" onClick={() => openAssetFile(a.billFileId!)}>{a.billNo ?? "Open"}</button> : (a.billNo ?? "—")} />
            <Detail label="Cost" value={rupees(a.cost)} />
            <Detail label="Present value" value={`${rupees(a.value)}${a.depreciation ? ` (${a.depreciation}% / year)` : ""}`} />
            <Detail label="Warranty until" value={day(a.warrantyUntil)} />
            <Detail label="AMC until" value={day(a.amcUntil)} />
            <Detail label="Maintenance" value={a.maintainEvery ? `Every ${a.maintainEvery} month(s) · next ${day(a.nextMaintenanceOn)}` : "—"} />
            {a.disposedOn && <Detail label="Written off on" value={day(a.disposedOn)} />}
          </div>
          {a.notes && <p className="text-sm whitespace-pre-line">{a.notes}</p>}
          {a.disposals.some((d) => d.status === "pending") && <FormAlert tone="warning">A write-off is waiting for approval.</FormAlert>}
          {a.issues.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">Problems</p>
              <ul className="space-y-2">
                {a.issues.map((i) => (
                  <li key={i.id} className="rounded-xl bg-surface-container-low px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-bold">{i.title}</span>
                      <Pill tone={ISSUE[i.status].tone}>{ISSUE[i.status].label}</Pill>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {day(i.createdAt)} · {i.reportedBy ?? ""}
                      {i.resolution ? ` · ${i.resolution}` : ""}
                      {i.cost ? ` · ${rupees(i.cost)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">History</p>
            <ul className="space-y-1.5 text-sm">
              {a.history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs text-on-surface-variant">{day(h.at)}</span>
                  <span className="flex-1">
                    <b>{EVENT[h.kind] ?? h.kind}</b>
                    {h.from || h.to ? ` ${h.from ?? "—"} → ${h.to ?? "—"}` : ""}
                    {h.note ? `: ${h.note}` : ""}
                    {h.cost ? ` (${rupees(h.cost)})` : ""}
                    {h.by && <span className="text-xs text-on-surface-variant"> · {h.by}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {edit && o.data && <AssetForm asset={a} options={o.data} onClose={() => setEdit(false)} onSaved={(x) => { refresh(x); setEdit(false); }} />}
          {report && <ReportProblem asset={a} onClose={() => setReport(false)} onDone={() => refresh()} />}
        </div>
      ) : null}
    </Drawer>
  );
}
