"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { CorrectionBox } from "@/components/attendance/CorrectionBox";
import { attendanceApi, browserId, browserLabel, checkInApi, currentPosition, MyDay, showDay, statusTone } from "@/lib/api/attendance";
import { CameraCapture } from "@/components/attendance/CameraCapture";
import { Pill } from "@/components/forms";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function CheckIn() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const clock = useClock();
  const me = useQuery({ queryKey: ["my-check-in"], queryFn: attendanceApi.myDay });
  const m = me.data;
  const [camera, setCamera] = useState<"in" | "out" | "enrol" | null>(null);
  const [locating, setLocating] = useState(false);

  /** Check in / out: the selfie (when the school wants one) and the location go with it. */
  const go = async (which: "in" | "out", photos: string[] = []) => {
    const [photo, photo2] = photos;
    const checks = m!.checks;
    let pos: Awaited<ReturnType<typeof currentPosition>> = null;
    if (checks.location) {
      setLocating(true);
      pos = await currentPosition();
      setLocating(false);
    }
    const input = {
      ...(photo ? { photo } : {}),
      ...(photo2 ? { photo2 } : {}),
      ...(pos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy } : {}),
      ...(checks.phoneLock ? { deviceId: browserId(), deviceLabel: browserLabel() } : {}),
    };
    const day: MyDay = which === "in" ? await attendanceApi.checkIn(input) : await attendanceApi.checkOut(input);
    queryClient.setQueryData(["my-check-in"], day);
    setCamera(null);
    if (day.day?.approval === "pending") showToast(`Saved, but it waits for the office’s approval: ${(day.day.reasons ?? []).join(", ")}`, "warning");
    else showToast(which === "in" ? "Checked in. Have a good day!" : "Checked out. See you tomorrow!", "success");
  };
  const press = async (which: "in" | "out") => {
    if (m!.checks.photo) return setCamera(which);
    try {
      await go(which);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const myFace = useQuery({ queryKey: ["my-face"], queryFn: checkInApi.myFace, enabled: !!m?.checks.face });
  // Liveness: which way to turn is chosen at random each time (a recorded clip can't know).
  const [turn] = useState(() => (Math.random() < 0.5 ? "left" : "right"));

  if (me.isError) return <FormAlert>{errorMessage(me.error)}</FormAlert>;
  if (!m) return <PageLoader />;
  const day = m.day;

  return (
    <>
      <PageHeader title="Check in" description={`${m.staff.name} · ${m.staff.employeeCode} · school day ${m.shift.start} – ${m.shift.end}`} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{showDay(m.today, { weekday: "long", day: "numeric", month: "long" })}</p>
            <p className="text-5xl font-black text-primary tabular-nums mt-1">{clock}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              <span>
                In: <b className="tabular-nums">{day?.checkIn ?? "—"}</b>
                {day?.late && <span className="ml-1 text-xs font-bold text-amber-700">late</span>}
              </span>
              <span>
                Out: <b className="tabular-nums">{day?.checkOut ?? "—"}</b>
                {day?.earlyOut && <span className="ml-1 text-xs font-bold text-orange-700">early</span>}
              </span>
              {day?.status && <span className={cn("rounded-full border px-3 py-0.5 text-xs font-bold", statusTone(day.status.code))}>{day.status.name}</span>}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 min-w-[220px]">
            {m.canCheckIn && (
              <Button className="!py-4 !text-lg" disabled={locating} onClick={() => press("in")}>
                <span className="material-symbols-outlined align-middle mr-2">login</span>
                Check in
              </Button>
            )}
            {m.canCheckOut && (
              <Button variant="secondary" className="!py-4 !text-lg" disabled={locating} onClick={() => press("out")}>
                <span className="material-symbols-outlined align-middle mr-2">logout</span>
                Check out
              </Button>
            )}
            {!m.canCheckIn && !m.canCheckOut && day?.checkOut && <p className="text-sm font-semibold text-emerald-700 text-right">Done for today ✓</p>}
          </div>
        </div>
        {m.reason && (
          <div className="mt-4">
            <FormAlert tone="info">{m.reason}</FormAlert>
          </div>
        )}
        {day?.approval === "pending" && (
          <div className="mt-4">
            <FormAlert tone="warning">Today’s check-in waits for the office’s approval: {(day.reasons ?? []).join(", ")}.</FormAlert>
          </div>
        )}
        {day?.approval === "rejected" && (
          <div className="mt-4">
            <FormAlert>The office did not approve today’s check-in. Speak to the office.</FormAlert>
          </div>
        )}
        {(m.checks.photo || m.checks.location || m.checks.phoneLock) && (
          <p className="mt-4 text-xs text-on-surface-variant">
            {m.checks.photo ? "A selfie is taken when you check in and out. " : ""}
            {m.checks.location ? "Your location is checked: allow it when the browser asks. " : ""}
            {m.checks.phoneLock ? "Check in from your own phone. " : ""}
            {locating ? "Finding your location…" : ""}
          </p>
        )}
      </Card>

      {m.checks.face && myFace.data && myFace.data.face?.status !== "approved" && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-primary">Your face</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                {myFace.data.face?.status === "pending"
                  ? "Your face photos are waiting for the office’s approval. Until then, check-ins wait for approval too."
                  : myFace.data.canEnrol
                    ? "The school checks your face at check-in. Enrol your face once (3 photos); the office approves it."
                    : "The school checks your face at check-in. Ask the office to enrol your face."}
              </p>
            </div>
            {myFace.data.canEnrol && (
              <Button variant="secondary" onClick={() => setCamera("enrol")}>
                <span className="material-symbols-outlined text-lg align-middle mr-1">face</span>
                {myFace.data.face ? "Take the photos again" : "Enrol your face"}
              </Button>
            )}
          </div>
        </Card>
      )}

      {(camera === "in" || camera === "out") && (
        <CameraCapture
          title={camera === "in" ? "Check in: take a selfie" : "Check out: take a selfie"}
          shots={m.checks.liveness ? 2 : 1}
          hints={m.checks.liveness ? ["Photo 1: look straight at the camera", `Photo 2: now turn your head slightly to the ${turn}`] : []}
          busyLabel={m.checks.face || m.checks.liveness ? "Checking your face…" : "Saving…"}
          onClose={() => setCamera(null)}
          onDone={async (photos) => {
            try {
              await go(camera, photos);
            } catch (err) {
              throw new Error(errorMessage(err));
            }
          }}
        />
      )}
      {camera === "enrol" && (
        <CameraCapture
          title="Enrol your face"
          shots={3}
          hints={["Photo 1: look straight at the camera", "Photo 2: turn your head slightly left", "Photo 3: turn your head slightly right"]}
          busyLabel="Reading your face…"
          onClose={() => setCamera(null)}
          onDone={async (photos) => {
            try {
              queryClient.setQueryData(["my-face"], await checkInApi.enrolSelf(photos));
              setCamera(null);
              showToast("Face photos sent: the office will approve them", "success");
            } catch (err) {
              throw new Error(errorMessage(err));
            }
          }}
        />
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/20">
          <h3 className="font-black text-primary">This month</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">If a day is wrong (you forgot to check in, or were on duty elsewhere), ask the office to correct it.</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {m.month.map((x) => (
              <tr key={x.date} className={cn("border-t border-outline-variant/10 first:border-t-0", x.off && "text-on-surface-variant/60")}>
                <td className="px-5 py-2 whitespace-nowrap">{showDay(x.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="px-5 py-2 tabular-nums">{x.checkIn ?? "—"}</td>
                <td className="px-5 py-2 tabular-nums">{x.checkOut ?? "—"}</td>
                <td className="px-5 py-2">
                  {x.off ? (
                    <span className="text-xs">{x.off}</span>
                  ) : x.status ? (
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", statusTone(x.status.code))}>{x.status.name}</span>
                  ) : x.date === m.today ? (
                    <span className="text-xs">Not checked in yet</span>
                  ) : (
                    <span className="text-xs font-bold text-error">Absent</span>
                  )}
                  {x.source === "admin" && <span className="ml-2 text-[10px] text-on-surface-variant/60">corrected by the office</span>}
                  {x.approval === "pending" && (
                    <span className="ml-2">
                      <Pill tone="warning">Waiting approval</Pill>
                    </span>
                  )}
                  {x.approval === "rejected" && (
                    <span className="ml-2">
                      <Pill tone="danger">Not approved</Pill>
                    </span>
                  )}
                </td>
                <td className="px-5 py-2 text-xs text-on-surface-variant">{x.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <CorrectionBox />
    </>
  );
}

export default function MyCheckInPage() {
  return (
    <RequirePermission permission="attendance.checkin">
      <CheckIn />
    </RequirePermission>
  );
}
