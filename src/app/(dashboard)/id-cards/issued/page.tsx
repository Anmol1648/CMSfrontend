"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { CardRow, Holder, idCardsApi, REASON } from "@/lib/api/idcards";
import { CardSheet } from "@/components/idcards/IdCard";

const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const STATUS: Record<string, { label: string; tone: "success" | "neutral" | "danger" }> = { active: { label: "Active", tone: "success" }, replaced: { label: "Replaced", tone: "neutral" }, cancelled: { label: "Cancelled", tone: "danger" } };

function Duplicate({ card, fee, onClose, onDone }: { card: CardRow; fee: number; onClose: () => void; onDone: (r: { id: string; type: CardRow["type"]; holderId: string; designId: string | null }) => void }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("lost");
  const [amount, setAmount] = useState(String(fee));
  const student = card.type === "student";
  const save = async () => {
    try {
      const r = await idCardsApi.duplicate(card.id, { reason, fee: student && reason !== "changed" ? Math.max(0, Number(amount) || 0) : null });
      showToast(`New card ${r.cardNo}${r.fee ? `: ₹${r.fee} added to the fees` : ""}. The old card is no longer valid.`, "success");
      onDone(r);
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Replace ${card.cardNo}`} width="max-w-md">
      <div className="space-y-4">
        <p className="text-sm">
          <b>{card.name}</b> · {card.code}
        </p>
        <Select label="Why" value={reason} onChange={setReason} options={[{ value: "lost", label: "Lost" }, { value: "damaged", label: "Damaged" }, { value: "changed", label: "Details changed (free)" }]} />
        {student && reason !== "changed" && <Input label="Duplicate fee (₹, added to the student’s fees)" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        <p className="text-xs text-on-surface-variant">A new card number is given; scanning the old card will show “replaced, not valid”.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Replace</Button>
        </div>
      </div>
    </Modal>
  );
}

function Issued() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const o = useQuery({ queryKey: ["idcards", "options"], queryFn: idCardsApi.options });
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [dup, setDup] = useState<CardRow | null>(null);
  const [ready, setReady] = useState<{ cardId: string; designId: string | null; holder: Holder } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [term, type, status]);
  const q = useQuery({ queryKey: ["idcards", "cards", term, type, status, page], queryFn: () => idCardsApi.cards({ search: term || undefined, type: type || undefined, status, page }) });
  const print = can("idcard.print");
  const prepare = async (cardId: string, t: CardRow["type"], holderId: string, designId: string | null) => {
    const [h] = await idCardsApi.pick({ type: t, ids: [holderId] });
    setReady({ cardId, designId, holder: h });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const design = ready && o.data ? (o.data.designs.find((d) => d.id === ready.designId) ?? o.data.designs.find((d) => d.kind === ready.holder.type && d.isDefault) ?? o.data.designs.find((d) => d.kind === ready.holder.type)) : null;
  return (
    <div className="space-y-4">
      {ready && design && o.data && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="flex-1 font-extrabold">Ready to print: {ready.holder.name}</p>
            <Button variant="secondary" onClick={() => setReady(null)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                try {
                  await idCardsApi.printed(ready.cardId);
                  queryClient.invalidateQueries({ queryKey: ["idcards", "cards"] });
                  setTimeout(() => window.print(), 300);
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              <span className="material-symbols-outlined text-lg">print</span> Print (one card per page)
            </Button>
          </div>
          <div className="overflow-x-auto">
            <CardSheet design={design} holders={[ready.holder]} school={o.data.school} mode="single" backs />
          </div>
        </Card>
      )}
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, admission no, card no…" />
          <Select label="For" value={type} onChange={setType} options={[{ value: "", label: "Students and staff" }, { value: "student", label: "Students" }, { value: "staff", label: "Staff" }]} />
          <Select label="Status" value={status} onChange={setStatus} options={[{ value: "active", label: "Active" }, { value: "replaced", label: "Replaced" }, { value: "cancelled", label: "Cancelled" }, { value: "", label: "All" }]} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-4 py-2">Card no.</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Design</th>
                  <th className="px-2 py-2">Given</th>
                  <th className="px-2 py-2">Valid till</th>
                  <th className="px-2 py-2">Reason</th>
                  <th className="px-2 py-2">Status</th>
                  {print && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {q.data!.rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/15">
                    <td className="px-4 py-2 font-mono text-xs">{r.cardNo}</td>
                    <td className="px-2 py-2">
                      <b>{r.name}</b>
                      <p className="text-xs text-on-surface-variant">
                        {r.type === "staff" ? "Staff" : "Student"} · {r.code}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-xs">{r.design}</td>
                    <td className="px-2 py-2 text-xs">
                      {day(r.createdAt)}
                      <p className="text-on-surface-variant">
                        {r.printCount} print(s) · {r.issuedBy}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-xs">{day(r.validUntil)}</td>
                    <td className="px-2 py-2 text-xs">
                      {REASON[r.reason] ?? r.reason}
                      {r.fee ? ` · ₹${r.fee}` : ""}
                    </td>
                    <td className="px-2 py-2">
                      <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                    </td>
                    {print && (
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        {r.status === "active" && (
                          <>
                            <Button variant="tertiary" onClick={() => prepare(r.id, r.type, r.holderId, r.designId)}>
                              Reprint
                            </Button>
                            <Button variant="tertiary" onClick={() => setDup(r)}>
                              Replace
                            </Button>
                            <Button
                              variant="tertiary"
                              onClick={async () => {
                                if (!(await confirm({ title: `Cancel ${r.cardNo}?`, message: "Scanning it will show “cancelled”. Use this when a person leaves or a card is withdrawn.", confirmLabel: "Cancel card", danger: true }))) return;
                                try {
                                  await idCardsApi.cancel(r.id);
                                  queryClient.invalidateQueries({ queryKey: ["idcards", "cards"] });
                                  showToast("Cancelled", "success");
                                } catch (e) {
                                  showToast(errorMessage(e), "error");
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!q.data!.rows.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">
                      No cards.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {q.data!.total > q.data!.pageSize && <Pagination className="px-4 py-3" currentPage={page} totalPage={Math.ceil(q.data!.total / q.data!.pageSize)} onPageChange={setPage} />}
        </Card>
      )}
      {dup && (
        <Duplicate
          card={dup}
          fee={o.data?.duplicateFee ?? 0}
          onClose={() => setDup(null)}
          onDone={(r) => {
            setDup(null);
            queryClient.invalidateQueries({ queryKey: ["idcards", "cards"] });
            void prepare(r.id, r.type, r.holderId, r.designId);
          }}
        />
      )}
    </div>
  );
}

export default function IdCardsIssuedPage() {
  return (
    <RequirePermission permission={["idcard.print", "idcard.view"]}>
      <PageHeader title="Cards Given" description="Every ID card given: reprint one, replace a lost or damaged card (new number, old one stops working), or cancel it." />
      <Issued />
    </RequirePermission>
  );
}
