"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { FineRow, libraryApi, rupees, showDate } from "@/lib/api/library";

const KIND: Record<string, string> = { late: "Late", lost: "Lost book", damaged: "Damaged" };

function Waive({ fine, onClose }: { fine: FineRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [amount, setAmount] = useState(String(fine.net));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await libraryApi.waive(fine.id, Math.round(Number(amount)), reason.trim());
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      showToast("Waived", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Waive ${fine.member}’s fine`}>
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          {fine.note} · {rupees(fine.net)} to pay{fine.payAt === "fees" ? " (in the fees: the fee due goes down too)" : ""}
        </p>
        <Input label="Waive (₹)" type="number" min={1} max={fine.net} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Why" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Was ill; doctor’s note seen" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={reason.trim().length < 3 || !Number(amount)}>
            Waive
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Fines() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [show, setShow] = useState("due");
  const [payAt, setPayAt] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [waive, setWaive] = useState<FineRow | null>(null);
  const q = useQuery({ queryKey: ["library", "fines", show, payAt, search, page], queryFn: () => libraryApi.fines({ show, payAt: payAt || undefined, search: search.trim() || undefined, page }), placeholderData: keepPreviousData });
  const collect = async (f: FineRow) => {
    if (!(await confirm({ title: `Take ${rupees(f.net)} from ${f.member}?`, message: "Paid at the library; a receipt number is given.", confirmLabel: "Paid" }))) return;
    try {
      const r = await libraryApi.collect(f.id);
      showToast(`Paid: receipt ${r.receiptNo}`, "success");
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Show" value={show} onChange={(s) => { setShow(s); setPage(1); }} options={[{ value: "due", label: "To pay" }, { value: "paid", label: "Paid at the library" }, { value: "waived", label: "Waived" }, { value: "all", label: "All" }]} />
          <Select label="Paid" value={payAt} onChange={(s) => { setPayAt(s); setPage(1); }} options={[{ value: "", label: "Anywhere" }, { value: "fees", label: "With the school fees" }, { value: "counter", label: "At the library" }]} />
          <Input label="Find a student" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon="search" />
        </div>
        <p className="mt-3 text-xs text-on-surface-variant/70">Fines “with the school fees” are paid at the fee counter or online with the next instalment (System Settings → Library); they show on the student’s fees.</p>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.rows.length ? (
        <FormAlert tone="info">No fines here.</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">For</th>
                  <th className="px-4 py-3 text-right">Fine</th>
                  <th className="px-4 py-3 text-right">Waived</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((f) => (
                  <tr key={f.id} className="border-b border-outline-variant/10">
                    <td className="px-4 py-2.5 text-xs">{showDate(f.on)}</td>
                    <td className="px-4 py-2.5 font-bold">{f.member}</td>
                    <td className="px-4 py-2.5">
                      <p>{KIND[f.kind] ?? f.kind}</p>
                      <p className="text-xs text-on-surface-variant/70">{f.note}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">{rupees(f.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{f.waived ? <span title={f.waiveReason ?? ""}>{rupees(f.waived)}</span> : "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{f.payAt === "fees" ? <Pill tone="primary">With the fees</Pill> : f.status === "paid" ? <Pill tone="success">Paid · {f.receiptNo}</Pill> : f.status === "waived" ? <Pill>Waived</Pill> : <Pill tone="warning">At the library: due</Pill>}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {can("library.fines") && f.status === "due" && f.payAt === "counter" && (
                        <Button variant="tertiary" onClick={() => collect(f)}>
                          Take payment
                        </Button>
                      )}
                      {can("library.fines") && f.status !== "paid" && f.net > 0 && (
                        <Button variant="tertiary" onClick={() => setWaive(f)}>
                          Waive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-on-surface-variant/60">
              {q.data.total} fines · {rupees(q.data.sum.amount)} charged · {rupees(q.data.sum.waived)} waived
            </p>
            {q.data.total > q.data.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />}
          </div>
        </Card>
      )}
      {waive && <Waive fine={waive} onClose={() => setWaive(null)} />}
    </div>
  );
}

export default function LibraryFinesPage() {
  return (
    <RequirePermission permission={["library.view", "library.fines"]}>
      <PageHeader title="Library Fines" description="Late, lost and damaged book fines: in the school fees or paid at the library, and those waived." />
      <Fines />
    </RequirePermission>
  );
}
