"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Qr } from "@/components/library/Qr";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { clock, visitorsApi } from "@/lib/api/visitors";

function Pass() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["visitors", "pass", id], queryFn: () => visitorsApi.pass(id) });
  // Opens the print dialog once the pass is ready (the gate prints at once).
  useEffect(() => {
    if (q.data) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [q.data]);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const { visit: v, school, size } = q.data!;
  const thermal = size === "thermal";
  return (
    <div className="space-y-4">
      <style>{`@media print { @page { size: ${thermal ? "80mm auto" : "A6"}; margin: 4mm; } body * { visibility: hidden; } #pass, #pass * { visibility: visible; } #pass { position: absolute; left: 0; top: 0; box-shadow: none !important; border: none !important; } }`}</style>
      <div className="flex gap-2 print:hidden">
        <Button onClick={() => window.print()}>Print again</Button>
      </div>
      <div id="pass" className="bg-white text-[#1a202c] border border-outline-variant/50 rounded-xl p-4 shadow-sm" style={{ width: thermal ? "72mm" : "100mm" }}>
        <div className="text-center border-b border-dashed border-[#999] pb-2">
          <p className="text-sm font-extrabold uppercase tracking-wide">{school.name}</p>
          <p className="text-xs font-bold tracking-widest">VISITOR PASS</p>
        </div>
        <div className="flex gap-3 py-3">
          <AuthedPhoto path={v.photoFileId ? visitorsApi.visitPhoto(v.id) : null} className="h-24 w-20 rounded object-cover border border-[#ccc]" />
          <div className="text-xs space-y-0.5 min-w-0">
            <p className="text-base font-extrabold leading-tight">{v.visitor.name}</p>
            {v.visitor.mobile && <p>{v.visitor.mobile}</p>}
            <p>
              <b>To meet:</b> {v.host}
            </p>
            {v.purpose && (
              <p>
                <b>For:</b> {v.purpose}
              </p>
            )}
            {v.people > 1 && (
              <p>
                <b>People:</b> {v.people}
              </p>
            )}
            {v.vehicleNo && (
              <p>
                <b>Vehicle:</b> {v.vehicleNo}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-dashed border-[#999] pt-2">
          <div className="text-xs">
            <p className="font-extrabold text-sm">{v.passNo}</p>
            <p>
              In: {new Date(v.inAt ?? Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, {clock(v.inAt)}
            </p>
            <p className="text-[10px] mt-1">Valid today only. Return the pass at the gate.</p>
          </div>
          {v.passNo && <Qr text={v.passNo} size={72} />}
        </div>
      </div>
    </div>
  );
}

export default function PassPage() {
  return (
    <RequirePermission permission="visitor.gate">
      <Pass />
    </RequirePermission>
  );
}
