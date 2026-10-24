"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { assetsApi, day, ISSUE } from "@/lib/api/assets";
import { ReportProblem } from "@/components/assets/AssetParts";

function Mine() {
  const q = useQuery({ queryKey: ["assets", "mine"], queryFn: assetsApi.mine });
  const [report, setReport] = useState<{ id: string; code: string; name: string } | null | undefined>(undefined);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex justify-end">
        <Button onClick={() => setReport(null)}>
          <span className="material-symbols-outlined text-lg">report</span> Report a problem with any asset
        </Button>
      </div>
      <Card>
        <p className="font-extrabold mb-3">Given to me</p>
        <ul className="divide-y divide-outline-variant/20">
          {d.assets.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="material-symbols-outlined text-primary">devices</span>
              <span className="flex-1 min-w-0 text-sm">
                <b>{a.name}</b> <span className="text-on-surface-variant">· {a.code}{a.serialNo ? ` · S/N ${a.serialNo}` : ""}{a.quantity > 1 ? ` · ${a.quantity} items` : ""}</span>
              </span>
              {a.condition && <Pill>{a.condition}</Pill>}
              <Button variant="tertiary" onClick={() => setReport(a)}>
                Report a problem
              </Button>
            </li>
          ))}
          {!d.assets.length && <li className="py-2 text-sm text-on-surface-variant">Nothing is given to you.</li>}
        </ul>
      </Card>
      <Card>
        <p className="font-extrabold mb-3">Problems I reported</p>
        <ul className="divide-y divide-outline-variant/20">
          {d.reported.map((r) => (
            <li key={r.id} className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="flex-1">
                  <b>{r.title}</b> <span className="text-on-surface-variant">· {r.asset}</span>
                </span>
                <Pill tone={ISSUE[r.status].tone}>{ISSUE[r.status].label}</Pill>
              </div>
              <p className="text-xs text-on-surface-variant">
                {day(r.createdAt)}
                {r.resolution ? ` · ${r.resolution}` : ""}
              </p>
            </li>
          ))}
          {!d.reported.length && <li className="py-2 text-sm text-on-surface-variant">You have not reported anything.</li>}
        </ul>
      </Card>
      {report !== undefined && <ReportProblem asset={report} onClose={() => setReport(undefined)} onDone={() => q.refetch()} />}
    </div>
  );
}

export default function MyAssetsPage() {
  return (
    <RequirePermission permission={["asset.mine", "asset.report"]}>
      <PageHeader title="My Assets" description="The school’s things given to you (laptop, tablet…), and problems you reported: a broken projector, a fan, a desk." />
      <Mine />
    </RequirePermission>
  );
}
