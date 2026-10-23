"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BusMap, MapLine, MapMarker } from "@/components/transport/BusMap";
import { ApiError, errorMessage } from "@/lib/api/client";
import { Route, RouteInput, Stop, StopInput, transportApi } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

const COLORS = ["#2B6CB0", "#C05621", "#2F855A", "#6B46C1", "#B83280", "#2C7A7B", "#975A16", "#1A365D"];

function RouteForm({ route, onClose }: { route: Route | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const vehicles = useQuery({ queryKey: ["transport", "vehicles"], queryFn: transportApi.vehicles });
  const staff = useQuery({ queryKey: ["transport", "staff"], queryFn: transportApi.staff });
  const [v, setV] = useState<RouteInput>(route ? { name: route.name, code: route.code, vehicleId: route.vehicleId, driverId: route.driverId, helperId: route.helperId, morningStart: route.morningStart, afternoonStart: route.afternoonStart, color: route.color, isActive: route.isActive } : { name: "", code: null, vehicleId: null, driverId: null, helperId: null, morningStart: "07:00", afternoonStart: "14:00", color: COLORS[0], isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (p: Partial<RouteInput>) => setV((x) => ({ ...x, ...p }));
  const people = [{ value: "", label: "No one" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.label}${s.hasLogin ? "" : " · no login"}` }))];
  const save = async () => {
    setError(null);
    try {
      await transportApi.saveRoute(route?.id ?? null, v);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={route ? "Edit route" : "Add a route"} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Input label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={fields.name} placeholder="Route 4: Tapovan" />
          <Input label="Code" value={v.code ?? ""} onChange={(e) => set({ code: e.target.value || null })} placeholder="R4" />
        </div>
        <Select label="Vehicle" value={v.vehicleId ?? ""} onChange={(x) => set({ vehicleId: x || null })} options={[{ value: "", label: "None yet" }, ...(vehicles.data ?? []).filter((x) => x.isActive).map((x) => ({ value: x.id, label: `${x.name} (${x.number}) · ${x.capacity} seats` }))]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Driver" value={v.driverId ?? ""} onChange={(x) => set({ driverId: x || null })} options={people} />
          <Select label="Helper / attendant" value={v.helperId ?? ""} onChange={(x) => set({ helperId: x || null })} options={people} />
        </div>
        <p className="text-xs text-on-surface-variant/70">The driver and helper run the trip on their phone (My Trip). They need a login with the Driver / Bus Helper role (Users).</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Morning trip leaves the first stop" type="time" value={v.morningStart} onChange={(e) => set({ morningStart: e.target.value })} error={fields.morningStart} />
          <Input label="Afternoon trip leaves school" type="time" value={v.afternoonStart} onChange={(e) => set({ afternoonStart: e.target.value })} error={fields.afternoonStart} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">Colour on the map</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => set({ color: c })} className={cn("h-8 w-8 rounded-full border-2", v.color === c ? "border-on-surface" : "border-transparent")} style={{ background: c }} />
            ))}
          </div>
        </div>
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

function StopForm({ routeId, stop, at, onClose }: { routeId: string; stop: Stop | null; at: { lat: number; lng: number } | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<StopInput>(stop ? { name: stop.name, landmark: stop.landmark, lat: at?.lat ?? stop.lat, lng: at?.lng ?? stop.lng, morningTime: stop.morningTime, afternoonTime: stop.afternoonTime, fare: stop.fare, isActive: stop.isActive } : { name: "", landmark: null, lat: at?.lat ?? null, lng: at?.lng ?? null, morningTime: null, afternoonTime: null, fare: 0, isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (p: Partial<StopInput>) => setV((x) => ({ ...x, ...p }));
  const save = async () => {
    setError(null);
    try {
      if (stop) await transportApi.updateStop(stop.id, v);
      else await transportApi.addStop(routeId, v);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={stop ? "Edit stop" : "Add a stop"} width="max-w-xl">
      <div className="space-y-4">
        <Input label="Stop name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={fields.name} placeholder="Marwari Chowk" />
        <Input label="Landmark (optional)" value={v.landmark ?? ""} onChange={(e) => set({ landmark: e.target.value || null })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Latitude" type="number" step="0.000001" value={v.lat ?? ""} onChange={(e) => set({ lat: e.target.value === "" ? null : Number(e.target.value) })} error={fields.lat} />
          <Input label="Longitude" type="number" step="0.000001" value={v.lng ?? ""} onChange={(e) => set({ lng: e.target.value === "" ? null : Number(e.target.value) })} error={fields.lng} />
        </div>
        <p className="text-xs text-on-surface-variant/70">Tip: close this and click the map to put the stop where it is.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Morning bus due" type="time" value={v.morningTime ?? ""} onChange={(e) => set({ morningTime: e.target.value || null })} />
          <Input label="Afternoon bus due" type="time" value={v.afternoonTime ?? ""} onChange={(e) => set({ afternoonTime: e.target.value || null })} />
          <Input label="Fare per instalment (₹)" type="number" min={0} value={v.fare} onChange={(e) => set({ fare: Math.max(0, Math.round(Number(e.target.value) || 0)) })} error={fields.fare} />
        </div>
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

function Routes() {
  const { can } = useAuth();
  const manage = can("transport.manage");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["transport", "routes"], queryFn: transportApi.routes });
  const [chosen, setChosen] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState<Route | null | "new">(null);
  const [stopForm, setStopForm] = useState<{ stop: Stop | null; at: { lat: number; lng: number } | null } | null>(null);
  const [placing, setPlacing] = useState<Stop | null | "new">(null);
  const route = q.data?.routes.find((r) => r.id === chosen) ?? q.data?.routes[0] ?? null;

  const { lines, markers } = useMemo(() => {
    const lines: MapLine[] = [];
    const markers: MapMarker[] = [];
    if (!q.data) return { lines, markers };
    const school = q.data.school;
    markers.push({ id: "school", kind: "school", lat: school.lat, lng: school.lng, label: "School" });
    for (const r of q.data.routes) {
      const mine = r.id === route?.id;
      const pts = r.stops.filter((s) => s.lat !== null && s.lng !== null).map((s) => [s.lat!, s.lng!] as [number, number]);
      lines.push({ points: [...pts, [school.lat, school.lng]], color: mine ? r.color : "#A0AEC0", weight: mine ? 5 : 2, dashed: !mine });
      if (mine) r.stops.forEach((s, i) => s.lat !== null && s.lng !== null && markers.push({ id: s.id, kind: "stop", lat: s.lat, lng: s.lng, color: r.color, label: `${i + 1}. ${s.name}`, faded: !s.isActive }));
    }
    return { lines, markers };
  }, [q.data, route?.id]);

  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const routes = q.data!.routes;

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const removeRoute = async (r: Route) => {
    if (await confirm({ title: `Delete ${r.name}?`, message: "Its stops go with it. A route with students can’t be deleted (make it not in use instead).", confirmLabel: "Delete", danger: true })) await act(() => transportApi.deleteRoute(r.id), "Deleted");
  };
  const removeStop = async (s: Stop) => {
    if (await confirm({ title: `Delete the stop ${s.name}?`, confirmLabel: "Delete", danger: true })) await act(() => transportApi.deleteStop(s.id), "Deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {routes.map((r) => (
          <button key={r.id} type="button" onClick={() => setChosen(r.id)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold border flex items-center gap-2", r.id === route?.id ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high", !r.isActive && "opacity-60")}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
            {r.name}
          </button>
        ))}
        {manage && (
          <Button className="ml-auto" onClick={() => setRouteForm("new")}>
            Add a route
          </Button>
        )}
      </div>
      {!route ? (
        <FormAlert tone="info">No routes yet.{manage ? " Add a route, then put its stops on the map." : ""}</FormAlert>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <Card padding="sm">
            {placing && <div className="mb-2 rounded-xl bg-primary/10 text-primary text-sm font-bold px-4 py-2">Click the map where the stop {placing === "new" ? "is" : `“${placing.name}” is`}.</div>}
            <BusMap
              center={q.data!.school}
              lines={lines}
              markers={markers}
              fitKey={route.id}
              className="h-[540px] w-full rounded-2xl overflow-hidden z-0"
              onMapClick={
                manage && placing
                  ? (lat, lng) => {
                      setStopForm({ stop: placing === "new" ? null : placing, at: { lat, lng } });
                      setPlacing(null);
                    }
                  : undefined
              }
            />
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-on-surface">{route.name}</p>
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  {route.vehicle ?? "No vehicle"}
                  {route.capacity ? ` · ${route.students} of ${route.capacity} seats used` : ` · ${route.students} students`}
                </p>
                <p className="text-xs text-on-surface-variant/70">
                  Driver: {route.driver ? `${route.driver.name}${route.driver.mobile ? ` (${route.driver.mobile})` : ""}` : "—"} · Helper: {route.helper?.name ?? "—"}
                </p>
                <p className="text-xs text-on-surface-variant/70">
                  Morning from {route.morningStart} · afternoon from {route.afternoonStart}
                </p>
              </div>
              {manage && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => setRouteForm(route)} className="p-1.5 rounded-lg hover:bg-surface-container-high" aria-label="Edit route">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button type="button" onClick={() => removeRoute(route)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-error" aria-label="Delete route">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              )}
            </div>
            {route.capacity !== null && route.students > route.capacity && <FormAlert tone="warning">More students ({route.students}) than seats ({route.capacity}).</FormAlert>}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Stops, in the morning order</p>
              {manage && (
                <Button variant="tertiary" onClick={() => setPlacing("new")}>
                  Add a stop
                </Button>
              )}
            </div>
            {placing && (
              <div className="mt-2 rounded-xl bg-primary text-white px-4 py-3 space-y-2">
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined">ads_click</span>
                  Now click the map where {placing === "new" ? "the new stop" : `“${placing.name}”`} is.
                </p>
                <div className="flex gap-3 text-xs font-bold">
                  <button type="button" onClick={() => { setStopForm({ stop: placing === "new" ? null : placing, at: null }); setPlacing(null); }} className="underline">
                    Type it in instead
                  </button>
                  <button type="button" onClick={() => setPlacing(null)} className="underline opacity-80">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <ol className="mt-2 space-y-2">
              {!route.stops.length && !placing && <li className="text-xs text-on-surface-variant/70 px-3">No stops yet. Click “Add a stop”, then click the map where it is.</li>}
              {route.stops.map((s, i) => (
                <li key={s.id} className={cn("rounded-xl bg-surface-container-low px-3 py-2", !s.isActive && "opacity-60")}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-primary w-5">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">{s.name}</p>
                      <p className="text-xs text-on-surface-variant/70">
                        {s.morningTime ?? "—"} / {s.afternoonTime ?? "—"} · ₹{s.fare} · {s.students} students
                        {s.lat === null ? " · not on the map" : ""}
                      </p>
                    </div>
                    {manage && (
                      <div className="flex">
                        <button type="button" disabled={i === 0} onClick={() => act(() => transportApi.moveStop(s.id, "up"), "Moved")} className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30" aria-label="Up">
                          <span className="material-symbols-outlined text-base">arrow_upward</span>
                        </button>
                        <button type="button" disabled={i === route.stops.length - 1} onClick={() => act(() => transportApi.moveStop(s.id, "down"), "Moved")} className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30" aria-label="Down">
                          <span className="material-symbols-outlined text-base">arrow_downward</span>
                        </button>
                        <button type="button" onClick={() => setPlacing(s)} className="p-1 rounded hover:bg-surface-container-high" aria-label="Place on the map">
                          <span className="material-symbols-outlined text-base">add_location</span>
                        </button>
                        <button type="button" onClick={() => setStopForm({ stop: s, at: null })} className="p-1 rounded hover:bg-surface-container-high" aria-label="Edit">
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button type="button" onClick={() => removeStop(s)} className="p-1 rounded hover:bg-surface-container-high text-error" aria-label="Delete">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              <li className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-base">school</span> School
              </li>
            </ol>
            {!route.isActive && (
              <div className="mt-3">
                <Pill>Not in use</Pill>
              </div>
            )}
          </Card>
        </div>
      )}
      {routeForm && <RouteForm route={routeForm === "new" ? null : routeForm} onClose={() => setRouteForm(null)} />}
      {stopForm && route && <StopForm routeId={route.id} stop={stopForm.stop} at={stopForm.at} onClose={() => setStopForm(null)} />}
    </div>
  );
}

export default function TransportRoutesPage() {
  return (
    <RequirePermission permission={["transport.view", "transport.manage"]}>
      <PageHeader title="Routes & Stops" description="Each route’s bus, driver and helper, and its stops in order on the map, with their times and fare." />
      <Routes />
    </RequirePermission>
  );
}
