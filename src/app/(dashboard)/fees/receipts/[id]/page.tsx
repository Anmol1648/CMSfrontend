"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import { FormAlert } from "@/components/forms";
import { useToast } from "@/components/ui/ToastProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { feesApi } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";

function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const receipt = useQuery({ queryKey: ["fee-receipt", id], queryFn: () => feesApi.receipt(id) });
  const config = useQuery({ queryKey: ["fee-config"], queryFn: feesApi.config });
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (receipt.isError) return <FormAlert>{errorMessage(receipt.error)}</FormAlert>;
  if (!receipt.data) return <PageLoader />;
  const r = receipt.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-4">
          <Link href="/fees/receipts" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All receipts
          </Link>
          {can("fee.collect") && (
            <Link href={`/fees/collect?student=${r.student.id}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Student&apos;s fees
            </Link>
          )}
        </div>
        <div className="flex gap-3">
          {can("fee.cancel") && r.status === "active" && !r.online && (
            <Button variant="secondary" onClick={() => setCancelling(true)}>
              Cancel receipt
            </Button>
          )}
        </div>
      </div>
      <DocumentViewer key={r.status} inline docKey="fee_receipt" params={{ id: r.id }} title={`Receipt ${r.receiptNo}`} filename={`receipt-${r.receiptNo.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`} />
      {cancelling && (
        <Modal isOpen onClose={() => setCancelling(false)} title={`Cancel ${r.receiptNo}?`}>
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">The money comes back on the student&apos;s dues. The receipt stays in the records, marked cancelled. Make a new receipt if the payment was right but the details were wrong.</p>
            <TextArea label="Why *" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCancelling(false)}>
                Keep it
              </Button>
              <Button
                disabled={busy || reason.trim().length < 3}
                onClick={async () => {
                  setBusy(true);
                  try {
                    queryClient.setQueryData(["fee-receipt", id], await feesApi.cancelReceipt(r.id, reason.trim()));
                    queryClient.invalidateQueries({ queryKey: ["fee-receipts"] });
                    queryClient.invalidateQueries({ queryKey: ["student-fees", r.student.id] });
                    setCancelling(false);
                    showToast("Receipt cancelled", "success");
                  } catch (err) {
                    showToast(errorMessage(err), "error");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Cancelling…" : "Cancel receipt"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ReceiptDetailPage() {
  return (
    <RequirePermission permission="fee.view">
      <ReceiptPage />
    </RequirePermission>
  );
}
