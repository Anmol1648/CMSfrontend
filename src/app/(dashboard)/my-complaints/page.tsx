"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { ComplaintDetail, RaiseForm } from "@/components/complaints/ComplaintParts";
import { complaintsApi, STATUS, when } from "@/lib/api/complaints";

function Mine() {
  const q = useQuery({ queryKey: ["complaints", "mine"], queryFn: complaintsApi.mine });
  const [open, setOpen] = useState<string | null>(null);
  const [raising, setRaising] = useState(false);
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex justify-end">
        <Button onClick={() => setRaising(true)}>Raise a complaint</Button>
      </div>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.length ? (
        <FormAlert tone="info">You haven’t raised any complaint. If something isn’t right at school, tell us here.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/10">
            {q.data.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r.id)} className="w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-container-low">
                  <div className="flex-1 min-w-[12rem]">
                    <p className="font-bold text-sm">{r.subject}</p>
                    <p className="text-xs text-on-surface-variant/70">
                      {r.ticketNo} · {r.category}
                      {r.student ? ` · ${r.student}` : ""} · raised {when(r.createdAt)} · updated {when(r.updatedAt)}
                    </p>
                  </div>
                  {r.status === "resolved" && <Pill tone="warning">Please check: solved?</Pill>}
                  {r.rating && <Pill tone="success">{r.rating}★</Pill>}
                  <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {open && <ComplaintDetail id={open} onClose={() => setOpen(null)} />}
      {raising && <RaiseForm onClose={(id) => { setRaising(false); if (id) setOpen(id); }} />}
    </div>
  );
}

export default function MyComplaintsPage() {
  return (
    <RequirePermission permission="complaint.raise">
      <PageHeader title="My Complaints" description="Tell the school what isn’t right, follow the replies, and say whether it was solved." />
      <Mine />
    </RequirePermission>
  );
}
