"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { PaperInput, transportApi, Vehicle, VehicleInput, VehiclePaper } from "@/lib/api/transport";

function VehicleForm({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<VehicleInput>(vehicle ? { number: vehicle.number, name: vehicle.name, typeId: vehicle.typeId, capacity: vehicle.capacity, make: vehicle.make, model: vehicle.model, year: vehicle.year, gpsDeviceId: vehicle.gpsDeviceId, notes: vehicle.notes, isActive: vehicle.isActive } : { number: "", name: "", typeId: null, capacity: 40, make: null, model: null, year: null, gpsDeviceId: null, notes: null, isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (p: Partial<VehicleInput>) => setV((x) => ({ ...x, ...p }));
  const save = async () => {
    setError(null);
    try {
      await transportApi.saveVehicle(vehicle?.id ?? null, v);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={vehicle ? "Edit vehicle" : "Add a vehicle"} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Registration number" value={v.number} onChange={(e) => set({ number: e.target.value })} error={fields.number} placeholder="UK07 PA 1234" />
          <Input label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={fields.name} placeholder="Bus 4" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MasterSelect master="vehicle_type" label="Type" value={v.typeId ?? ""} onChange={(id) => set({ typeId: id || null })} />
          <Input label="Seats" type="number" min={1} value={v.capacity} onChange={(e) => set({ capacity: Math.max(1, Math.round(Number(e.target.value) || 1)) })} error={fields.capacity} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Make" value={v.make ?? ""} onChange={(e) => set({ make: e.target.value || null })} />
          <Input label="Model" value={v.model ?? ""} onChange={(e) => set({ model: e.target.value || null })} />
          <Input label="Year" type="number" value={v.year ?? ""} onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : null })} error={fields.year} />
        </div>
        <Input label="GPS device id (optional)" value={v.gpsDeviceId ?? ""} onChange={(e) => set({ gpsDeviceId: e.target.value || null })} placeholder="Only if the bus has a GPS device (System Settings → Transport)" />
        <TextArea label="Notes" rows={2} value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} />
        <Checkbox checked={v.isActive} onChange={(x) => set({ isActive: x })} label="In use" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function PaperForm({ vehicleId, paper, onClose }: { vehicleId: string; paper: VehiclePaper | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<PaperInput>(paper ? { typeId: paper.typeId, number: paper.number, issuedOn: paper.issuedOn, expiresOn: paper.expiresOn, notes: paper.notes } : { typeId: null, number: null, issuedOn: null, expiresOn: null, notes: null });
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<PaperInput>) => setV((x) => ({ ...x, ...p }));
  const save = async () => {
    try {
      await transportApi.savePaper(vehicleId, paper?.id ?? null, v);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={paper ? "Edit paper" : "Add a paper"}>
      <div className="space-y-4">
        <MasterSelect master="vehicle_document" label="Paper" value={v.typeId ?? ""} onChange={(id) => set({ typeId: id || null })} />
        <Input label="Number" value={v.number ?? ""} onChange={(e) => set({ number: e.target.value || null })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Issued on" type="date" value={v.issuedOn ?? ""} onChange={(e) => set({ issuedOn: e.target.value || null })} />
          <Input label="Expires on" type="date" value={v.expiresOn ?? ""} onChange={(e) => set({ expiresOn: e.target.value || null })} />
        </div>
        <Input label="Notes" value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function Papers({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const { can } = useAuth();
  const manage = can("transport.manage");
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["transport", "papers", vehicle.id], queryFn: () => transportApi.papers(vehicle.id) });
  const [form, setForm] = useState<VehiclePaper | null | "new">(null);
  const remove = async (p: VehiclePaper) => {
    if (!(await confirm({ title: `Delete ${p.type}?`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await transportApi.deletePaper(p.id);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Papers of ${vehicle.name} (${vehicle.number})`} width="max-w-2xl">
      {q.isLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-3">
          {!q.data?.length && <FormAlert tone="info">No papers yet.</FormAlert>}
          {q.data?.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface">{p.type}</p>
                <p className="text-xs text-on-surface-variant/70">
                  {p.number ?? "—"} · {p.expiresOn ? `expires ${p.expiresOn}` : "no expiry"}
                </p>
              </div>
              {p.expired ? <Pill tone="danger">Expired</Pill> : p.expiring ? <Pill tone="warning">Expiring soon</Pill> : <Pill tone="success">Valid</Pill>}
              {manage && (
                <>
                  <button type="button" onClick={() => setForm(p)} className="p-1 rounded hover:bg-surface-container-high" aria-label="Edit">
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button type="button" onClick={() => remove(p)} className="p-1 rounded hover:bg-surface-container-high text-error" aria-label="Delete">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </>
              )}
            </div>
          ))}
          <p className="text-xs text-on-surface-variant/70">Those who manage transport get a daily alert before papers expire (days in System Settings → Transport; the alert in Alerts → Built-in Alerts).</p>
          {manage && (
            <div className="flex justify-end">
              <Button onClick={() => setForm("new")}>Add a paper</Button>
            </div>
          )}
        </div>
      )}
      {form && <PaperForm vehicleId={vehicle.id} paper={form === "new" ? null : form} onClose={() => setForm(null)} />}
    </Modal>
  );
}

function Vehicles() {
  const { can } = useAuth();
  const manage = can("transport.manage");
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["transport", "vehicles"], queryFn: transportApi.vehicles });
  const [form, setForm] = useState<Vehicle | null | "new">(null);
  const [papers, setPapers] = useState<Vehicle | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const remove = async (v: Vehicle) => {
    if (!(await confirm({ title: `Delete ${v.name}?`, message: "A vehicle with a route or trips can’t be deleted; make it not in use instead.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await transportApi.deleteVehicle(v.id);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Deleted", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      {manage && (
        <div className="flex justify-end">
          <Button onClick={() => setForm("new")}>Add a vehicle</Button>
        </div>
      )}
      {!q.data?.length && <FormAlert tone="info">No vehicles yet.</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {q.data?.map((v) => (
          <Card key={v.id} className={v.isActive ? "" : "opacity-60"}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-primary">directions_bus</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-on-surface">{v.name}</p>
                <p className="text-sm font-bold text-on-surface-variant">{v.number}</p>
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  {[v.type, `${v.capacity} seats`, [v.make, v.model].filter(Boolean).join(" "), v.year].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-on-surface-variant/70">{v.routes.length ? v.routes.join(", ") : "No route"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {v.expired > 0 && <Pill tone="danger">{v.expired} expired</Pill>}
              {v.expiring > 0 && <Pill tone="warning">{v.expiring} expiring soon</Pill>}
              {!v.expired && !v.expiring && <Pill tone="success">Papers in order</Pill>}
              {!v.isActive && <Pill>Not in use</Pill>}
              <div className="ml-auto flex gap-1">
                <Button variant="tertiary" onClick={() => setPapers(v)}>
                  Papers
                </Button>
                {manage && (
                  <>
                    <button type="button" onClick={() => setForm(v)} className="p-1.5 rounded-lg hover:bg-surface-container-high" aria-label="Edit">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button type="button" onClick={() => remove(v)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-error" aria-label="Delete">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {form && <VehicleForm vehicle={form === "new" ? null : form} onClose={() => setForm(null)} />}
      {papers && <Papers vehicle={papers} onClose={() => setPapers(null)} />}
    </div>
  );
}

export default function TransportVehiclesPage() {
  return (
    <RequirePermission permission={["transport.view", "transport.manage"]}>
      <PageHeader title="Vehicles" description="The school’s buses and vans, their seats and papers (fitness, insurance, permit…) with expiry reminders." />
      <Vehicles />
    </RequirePermission>
  );
}
