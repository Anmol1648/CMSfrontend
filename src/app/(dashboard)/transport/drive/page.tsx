"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { KIND_LABEL, timeOf, TripKind, TripView, transportApi } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

type Fix = { lat: number; lng: number; speed: number | null; accuracy: number | null };

/** Sends the phone's position every few seconds while the trip runs (and keeps the screen on). */
function useSendPosition(tripId: string, seconds: number, enabled: boolean) {
  const last = useRef<Fix | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string; sentAt: number | null }>({ ok: false, text: "Finding your position…", sentAt: null });
  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setStatus({ ok: false, text: "This phone can’t share its position.", sentAt: null });
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        last.current = { lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed !== null ? Math.round(p.coords.speed * 3.6) : null, accuracy: Math.round(p.coords.accuracy) };
      },
      (e) => setStatus({ ok: false, text: e.code === e.PERMISSION_DENIED ? "Location is blocked: allow it for this site in the browser, then reload." : "Can’t find the position (turn on GPS / location).", sentAt: null }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    const send = async () => {
      const fix = last.current;
      if (!fix) return;
      try {
        await transportApi.ping(tripId, fix);
        setStatus({ ok: true, text: `Sharing the bus’s position (±${fix.accuracy ?? "?"} m)`, sentAt: Date.now() });
      } catch (err) {
        setStatus({ ok: false, text: `Couldn’t send the position: ${errorMessage(err)}`, sentAt: null });
      }
    };
    const timer = setInterval(send, Math.max(5, seconds) * 1000);
    const first = setTimeout(send, 2000);
    // Keep the screen on, where the browser allows it.
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => undefined);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      clearTimeout(first);
      void lock?.release().catch(() => undefined);
    };
  }, [tripId, seconds, enabled]);
  return status;
}

