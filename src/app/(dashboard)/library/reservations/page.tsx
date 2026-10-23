"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { libraryApi, ReservationRow, showDate } from "@/lib/api/library";

const STATE: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "primary" }> = { ready: { label: "Ready", tone: "success" }, waiting: { label: "Waiting", tone: "warning" }, issued: { label: "Issued", tone: "primary" }, cancelled: { label: "Cancelled", tone: "neutral" }, expired: { label: "Not collected", tone: "neutral" } };

function Reservations() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [show, setShow] = useState("ready");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["library", "reservations", show, page], queryFn: () => libraryApi.reservations({ show, page }), placeholderData: keepPreviousData });
  const cancel = async (r: ReservationRow) => {
    if (!(await confirm({ title: `Cancel ${r.member}’s reservation?`, message: r.status === "ready" ? "The kept copy goes to the next member waiting, or back on the shelf." : undefined, confirmLabel: "Cancel it", danger: true }))) return;
    try {
      await libraryApi.cancelReservation(r.id);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      showToast("Cancelled", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Show" value={show} onChange={(s) => { setShow(s); setPage(1); }} options={[{ value: "ready", label: "Ready: kept at the counter" }, { value: "waiting", label: "Waiting for a copy" }, { value: "all", label: "All" }]} />
        </div>
        <p className="mt-3 text-xs text-on-surface-variant/70">A returned book goes to the first member waiting and is kept for them for the days in System Settings → Library; they are told. Reserve for a member from the counter or a book’s page; members reserve on My Library.</p>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.rows.length ? (
        <FormAlert tone="info">No reservations here.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/10">
            {q.data.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-[12rem]">
                  <p className="font-bold">{r.title}</p>
                  <p className="text-xs text-on-surface-variant/70">
                    {r.member} · reserved {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {r.accessionNo ? ` · copy ${r.accessionNo}` : ""}
                    {r.holdUntil ? ` · kept till ${showDate(r.holdUntil)}` : ""}
                  </p>
                </div>
                <Pill tone={STATE[r.status]?.tone ?? "neutral"}>{STATE[r.status]?.label ?? r.status}</Pill>
                {can("library.issue") && ["waiting", "ready"].includes(r.status) && (
                  <Button variant="tertiary" onClick={() => cancel(r)}>
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {q.data.total > q.data.pageSize && (
            <div className="px-4 py-3">
              <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function LibraryReservationsPage() {
  return (
    <RequirePermission permission={["library.view", "library.issue"]}>
      <PageHeader title="Reservations" description="Books members are waiting for, and copies kept at the counter for them." />
      <Reservations />
    </RequirePermission>
  );
}
