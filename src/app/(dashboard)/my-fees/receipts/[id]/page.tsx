"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { feesApi } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";

function MyReceipt() {
  const { id } = useParams<{ id: string }>();
  const receipt = useQuery({ queryKey: ["my-receipt", id], queryFn: () => feesApi.myReceipt(id) });
  if (receipt.isError) return <FormAlert>{errorMessage(receipt.error)}</FormAlert>;
  if (!receipt.data) return <PageLoader />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href="/my-fees" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
          My fees
        </Link>
      </div>
      <DocumentViewer inline docKey="fee_receipt" params={{ id: receipt.data.id }} title={`Receipt ${receipt.data.receiptNo}`} filename={`receipt-${receipt.data.receiptNo.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`} />
    </div>
  );
}

export default function MyReceiptPage() {
  return (
    <RequirePermission permission="fee.pay_online">
      <MyReceipt />
    </RequirePermission>
  );
}
