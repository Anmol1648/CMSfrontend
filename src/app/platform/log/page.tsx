"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert } from "@/components/forms";
import { Pagination } from "@/components/ui/Pagination";
import { PageLoader } from "@/components/ui/PageLoader";
import { errorMessage } from "@/lib/api/client";
import { platformApi, when } from "@/lib/api/platform";

export default function LogPage() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["platform", "log", "all", page], queryFn: () => platformApi.log(page) });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Platform log</h1>
        <p className="text-sm text-on-surface-variant">Everything done in the console, and sign-ins to it.</p>
      </div>
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="px-5 py-2">When</th>
              <th className="px-2 py-2">Who</th>
              <th className="px-2 py-2">What</th>
              <th className="px-2 py-2">School</th>
              <th className="px-5 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {q.data!.rows.map((r) => (
              <tr key={r.id} className="border-t border-outline-variant/15 align-top">
                <td className="px-5 py-2 whitespace-nowrap text-on-surface-variant">{when(r.createdAt)}</td>
                <td className="px-2 py-2">{r.by}</td>
                <td className="px-2 py-2 font-semibold">{r.action.replace(/_/g, " ")}</td>
                <td className="px-2 py-2">{r.tenantId ? <Link href={`/platform/schools/${r.tenantId}`} className="text-primary">{r.schoolName ?? "—"}</Link> : "—"}</td>
                <td className="px-5 py-2 font-mono text-xs text-on-surface-variant break-all">{Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {q.data!.total > 50 && <Pagination currentPage={page} totalPage={Math.ceil(q.data!.total / 50)} onPageChange={setPage} />}
    </div>
  );
}