function Sos({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const send = async () => {
    try {
      await transportApi.sos(tripId, note.trim());
      showToast("SOS sent to the school with the bus’s position", "success");
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Send SOS">
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">The school’s transport in-charge gets it at once, with where the bus is.</p>
        <TextArea label="What happened (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tyre puncture near Ravigram" />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <button type="button" onClick={send} className="rounded-xl bg-error px-6 py-3 text-sm font-extrabold text-white">
            Send SOS
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Running({ tripId, seconds }: { tripId: string; seconds: number }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["transport", "trip", tripId], queryFn: () => transportApi.trip(tripId, true), refetchInterval: 15_000 });
  // A bus with its own GPS device: the phone doesn't send the position.
  const device = q.data?.source === "device";
  const sent = useSendPosition(tripId, seconds, !!q.data && !device);
  const gps = device ? { ok: true, text: "The bus’s GPS device sends its position: no need to keep this screen open", sentAt: null } : sent;
  const [sos, setSos] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const t = q.data;
  if (!t) return <PageLoader />;
  const shown = open ?? t.stops[Math.min(t.nextStop, t.stops.length - 1)]?.id ?? null;
  const mark = async (studentId: string, kind: "boarded" | "dropped" | "absent") => {
    try {
      const v = await transportApi.board(tripId, studentId, kind);
      queryClient.setQueryData<TripView>(["transport", "trip", tripId], v);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const end = async () => {
    if (!(await confirm({ title: "End the trip?", message: t.kind === "morning" ? "Parents are told the bus reached school." : "Use this when the last student is dropped.", confirmLabel: "End trip" }))) return;
    try {
      await transportApi.endTrip(tripId);
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Trip ended", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  // Morning: students get on at their stop and off at school; afternoon the other way.
  const onLabel = t.kind === "afternoon" ? "Got off" : "Got on";
  const onKind = t.kind === "afternoon" ? "dropped" : "boarded";
  return (
    <div className="space-y-4 max-w-2xl">
      <div className={cn("rounded-2xl px-4 py-3 flex items-center gap-3", gps.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900")}>
        <span className="material-symbols-outlined">{gps.ok ? "my_location" : "location_searching"}</span>
        <p className="text-sm font-bold">{gps.text}</p>
      </div>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold text-on-surface">{t.route}</p>
            <p className="text-xs text-on-surface-variant/70">
              {KIND_LABEL[t.kind]} · {t.vehicle} · started {timeOf(t.startedAt)}
            </p>
            {t.delayMin >= 5 && (
              <div className="mt-2">
                <Pill tone="warning">{t.delayMin} min late</Pill>
              </div>
            )}
          </div>
          <button type="button" onClick={() => setSos(true)} className="rounded-2xl bg-error px-5 py-3 text-white font-extrabold flex items-center gap-2 shadow">
            <span className="material-symbols-outlined">emergency</span> SOS
          </button>
        </div>
      </Card>
      <div className="space-y-2">
        {t.stops.map((s, i) => (
          <Card key={s.id} padding="sm" className={cn(i === t.nextStop && "ring-2 ring-primary/40")}>
            <button type="button" onClick={() => setOpen(shown === s.id ? "" : s.id)} className="w-full flex items-center gap-3 text-left px-2 py-1">
              <span className={cn("material-symbols-outlined", s.passed ? "text-green-700" : i === t.nextStop ? "text-primary" : "text-on-surface-variant/40")}>{s.passed ? "check_circle" : i === t.nextStop ? "radio_button_checked" : "radio_button_unchecked"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface">{s.name}</p>
                <p className="text-xs text-on-surface-variant/70">
                  Due {s.time ?? "—"} · {s.students.filter((x) => x.mark).length}/{s.students.length} marked
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/50">{shown === s.id ? "expand_less" : "expand_more"}</span>
            </button>
            {shown === s.id && (
              <ul className="mt-2 space-y-2 px-2 pb-1">
                {!s.students.length && <li className="text-xs text-on-surface-variant/70">No students at this stop on this trip.</li>}
                {s.students.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
                    <span className="flex-1 min-w-[8rem] text-sm font-semibold">{x.name}</span>
                    {x.mark && <Pill tone={x.mark === "absent" ? "danger" : "success"}>{x.mark === "boarded" ? "On the bus" : x.mark === "dropped" ? "Got off" : "Not there"}</Pill>}
                    <button type="button" onClick={() => mark(x.id, onKind)} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white">
                      {onLabel}
                    </button>
                    {t.kind === "morning" && x.mark === "boarded" && (
                      <button type="button" onClick={() => mark(x.id, "dropped")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
                        Got off at school
                      </button>
                    )}
                    <button type="button" onClick={() => mark(x.id, "absent")} className="rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                      Not there
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
      <Button onClick={end} className="w-full">
        End trip
      </Button>
      <p className="text-xs text-on-surface-variant/70">Keep this screen open while driving: the phone sends the bus’s position every {seconds} seconds. Parents see the bus on My Bus and get told when it’s near.</p>
      {sos && <Sos tripId={tripId} onClose={() => setSos(false)} />}
    </div>
  );
}

function Drive() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["transport", "drive"], queryFn: transportApi.driving });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (d.running) return <Running tripId={d.running} seconds={d.pingSeconds} />;
  const start = async (routeId: string, kind: TripKind) => {
    try {
      await transportApi.start(routeId, kind);
      queryClient.invalidateQueries({ queryKey: ["transport", "drive"] });
      showToast("Trip started: parents are told", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  if (!d.routes.length) return <FormAlert tone="info">You aren’t the driver or helper of any route. The office sets this in Transport → Routes & Stops.</FormAlert>;
  return (
    <div className="space-y-4 max-w-2xl">
      <FormAlert tone="info">Start the trip when the bus leaves. Your phone will ask to share its location: allow it.</FormAlert>
      {d.routes.map((r) => {
        const done = (k: TripKind) => r.trips.some((t) => t.kind === k && t.status === "done");
        return (
          <Card key={r.id}>
            <p className="font-extrabold text-on-surface">{r.name}</p>
            <p className="text-xs text-on-surface-variant/70">
              Morning from {r.morningStart} · afternoon from {r.afternoonStart}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button onClick={() => start(r.id, "morning")} variant={done("morning") ? "secondary" : "primary"}>
                {done("morning") ? "Morning done · again" : "Start morning trip"}
              </Button>
              <Button onClick={() => start(r.id, "afternoon")} variant={done("afternoon") ? "secondary" : "primary"}>
                {done("afternoon") ? "Afternoon done · again" : "Start afternoon trip"}
              </Button>
              <Button variant="secondary" onClick={() => start(r.id, "special")}>
                Special trip
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function DrivePage() {
  return (
    <RequirePermission permission="transport.drive">
      <PageHeader title="My Trip" description="Start the trip, mark students on and off, and send SOS if something goes wrong." />
      <Drive />
    </RequirePermission>
  );
}
