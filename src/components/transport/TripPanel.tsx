"use client";

import { Pill } from "@/components/forms";
import { KIND_LABEL, timeOf, TripView } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

const EVENT: Record<string, string> = { start: "Trip started", stop: "Reached", boarded: "Got on", dropped: "Got off", absent: "Not there", sos: "SOS", overspeed: "Over the speed limit", late: "Running late", end: "Trip ended" };
const EVENT_ICON: Record<string, string> = { start: "play_circle", stop: "location_on", boarded: "login", dropped: "logout", absent: "person_off", sos: "emergency", overspeed: "speed", late: "schedule", end: "flag" };

/** A trip's stops (reached, next, ahead) and what happened, for the live map and the history. */
export function TripPanel({ trip }: { trip: TripView }) {
  const students = new Map(trip.stops.flatMap((s) => s.students.map((x) => [x.id, x.name] as const)));
  const stops = new Map(trip.stops.map((s) => [s.id, s.name]));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={trip.status === "running" ? "success" : "neutral"}>{trip.status === "running" ? "Running" : "Done"}</Pill>
        <Pill>{KIND_LABEL[trip.kind]}</Pill>
        {trip.delayMin >= 5 && <Pill tone="warning">{trip.delayMin} min late</Pill>}
        {trip.source === "simulated" && <Pill tone="primary">Demo bus</Pill>}
        <span className="text-xs text-on-surface-variant/70">
          {trip.vehicle} · started {timeOf(trip.startedAt)}
          {trip.endedAt ? ` · ended ${timeOf(trip.endedAt)}` : ""}
          {trip.last?.speed != null && trip.status === "running" ? ` · ${Math.round(trip.last.speed)} km/h` : ""}
        </span>
      </div>
      <ol className="space-y-2">
        {trip.stops.map((s, i) => (
          <li key={s.id} className={cn("flex items-start gap-3 rounded-xl px-3 py-2", i === trip.nextStop && trip.status === "running" ? "bg-primary/10" : "")}>
            <span className={cn("material-symbols-outlined text-lg", s.passed ? "text-green-700" : i === trip.nextStop ? "text-primary" : "text-on-surface-variant/40")}>{s.passed ? "check_circle" : i === trip.nextStop ? "radio_button_checked" : "radio_button_unchecked"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface">{s.name}</p>
              <p className="text-xs text-on-surface-variant/70">
                Due {s.time ?? "—"}
                {s.reachedAt ? ` · reached ${timeOf(s.reachedAt)}` : ""} · {s.students.length} student{s.students.length === 1 ? "" : "s"}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">What happened</p>
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {[...trip.events].reverse().map((e, i) => (
            <li key={i} className={cn("flex items-center gap-2 text-xs", e.kind === "sos" ? "text-error font-bold" : "text-on-surface-variant")}>
              <span className="material-symbols-outlined text-base">{EVENT_ICON[e.kind] ?? "circle"}</span>
              <span className="font-semibold w-16 shrink-0">{timeOf(e.at)}</span>
              <span>
                {EVENT[e.kind] ?? e.kind}
                {e.stopId && e.kind === "stop" ? ` ${stops.get(e.stopId) ?? ""}` : ""}
                {e.studentId ? `: ${students.get(e.studentId) ?? ""}` : ""}
                {e.note ? ` (${e.note})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
