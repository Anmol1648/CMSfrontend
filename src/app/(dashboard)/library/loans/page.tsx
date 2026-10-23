"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
import { libraryApi, LoanRow, rupees, showDate } from "@/lib/api/library";

const SHOW = [
  { value: "out", label: "Out now" },
  { value: "overdue", label: "Overdue" },
  { value: "due_today", label: "Due today" },
  { value: "returned", label: "Returned" },
  { value: "lost", label: "Lost" },
  { value: "all", label: "All" },
];

function Loans() {
  const params = useSearchParams();
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [show, setShow] = useState(params.get("show") ?? "out");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["library", "loans", show, search, from, to, page], queryFn: () => libraryApi.loans({ show, search: search.trim() || undefined, from: from || undefined, to: to || undefined, page }), placeholderData: keepPreviousData });
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      showToast(done, "success");
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const lost = async (l: LoanRow) => {
    if (await confirm({ title: `Mark “${l.title}” lost?`, message: `${l.member} is charged for it (System Settings → Library), plus any late fine.`, confirmLabel: "Mark lost", danger: true })) await act(() => libraryApi.lost(l.id), "Marked lost and charged");
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Show" value={show} onChange={(s) => { setShow(s); setPage(1); }} options={SHOW} />
          <Input label="Find" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Member, book or accession no" icon="search" />
          <Input label="Issued from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input label="Issued to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.rows.length ? (
        <FormAlert tone="info">Nothing here.</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3">Book</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Returned</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((l) => (
                  <tr key={l.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                    <td className="px-4 py-2.5">
                      <p className="font-bold">{l.title}</p>
                      <p className="text-xs text-on-surface-variant/70">{l.accessionNo}</p>
                    </td>
                    <td className="px-4 py-2.5">{l.member}</td>
                    <td className="px-4 py-2.5 text-xs">{showDate(l.issuedOn)}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {showDate(l.dueOn)} {l.overdue && <Pill tone="danger">Overdue{l.fineSoFar ? ` · ${rupees(l.fineSoFar)}` : ""}</Pill>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{l.status === "lost" ? <Pill tone="danger">Lost</Pill> : showDate(l.returnedOn) || "—"}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {l.status === "out" && can("library.issue") && (
                        <>
                          <Button variant="tertiary" onClick={() => act(() => libraryApi.returnBook({ accessionNo: l.accessionNo }), `${l.title} returned`)}>
                            Return
                          </Button>
                          <Button variant="tertiary" onClick={() => act(() => libraryApi.renew(l.id), "Renewed")}>
                            Renew
                          </Button>
                        </>
                      )}
                      {l.status === "out" && can("library.fines") && (
                        <Button variant="tertiary" onClick={() => lost(l)}>
                          Lost
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-on-surface-variant/60">{q.data.total} loans</p>
            {q.data.total > q.data.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function LibraryLoansPage() {
  return (
    <RequirePermission permission={["library.view", "library.issue"]}>
      <PageHeader title="Books Out" description="Who has which book, what is overdue (with the fine so far), and what came back." />
      <Suspense fallback={<PageLoader />}>
        <Loans />
      </Suspense>
    </RequirePermission>
  );
}
