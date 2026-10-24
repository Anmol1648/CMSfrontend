"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { PrintPortal } from "@/components/print/PrintPortal";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { Qr } from "@/components/library/Qr";
import { errorMessage } from "@/lib/api/client";
import { hostelApi, when, type PassSlip } from "@/lib/api/hostel";

/** The printed leave pass: the gate scans its QR (or types the code) going out and coming back. */
function Slip({ p }: { p: PassSlip }) {
  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ padding: "3px 8px 3px 0", color: "#555", whiteSpace: "nowrap", verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: "3px 0", fontWeight: 600 }}>{value}</td>
    </tr>
  );
  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", border: "2px solid #1A365D", borderRadius: 12, padding: 16, fontFamily: "Inter, Arial, sans-serif", fontSize: 13, color: "#111", background: "#fff" }}>
      <div style={{ textAlign: "center", borderBottom: "1px solid #ccc", paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{p.school?.legalName}</div>
        <div style={{ fontSize: 11 }}>{[p.school?.addressLine1, p.school?.city].filter(Boolean).join(", ")}</div>
        <div style={{ marginTop: 6, fontWeight: 800, letterSpacing: 2, fontSize: 14 }}>HOSTEL LEAVE PASS</div>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <AuthedPhoto path={p.photo} className="h-24 w-20 rounded-lg object-cover" />
        <table style={{ flex: 1, borderCollapse: "collapse" }}>
          <tbody>
            {row("Name", p.student)}
            {row("Adm. no.", p.admissionNo)}
            {row("Class", p.section)}
            {row("Hostel", `${p.hostel}${p.room ? `, room ${p.room}${p.bed ? ` / bed ${p.bed}` : ""}` : ""}`)}
          </tbody>
        </table>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <tbody>
          {row("Leaves", when(p.fromAt))}
          {row("Back by", when(p.toAt))}
          {row("Reason", p.reason)}
          {p.escort && row("With", p.escort)}
          {p.destination && row("Going to", p.destination)}
          {row("Approved by", p.answeredBy || p.warden || "—")}
        </tbody>
      </table>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 12 }}>
        <div style={{ textAlign: "center" }}>
          <Qr text={p.passCode} size={110} />
          <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 18, letterSpacing: 3, marginTop: 4 }}>{p.passCode}</div>
        </div>
        <div style={{ flex: 1, fontSize: 11, color: "#444" }}>
          Show this pass at the hostel gate when leaving and when coming back.
          {p.hostelPhone && <div style={{ marginTop: 4 }}>Hostel phone: {p.hostelPhone}</div>}
          <div style={{ marginTop: 28, borderTop: "1px solid #888", paddingTop: 2, textAlign: "center" }}>Warden’s signature</div>
        </div>
      </div>
    </div>
  );
}

export function PrintPass({ leaveId, label = "Print pass" }: { leaveId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["hostel", "pass", leaveId], queryFn: () => hostelApi.pass(leaveId), enabled: open });
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title="Leave pass" width="max-w-xl">
          {q.isLoading ? (
            <PageLoader />
          ) : q.error ? (
            <FormAlert>{errorMessage(q.error)}</FormAlert>
          ) : (
            <div className="space-y-4">
              <Slip p={q.data!} />
              <PrintPortal page="@page { size: A5; margin: 10mm; }">
                <Slip p={q.data!} />
              </PrintPortal>
              <div className="flex justify-end gap-2">
                <Button variant="tertiary" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => window.print()}>Print</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
