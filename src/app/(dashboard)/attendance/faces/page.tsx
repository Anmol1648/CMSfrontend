"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { CameraCapture } from "@/components/attendance/CameraCapture";
import { AuthedPhoto } from "@/components/attendance/AuthedPhoto";
import { checkInApi, StaffFaceRow } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

function Faces() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["staff-faces"], queryFn: checkInApi.faces });
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState<StaffFaceRow | null>(null);
  const [big, setBig] = useState<string | null>(null);
  const set = (rows: StaffFaceRow[]) => queryClient.setQueryData(["staff-faces"], rows);

  const act = async (fn: () => Promise<StaffFaceRow[]>, done: string) => {
    try {
      set(await fn());
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (list.isError) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data) return <PageLoader />;
  const q = search.trim().toLowerCase();
  const rows = list.data.filter((r) => !q || `${r.name} ${r.employeeCode} ${r.designation ?? ""}`.toLowerCase().includes(q));
  const enrolled = list.data.filter((r) => r.face?.status === "approved").length;
  const waiting = list.data.filter((r) => r.face?.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Faces & phones"
        description="Each person’s face, to check the selfie at check-in (System Settings → Attendance → face check), and the phone they check in from (phone lock). Enrol a face with 3 photos here, or approve the photos a person took themselves."
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-6">
          {[
            ["Staff", list.data.length, "text-primary"],
            ["Enrolled", enrolled, "text-emerald-700"],
            ["Waiting approval", waiting, waiting ? "text-amber-700" : "text-primary"],
            ["Not enrolled", list.data.length - enrolled - waiting, "text-on-surface-variant"],
          ].map(([label, value, tone]) => (
            <div key={label as string}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
              <p className={`text-2xl font-black ${tone}`}>{value}</p>
            </div>
          ))}
          <div className="ml-auto w-64">
            <Input placeholder="Find a person" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
          </div>
        </div>
      </Card>
      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-outline-variant/10 first:border-t-0">
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    {(r.face?.photoIds ?? []).slice(0, 3).map((id) => (
                      <AuthedPhoto key={id} fileId={id} alt={r.name} className="h-12 w-12" onOpen={setBig} />
                    ))}
                    {!r.face && <div className="h-12 w-12 rounded-lg border-2 border-dashed border-outline-variant/40" />}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-[11px] text-on-surface-variant/70">
                    {r.employeeCode}
                    {r.designation ? ` · ${r.designation}` : ""}
                  </p>
                </td>
                <td className="px-5 py-3">
                  {r.face?.status === "approved" ? <Pill tone="success">Enrolled</Pill> : r.face?.status === "pending" ? <Pill tone="warning">Waiting approval</Pill> : <Pill>Not enrolled</Pill>}
                </td>
                <td className="px-5 py-3 text-xs">
                  {r.phone ? (
                    <span>
                      <span className="material-symbols-outlined text-base align-middle mr-1">smartphone</span>
                      {r.phone.label}
                      <button
                        type="button"
                        className="ml-3 font-bold uppercase tracking-widest text-primary hover:opacity-70"
                        onClick={async () => {
                          if (!(await confirm({ title: `Reset ${r.name}’s phone?`, message: "The next phone they check in from becomes theirs.", confirmLabel: "Reset" }))) return;
                          await act(() => checkInApi.resetPhone(r.id), "Phone reset");
                        }}
                      >
                        Reset
                      </button>
                    </span>
                  ) : (
                    <span className="text-on-surface-variant/60">No phone yet</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-4 text-xs font-bold uppercase tracking-widest">
                    {r.face?.status === "pending" && (
                      <button type="button" className="text-emerald-700 hover:opacity-70" onClick={() => act(() => checkInApi.approveFace(r.id), `${r.name}: face approved`)}>
                        Approve
                      </button>
                    )}
                    <button type="button" className="text-primary hover:opacity-70" onClick={() => setEnrolling(r)}>
                      {r.face ? "Take again" : "Enrol"}
                    </button>
                    {r.face && (
                      <button
                        type="button"
                        className="text-error hover:opacity-70"
                        onClick={async () => {
                          if (!(await confirm({ title: `Remove ${r.name}’s face?`, message: "Their check-ins will wait for approval until a face is enrolled again.", confirmLabel: "Remove", danger: true }))) return;
                          await act(() => checkInApi.removeFace(r.id), "Face removed");
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {enrolling && (
        <CameraCapture
          title={`Enrol ${enrolling.name}`}
          shots={3}
          hints={["Photo 1: looking straight at the camera", "Photo 2: head turned slightly left", "Photo 3: head turned slightly right"]}
          busyLabel="Reading the face…"
          onClose={() => setEnrolling(null)}
          onDone={async (photos) => {
            try {
              set(await checkInApi.enrol(enrolling.id, photos));
              showToast(`${enrolling.name}: face enrolled`, "success");
              setEnrolling(null);
            } catch (err) {
              throw new Error(errorMessage(err));
            }
          }}
        />
      )}
      {big && (
        <Modal isOpen onClose={() => setBig(null)} title="Photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="w-full rounded-xl" />
        </Modal>
      )}
    </>
  );
}

export default function StaffFacesPage() {
  return (
    <RequirePermission permission="attendance.staff">
      <Faces />
    </RequirePermission>
  );
}
