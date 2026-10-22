"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { checkInApi, mapLink, PendingCheckIn, showDay } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "./AuthedPhoto";

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
/** 0.3 ≈ clearly the same person, 0.6+ ≈ someone else. */
const match = (d: number) => (d <= 0.4 ? "Strong match" : d <= 0.5 ? "Match" : d <= 0.6 ? "Weak match" : "Doesn’t match");

/** Check-ins that wait for the office (outside the school, face not matching…): approve or reject. */
export function PendingCheckIns() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const list = useQuery({ queryKey: ["pending-check-ins"], queryFn: checkInApi.pending });
  const [big, setBig] = useState<string | null>(null);

  const decide = async (r: PendingCheckIn, approve: boolean) => {
    try {
      queryClient.setQueryData(["pending-check-ins"], await checkInApi.decide(r.id, approve));
      queryClient.invalidateQueries({ queryKey: ["staff-day"] });
      showToast(approve ? `${r.staff.name}: check-in approved` : `${r.staff.name}: rejected (marked absent)`, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (!list.data?.length) return null;
  return (
    <Card padding="none" className="overflow-hidden mb-4 ring-2 ring-amber-300">
      <div className="px-5 py-3 border-b border-outline-variant/20">
        <h3 className="font-black text-primary">Check-ins waiting for approval · {list.data.length}</h3>
        <p className="text-xs text-on-surface-variant mt-0.5">Outside the school, location not shared, or the face didn’t match. They count as worked only once approved.</p>
      </div>
      <ul className="divide-y divide-outline-variant/10">
        {list.data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
            <div className="flex gap-2">
              <div className="text-center">
                <AuthedPhoto fileId={r.photoIn} alt={`${r.staff.name} at check-in`} className="h-20 w-20" onOpen={setBig} />
                <p className="text-[10px] text-on-surface-variant mt-1">Selfie</p>
              </div>
              <div className="text-center">
                <AuthedPhoto fileId={r.staff.facePhotoId} alt={`${r.staff.name}, enrolled`} className="h-20 w-20" onOpen={setBig} />
                <p className="text-[10px] text-on-surface-variant mt-1">Enrolled face</p>
              </div>
            </div>
            <div className="flex-1 min-w-[220px]">
              <p className="font-semibold">
                {r.staff.name} <span className="text-xs font-mono text-on-surface-variant/70">{r.staff.employeeCode}</span>
              </p>
              <p className="text-xs text-on-surface-variant">
                {showDay(r.date, { weekday: "short", day: "numeric", month: "short" })} · in {r.checkIn ?? "—"}
                {r.late ? " (late)" : ""}
                {r.checkOut ? ` · out ${r.checkOut}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {r.reasons.map((x) => (
                  <span key={x} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    {x}
                  </span>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                {r.distance !== null ? `${km(r.distance)} from school` : "No location"}
                {r.accuracy !== null ? ` (±${r.accuracy} m)` : ""}
                {r.location && (
                  <a href={mapLink(r.location.lat, r.location.lng)} target="_blank" rel="noopener noreferrer" className="ml-2 font-bold text-primary underline">
                    See on map
                  </a>
                )}
                {r.faceDistance !== null && ` · Face: ${match(r.faceDistance)} (${r.faceDistance})`}
              </p>
            </div>
            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest self-center">
              <button type="button" className="text-emerald-700 hover:opacity-70" onClick={() => decide(r, true)}>
                Approve
              </button>
              <button type="button" className="text-error hover:opacity-70" onClick={() => decide(r, false)}>
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
      {big && (
        <Modal isOpen onClose={() => setBig(null)} title="Photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="w-full rounded-xl" />
        </Modal>
      )}
    </Card>
  );
}
