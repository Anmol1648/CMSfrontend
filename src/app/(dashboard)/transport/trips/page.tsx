"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { BusMap, MapLine, MapMarker } from "@/components/transport/BusMap";
import { TripPanel } from "@/components/transport/TripPanel";
import { errorMessage } from "@/lib/api/client";
import { KIND_LABEL, timeOf, todayIST, transportApi } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

/** One trip on the map, with a slider to play back where the bus was. */
function Replay({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["transport", "trip", id], queryFn: () => transportApi.trip(id) });
  const [at, setAt] = useState<number | null>(null);
  const t = q.data;
  const { lines, markers } = useMemo(() => {
    const lines: MapLine[] = [];
    const markers: MapMarker[] = [];
    if (!t) return { lines, markers };
    const i = at === null ? t.path.length - 1 : at;
    lines.push({ points: t.path, color: "#A0AEC0", weight: 4 });
    lines.push({ points: t.path.slice(0, i + 1), color: t.color, weight: 5 });
    markers.push({ id: "school", kind: "school", lat: t.school.lat, lng: t.school.lng, label: "School" });
    for (const s of t.stops) if (s.lat !== null && s.lng !== null) markers.push({ id: s.id, kind: "stop", lat: s.lat, lng: s.lng, color: t.color, label: s.name, popup: `${s.name}\nDue ${s.time ?? "—"}${s.reachedAt ? ` · reached ${timeOf(s.reachedAt)}` : ""}` });
    const p = t.path[i];
    if (p) markers.push({ id: "bus", kind: "bus", lat: p[0], lng: p[1], color: t.color });
    return { lines, markers };
  }, [t, at]);
  if (q.isLoading) return <PageLoader />;
  if (q.error || !t) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card padding="sm">
        <BusMap center={t.school} lines={lines} markers={markers} fitKey={id} className="h-[480px] w-full rounded-2xl overflow-hidden z-0" />
        {t.path.length > 1 && (
          <div className="px-2 pt-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">play_circle</span>
            <input type="range" min={0} max={t.path.length - 1} value={at ?? t.path.length - 1} onChange={(e) => setAt(Number(e.target.value))} className="flex-1 accent-[#1A365D]" aria-label="Play back the trip" />
            <span className="text-xs text-on-surface-variant w-28 text-right">
              Point {(at ?? t.path.length - 1) + 1} of {t.path.length}
            </span>
          </div>
        )}
      </Card>
      <Card>
        <p className="font-extrabold text-on-surface mb-3">{t.route}</p>
        <TripPanel trip={t} />
      </Card>
    </div>
  );
}

function Trips() {
  const [date, setDate] = useState(todayIST());
  const [route, setRoute] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const routes = useQuery({ queryKey: ["transport", "routes"], queryFn: transportApi.routes, retry: false });
  const q = useQuery({ queryKey: ["transport", "trips", date, route], queryFn: () => transportApi.trips({ date, route: route || undefined }) });
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Day" type="date" value={date} onChange={(e) => { setDate(e.target.value); setChosen(null); }} />
          <Select label="Route" value={route} onChange={(x) => { setRoute(x); setChosen(null); }} options={[{ value: "", label: "All routes" }, ...(routes.data?.routes ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.length ? (
        <FormAlert tone="info">No trips on this day.</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Stops</th>
                  <th className="px-4 py-3">Late</th>
                  <th className="px-4 py-3">Alerts</th>
                  <th className="px-4 py-3">Run by</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((t) => (
                  <tr key={t.id} onClick={() => setChosen(t.id)} className={cn("border-b border-outline-variant/10 cursor-pointer hover:bg-surface-container-low", chosen === t.id && "bg-primary/5")}>
                    <td className="px-4 py-2.5 font-bold">{t.route}</td>
                    <td className="px-4 py-2.5">{KIND_LABEL[t.kind]}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {timeOf(t.startedAt)} – {t.endedAt ? timeOf(t.endedAt) : <Pill tone="success">Running</Pill>}
                    </td>
                    <td className="px-4 py-2.5">{t.stopsReached}</td>
                    <td className="px-4 py-2.5">{t.delayMin >= 5 ? <Pill tone="warning">{t.delayMin} min</Pill> : "On time"}</td>
                    <td className="px-4 py-2.5 space-x-1">
                      {t.sos > 0 && <Pill tone="danger">SOS</Pill>}
                      {t.overspeed > 0 && <Pill tone="warning">Speed ×{t.overspeed}</Pill>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{t.source === "simulated" ? "Demo bus" : (t.by ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-on-surface-variant/60">Click a trip to play it back on the map.</p>
        </Card>
      )}
      {chosen && <Replay key={chosen} id={chosen} />}
    </div>
  );
}

export default function TransportTripsPage() {
  return (
    <RequirePermission permission="transport.track_all">
      <PageHeader title="Trips" description="Every trip of a day: when it ran, how late, alerts, and its path on the map to play back." />
      <Trips />
    </RequirePermission>
  );
}
