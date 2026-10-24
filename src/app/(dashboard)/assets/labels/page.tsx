"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { assetsApi } from "@/lib/api/assets";
import { Qr } from "@/components/library/Qr";

function Labels() {
  const params = useSearchParams();
  const ids = params.get("ids") ?? undefined;
  const room = params.get("room") ?? undefined;
  const q = useQuery({ queryKey: ["assets", "labels", ids, room], queryFn: () => assetsApi.labels({ ids, room }), enabled: !!ids || !!room });
  if (!ids && !room) return <FormAlert tone="info">Tick assets in the Asset Register (or choose a room there) and click “Labels”.</FormAlert>;
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.labels.length) return <FormAlert tone="info">No assets there.</FormAlert>;
  return (
    <div className="space-y-4">
      <style>{`@media print { body * { visibility: hidden; } #labels, #labels * { visibility: visible; } #labels { position: absolute; left: 0; top: 0; width: 100%; } .label { border-color: #999; } }`}</style>
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">{d.labels.length} labels · print on A4 (4 across) or sticker paper, and stick on each asset. Scanning the QR opens the asset (and ticks it during verification).</p>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
      <div id="labels" className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2">
        {d.labels.map((l) => (
          <div key={l.id} className="label border border-dashed border-outline-variant/60 rounded-md p-2 flex items-center gap-2 break-inside-avoid">
            <Qr text={l.code} size={64} />
            <div className="min-w-0 text-left">
              <p className="text-[8px] font-bold uppercase tracking-wider truncate">{d.school}</p>
              <p className="text-xs font-black font-mono">{l.code}</p>
              <p className="text-[10px] font-semibold truncate">{l.name}</p>
              <p className="text-[9px] truncate">
                {l.room ?? ""}
                {l.quantity > 1 ? ` · ${l.quantity} items` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssetLabelsPage() {
  return (
    <RequirePermission permission={["asset.manage", "asset.view"]}>
      <PageHeader title="Asset labels" description="QR labels with each asset’s code." />
      <Suspense fallback={<PageLoader />}>
        <Labels />
      </Suspense>
    </RequirePermission>
  );
}
