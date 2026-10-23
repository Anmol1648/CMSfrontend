"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { BusMap, MapLine, MapMarker } from "@/components/transport/BusMap";
import { errorMessage } from "@/lib/api/client";
import { KIND_LABEL, MyBusChild, timeOf, transportApi, WAY_LABEL } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

const MARK: Record<string, string> = { boarded: "is on the bus", dropped: "got off the bus", absent: "was marked not at the stop" };

function Child({ child }: { child: MyBusChild }) {
  const t = child.transport;
  const { lines, markers } = useMemo(() => {
    const lines: MapLine[] = [];
    const markers: MapMarker[] = [];
    const m = t?.map;
    if (!m) return { lines, markers };
    const stops = m.stops.filter((s) => s.lat !== null && s.lng !== null);
    const route = t.trip?.kind === "afternoon" ? [[m.school.lat, m.school.lng] as [number, number], ...stops.map((s) => [s.lat!, s.lng!] as [number, number])] : [...stops.map((s) => [s.lat!, s.lng!] as [number, number]), [m.school.lat, m.school.lng] as [number, number]];
    lines.push({ points: route, color: "#A0AEC0", weight: 3, dashed: true });
    if (m.path.length > 1) lines.push({ points: m.path, color: m.color, weight: 5 });
    markers.push({ id: "school", kind: "school", lat: m.school.lat, lng: m.school.lng, label: "School" });
    for (const s of stops) markers.push(s.id === t.stop?.id ? { id: s.id, kind: "mine", lat: s.lat!, lng: s.lng!, label: `Your stop: ${s.name}` } : { id: s.id, kind: "stop", lat: s.lat!, lng: s.lng!, color: m.color, faded: s.passed });
    if (m.last) markers.push({ id: "bus", kind: "bus", lat: m.last.lat, lng: m.last.lng, color: m.color, label: "Bus" });
    return { lines, markers };
  }, [t]);

  if (!t) return <FormAlert tone="info">{child.student.name} doesn’t use the school bus.</FormAlert>;
  const trip = t.trip;
  const running = trip && !trip.ended;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-primary text-3xl">directions_bus</span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-on-surface">{t.route}</p>
            <p className="text-sm text-on-surface-variant">{t.vehicle}</p>
            <p className="text-xs text-on-surface-variant/70 mt-1">
              Stop: <b>{t.stop?.name ?? "—"}</b> · morning {t.stop?.morningTime ?? "—"} · afternoon {t.stop?.afternoonTime ?? "—"} · {WAY_LABEL[t.way]}
            </p>
            <p className="text-xs text-on-surface-variant/70">
              Driver: {t.driver ? `${t.driver.name}${t.driver.mobile ? ` · ${t.driver.mobile}` : ""}` : "—"}
              {t.helper ? ` · Helper: ${t.helper.name}${t.helper.mobile ? ` · ${t.helper.mobile}` : ""}` : ""}
            </p>
          </div>
          {t.driver?.mobile && (
            <a href={`tel:${t.driver.mobile}`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">call</span> Call driver
            </a>
          )}
        </div>
      </Card>
      {running ? (
        <div className={cn("rounded-2xl px-5 py-4", (trip.delayMin ?? 0) >= 10 ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800")}>
          <p className="font-extrabold text-lg">
            {trip.eta != null ? `About ${trip.eta} min to ${t.stop?.name}` : trip.kind === "morning" ? "The bus has passed your stop" : "On the way"}
            {trip.stopsBefore != null && trip.stopsBefore > 0 ? ` · ${trip.stopsBefore} stop${trip.stopsBefore === 1 ? "" : "s"} before yours` : ""}
          </p>
          <p className="text-sm mt-1">
            {KIND_LABEL[trip.kind]} started {timeOf(trip.startedAt)}
            {(trip.delayMin ?? 0) >= 5 ? ` · running ${trip.delayMin} min late` : ""}
          </p>
          {trip.mark && (
            <p className="text-sm font-bold mt-1">
              {child.student.name} {MARK[trip.mark.kind] ?? trip.mark.kind} ({timeOf(trip.mark.at)})
            </p>
          )}
        </div>
      ) : trip?.ended ? (
        <FormAlert tone="info">Today’s {trip.kind} trip ended at {timeOf(trip.endedAt)}.</FormAlert>
      ) : (
        <FormAlert tone="info">The bus hasn’t started yet. You’ll get a notification when it starts and when it’s near your stop.</FormAlert>
      )}
      {t.map ? (
        <Card padding="sm">
          <BusMap center={t.map.last ?? t.map.school} lines={lines} markers={markers} fitKey={trip?.id ?? "none"} className="h-[440px] w-full rounded-2xl overflow-hidden z-0" />
        </Card>
      ) : running ? null : (
        <p className="text-xs text-on-surface-variant/70">The bus shows on the map while it’s on a trip.</p>
      )}
    </div>
  );
}

function Mine() {
  const q = useQuery({ queryKey: ["transport", "my-bus"], queryFn: transportApi.myBus, refetchInterval: 10_000 });
  const [pick, setPick] = useState<string | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const children = q.data!.children;
  if (!children.length) return <FormAlert tone="info">No student is linked to your login.</FormAlert>;
  const child = children.find((c) => c.student.id === pick) ?? children[0];
  return (
    <div className="space-y-4">
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <button key={c.student.id} type="button" onClick={() => setPick(c.student.id)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold border", c.student.id === child.student.id ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {c.student.name}
            </button>
          ))}
        </div>
      )}
      <Child key={child.student.id} child={child} />
      <p className="text-xs text-on-surface-variant/60">
        Updates every 10 seconds. <Pill>Live</Pill>
      </p>
    </div>
  );
}

export default function MyBusPage() {
  return (
    <RequirePermission permission="transport.track_mine">
      <PageHeader title="My Bus" description="Where the school bus is, when it reaches your stop, and when your child got on or off." />
      <Mine />
    </RequirePermission>
  );
}
