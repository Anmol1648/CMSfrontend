"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { ReceiptView } from "@/components/fees/ReceiptView";
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
        <Button onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
      <div className="print-area flex justify-center">
        <ReceiptView receipt={receipt.data} />
      </div>
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
