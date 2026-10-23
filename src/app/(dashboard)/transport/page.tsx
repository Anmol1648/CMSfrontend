"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BusMap, MapLine, MapMarker } from "@/components/transport/BusMap";
import { TripPanel } from "@/components/transport/TripPanel";
import { errorMessage } from "@/lib/api/client";
import { LiveBus, timeOf, transportApi } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

const STATE: Record<LiveBus["state"], { label: string; tone: "success" | "warning" | "danger" | "neutral" | "primary" }> = {
  moving: { label: "On the way", tone: "success" },
  late: { label: "Late", tone: "warning" },
  no_signal: { label: "No signal", tone: "danger" },
  done: { label: "Trip done", tone: "neutral" },
  not_started: { label: "Not started", tone: "neutral" },
};

function DemoBus({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const routes = useQuery({ queryKey: ["transport", "routes"], queryFn: transportApi.routes });
  const [routeId, setRouteId] = useState("");
  const [kind, setKind] = useState<"morning" | "afternoon">("morning");
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setError(null);
    try {
      await transportApi.simulate(routeId, kind);
      queryClient.invalidateQueries({ queryKey: ["transport", "live"] });
      showToast("Demo bus started: it moves along the stops in a few minutes", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Run a demo bus">
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">A pretend bus drives the route by itself (no phone needed), so you can watch the live map, the parent’s My Bus screen and the alerts. It runs three times faster than a real bus.</p>
        <Select label="Route" value={routeId} onChange={setRouteId} options={[{ value: "", label: "Choose…" }, ...(routes.data?.routes ?? []).filter((r) => r.isActive).map((r) => ({ value: r.id, label: r.name }))]} />
        <Select label="Trip" value={kind} onChange={(k) => setKind(k as "morning" | "afternoon")} options={[{ value: "morning", label: "Morning (stops → school)" }, { value: "afternoon", label: "Afternoon (school → stops)" }]} />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={start} disabled={!routeId}>
            Start
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Live() {
  const { can } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const live = useQuery({ queryKey: ["transport", "live"], queryFn: transportApi.live, refetchInterval: 5000 });
  const routes = useQuery({ queryKey: ["transport", "routes"], queryFn: transportApi.routes, enabled: can("transport.view") || can("transport.manage") });
  const [chosen, setChosen] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const bus = live.data?.buses.find((b) => b.routeId === chosen) ?? null;
  const trip = useQuery({ queryKey: ["transport", "trip", bus?.tripId], queryFn: () => transportApi.trip(bus!.tripId!, true), enabled: !!bus?.tripId, refetchInterval: bus?.state === "done" ? false : 5000 });

  const { lines, markers } = useMemo(() => {
    const lines: MapLine[] = [];
    const markers: MapMarker[] = [];
    const d = live.data;
    if (!d) return { lines, markers };
    markers.push({ id: "school", kind: "school", lat: d.school.lat, lng: d.school.lng, label: "School" });
    for (const r of routes.data?.routes ?? []) {
      if (chosen && r.id !== chosen) continue;
      const pts = r.stops.filter((s) => s.lat !== null && s.lng !== null).map((s) => [s.lat!, s.lng!] as [number, number]);
      lines.push({ points: [...pts, [d.school.lat, d.school.lng]], color: r.color, dashed: true, weight: 3 });
      for (const s of r.stops) if (s.lat !== null && s.lng !== null) markers.push({ id: `stop:${s.id}`, kind: "stop", lat: s.lat, lng: s.lng, color: r.color, popup: `${s.name}\n${s.students} students · ${s.morningTime ?? ""}` });
    }
    if (trip.data?.path.length) lines.push({ points: trip.data.path, color: trip.data.color, weight: 5 });
    for (const b of d.buses) if (b.last) markers.push({ id: b.routeId, kind: "bus", lat: b.last.lat, lng: b.last.lng, color: b.sos.length ? "#C53030" : b.color, label: b.route.split(":")[0], popup: `${b.route}\n${b.vehicle ?? ""}\n${b.last.speed != null ? Math.round(b.last.speed) + " km/h" : ""}` });
    return { lines, markers };
  }, [live.data, routes.data, chosen, trip.data]);

  if (live.isLoading) return <PageLoader />;
  if (live.error) return <FormAlert>{errorMessage(live.error)}</FormAlert>;
  const d = live.data!;
  const sos = d.buses.filter((b) => b.sos.length);
  const running = d.buses.filter((b) => b.state === "moving" || b.state === "late" || b.state === "no_signal").length;

  const end = async () => {
    if (!bus?.tripId) return;
    if (!(await confirm({ title: "End this trip?", message: "Use this only if the driver couldn’t end it on the phone.", confirmLabel: "End trip", danger: true }))) return;
    try {
      await transportApi.endTrip(bus.tripId);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Trip ended", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  return (
    <div className="space-y-4">
      {sos.map((b) => (
        <div key={b.routeId} className="rounded-2xl bg-error text-white px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl">emergency</span>
          <div>
            <p className="font-extrabold">SOS from {b.route} ({b.vehicle})</p>
            <p className="text-sm opacity-90">
              {b.sos.map((s) => `${timeOf(s.at)}: ${s.note ?? "no note"}`).join(" · ")}
            </p>
          </div>
          <Button variant="secondary" className="ml-auto" onClick={() => setChosen(b.routeId)}>
            Show
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-on-surface-variant">
          <b>{running}</b> of {d.buses.length} buses on the road now · updates every 5 seconds
        </p>
        <div className="ml-auto flex gap-2">
          {chosen && (
            <Button variant="secondary" onClick={() => setChosen(null)}>
              Show all buses
            </Button>
          )}
          <Button variant="secondary" onClick={() => setDemo(true)}>
            Run a demo bus
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card padding="sm">
          <BusMap center={d.school} lines={lines} markers={markers} fitKey={chosen ?? "all"} onMarkerClick={(id) => !id.startsWith("stop:") && id !== "school" && setChosen(id)} className="h-[560px] w-full rounded-2xl overflow-hidden z-0" />
        </Card>
        <div className="space-y-3">
          {bus && trip.data ? (
            <Card>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-extrabold text-on-surface">{bus.route}</p>
                  <p className="text-xs text-on-surface-variant/70">{bus.vehicle}</p>
                </div>
                {trip.data.status === "running" && (
                  <Button variant="tertiary" onClick={end}>
                    End trip
                  </Button>
                )}
              </div>
              <TripPanel trip={trip.data} />
            </Card>
          ) : (
            d.buses.map((b) => (
              <button key={b.routeId} type="button" onClick={() => setChosen(b.routeId)} className={cn("w-full text-left rounded-2xl bg-surface-container-lowest p-4 shadow-sm hover:shadow-md transition border-l-4")} style={{ borderLeftColor: b.color }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-on-surface text-sm">{b.route}</p>
                  <Pill tone={b.sos.length ? "danger" : STATE[b.state].tone}>{b.sos.length ? "SOS" : STATE[b.state].label}</Pill>
                </div>
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  {b.vehicle ?? "No vehicle"}
                  {b.last ? ` · stop ${Math.min(b.nextStop + 1, b.stops)} of ${b.stops}` : ""}
                  {b.delayMin >= 5 && b.last ? ` · ${b.delayMin} min late` : ""}
                  {b.last?.speed != null ? ` · ${Math.round(b.last.speed)} km/h` : ""}
                </p>
              </button>
            ))
          )}
          {bus && !bus.tripId && <FormAlert tone="info">{bus.route}: no trip today yet.</FormAlert>}
        </div>
      </div>
      {demo && <DemoBus onClose={() => setDemo(false)} />}
    </div>
  );
}

export default function TransportLivePage() {
  return (
    <RequirePermission permission="transport.track_all">
      <PageHeader title="Live Map" description="Every bus on the map as it moves, how late it is, and SOS from drivers. Click a bus to see its stops." />
      <Live />
    </RequirePermission>
  );
}
