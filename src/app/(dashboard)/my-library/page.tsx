"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { BookCover } from "@/components/library/BookCover";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { KIND_LABEL, libraryApi, MyLibrary, rupees, showDate } from "@/lib/api/library";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const FINE: Record<string, string> = { late: "Late return", lost: "Lost book", damaged: "Damaged book" };
type M = MyLibrary["members"][number];

/** Search the catalogue; reserve a book that is out. */
function Catalogue({ m, canReserve }: { m: M; canReserve: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["library", "catalogue", search, page], queryFn: () => libraryApi.books({ search: search.trim() || undefined, show: search.trim() ? "all" : "new", page, pageSize: 10 }), placeholderData: keepPreviousData });
  const reserve = async (bookId: string) => {
    try {
      const r = await libraryApi.reserveMine({ bookId, memberKind: m.member.kind, memberId: m.member.id });
      showToast(r.ready ? "Reserved: a copy is kept for you at the library" : `Reserved: you are number ${r.place} in the queue`, "success");
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const have = new Set([...m.loans.map((l) => l.bookId), ...m.reservations.map((r) => r.bookId)]);
  return (
    <Card>
      <p className={label}>Find a book</p>
      <div className="mt-2">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Title, author or topic" icon="search" />
      </div>
      {!search.trim() && <p className="mt-3 text-xs text-on-surface-variant/70">New in the library:</p>}
      {q.isLoading ? (
        <PageLoader />
      ) : (
        <ul className="mt-2 divide-y divide-outline-variant/10">
          {q.data?.rows.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3">
              <BookCover book={b} className="h-14 w-10" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.title}</p>
                <p className="text-xs text-on-surface-variant/70 truncate">{[b.authors, KIND_LABEL[b.kind], b.location].filter(Boolean).join(" · ")}</p>
              </div>
              {b.kind === "ebook" ? (
                b.link ? (
                  <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary">
                    Read online
                  </a>
                ) : (
                  <Pill tone="primary">Online</Pill>
                )
              ) : (
                <>
                  <Pill tone={b.available ? "success" : "warning"}>{b.available ? "On the shelf" : "All lent"}</Pill>
                  {canReserve && !have.has(b.id) && b.kind !== "reference" && (
                    <Button variant="tertiary" onClick={() => reserve(b.id)}>
                      Reserve
                    </Button>
                  )}
                </>
              )}
            </li>
          ))}
          {q.data && !q.data.rows.length && <li className="py-3 text-sm text-on-surface-variant">No books found.</li>}
        </ul>
      )}
      {q.data && q.data.total > q.data.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />}
    </Card>
  );
}

function Member({ m, canReserve }: { m: M; canReserve: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      showToast(done, "success");
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const dueFines = m.fines.filter((f) => f.net > 0 && f.status === "due");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-on-surface flex-1">{m.member.name}</p>
            <Pill tone="primary">
              {m.loans.length} of {m.limits.books} books
            </Pill>
          </div>
          <p className="text-xs text-on-surface-variant/70">
            {m.member.detail} · library card no. {m.member.code} · books for {m.limits.days} days, renew {m.limits.renewals}×
          </p>
          <p className={cn(label, "mt-4")}>Books with {m.member.kind === "staff" ? "you" : m.member.name.split(" ")[0]}</p>
          {!m.loans.length && <p className="mt-2 text-sm text-on-surface-variant">No library books right now.</p>}
          <ul className="mt-2 space-y-2">
            {m.loans.map((l) => (
              <li key={l.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl px-4 py-3", l.overdue ? "bg-error/10" : "bg-surface-container-low")}>
                <div className="flex-1 min-w-[12rem]">
                  <p className="font-bold text-sm">{l.title}</p>
                  <p className="text-xs text-on-surface-variant/70">
                    Due {showDate(l.dueOn)} · since {showDate(l.issuedOn)}
                    {l.renewals ? ` · renewed ${l.renewals}×` : ""}
                  </p>
                </div>
                {l.overdue && <Pill tone="danger">Overdue · fine {rupees(l.fineSoFar)} so far</Pill>}
                {l.canRenew && (
                  <Button variant="tertiary" onClick={() => act(() => libraryApi.renewMine(l.id), "Renewed")}>
                    Renew
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {m.reservations.length > 0 && (
            <>
              <p className={cn(label, "mt-5")}>Reserved</p>
              <ul className="mt-2 space-y-2">
                {m.reservations.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1">{r.title}</span>
                    {r.status === "ready" ? <Pill tone="success">Ready: collect by {showDate(r.holdUntil)}</Pill> : <Pill tone="warning">Waiting for a copy</Pill>}
                    <Button
                      variant="tertiary"
                      onClick={async () => {
                        if (await confirm({ title: `Cancel the reservation of “${r.title}”?`, confirmLabel: "Cancel it", danger: true })) await act(() => libraryApi.cancelMine(r.id), "Cancelled");
                      }}
                    >
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card>
          <p className={label}>Fines</p>
          {m.unpaid.total > 0 ? (
            <FormAlert tone="warning">
              {rupees(m.unpaid.total)} to pay{m.unpaid.fees ? ` (${rupees(m.unpaid.fees)} is in the school fees: pay with the next instalment, on My Fees)` : ""}
              {m.unpaid.counter ? `${m.unpaid.fees ? "; " : " "}${rupees(m.unpaid.counter)} at the library` : ""}.
            </FormAlert>
          ) : (
            <p className="mt-2 text-sm text-on-surface-variant">No fines to pay. ✓</p>
          )}
          {m.fines.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {m.fines.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-on-surface-variant/70 w-24">{showDate(f.on)}</span>
                  <span className="flex-1">
                    {FINE[f.kind] ?? f.kind}: {f.note}
                  </span>
                  <b>{rupees(f.net)}</b>
                  {f.waived > 0 && <Pill>{rupees(f.waived)} waived</Pill>}
                  {f.payAt === "fees" ? <Pill tone="primary">In the fees</Pill> : f.status === "paid" ? <Pill tone="success">Paid</Pill> : f.net > 0 && dueFines.includes(f) ? <Pill tone="warning">Pay at the library</Pill> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        {m.history.length > 0 && (
          <Card>
            <p className={label}>Read before</p>
            <ul className="mt-2 space-y-1 text-sm">
              {m.history.map((h) => (
                <li key={h.id} className="flex gap-2">
                  <span className="flex-1">{h.title}</span>
                  <span className="text-xs text-on-surface-variant/70">
                    {showDate(h.issuedOn)} – {h.status === "lost" ? "lost" : showDate(h.returnedOn)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <Catalogue m={m} canReserve={canReserve} />
    </div>
  );
}

function Mine() {
  const q = useQuery({ queryKey: ["library", "mine"], queryFn: libraryApi.mine });
  const [pick, setPick] = useState<string | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const members = q.data!.members;
  if (!members.length) return <FormAlert tone="info">No library member is linked to your login.</FormAlert>;
  const m = members.find((x) => x.member.id === pick) ?? members[0];
  return (
    <div className="space-y-4">
      {members.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {members.map((x) => (
            <button key={x.member.id} type="button" onClick={() => setPick(x.member.id)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold border", x.member.id === m.member.id ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {x.member.name}
            </button>
          ))}
        </div>
      )}
      <Member key={m.member.id} m={m} canReserve={q.data!.canReserve} />
    </div>
  );
}

export default function MyLibraryPage() {
  return (
    <RequirePermission permission="library.mine">
      <PageHeader title="My Library" description="Library books you have and when they are due, fines, and the catalogue to find and reserve books." />
      <Mine />
    </RequirePermission>
  );
}
