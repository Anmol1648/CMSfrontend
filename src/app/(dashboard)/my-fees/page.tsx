"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { DuesTable } from "@/components/fees/DuesTable";
import { GatewayCheckout } from "@/components/fees/GatewayCheckout";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { schoolApi } from "@/lib/api/school";
import { Checkout, feesApi, MyFees, PAYMENT_MODES, PaymentResult, paymentsApi, rupees } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";

type Child = MyFees["children"][number];

const convenience = (amount: number, c: MyFees["online"]["convenience"]) => (!c || c.mode === "none" ? 0 : c.mode === "percent" ? Math.ceil((amount * c.value) / 100) : Math.ceil(c.value));

function ChildFees({ child, online, onPay }: { child: Child; online: MyFees["online"]; onPay: (checkout: Checkout) => void }) {
  const open = child.dues.instalments.filter((i) => i.balance > 0);
  const [selected, setSelected] = useState<string[]>(() => {
    const overdue = open.filter((i) => i.overdue).map((i) => i.id);
    return overdue.length ? overdue : open.slice(0, 1).map((i) => i.id);
  });
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = open.filter((i) => selected.includes(i.id)).reduce((a, i) => a + i.balance, 0);
  const paying = online.partial && Number(amount) > 0 && Number(amount) < total ? Number(amount) : total;
  const fee = convenience(paying, online.convenience);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      onPay(await paymentsApi.payFees({ studentId: child.id, instalmentIds: selected, ...(paying < total ? { amount: paying } : {}) }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-primary">{child.name}</h2>
          <p className="text-sm text-on-surface-variant">
            {child.admissionNo} · {child.section ?? "—"}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Paid</p>
            <p className="text-lg font-black text-emerald-700">{rupees(child.dues.totals.paid)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Overdue</p>
            <p className="text-lg font-black text-error">{rupees(child.dues.totals.overdue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Still to pay</p>
            <p className="text-lg font-black text-primary">{rupees(child.dues.totals.balance)}</p>
          </div>
        </div>
      </div>
      <DuesTable dues={child.dues} selectable={online.enabled && open.length > 0} selected={selected} onSelect={setSelected} />

      {open.length > 0 &&
        (online.enabled ? (
          <div className="mt-5 rounded-xl bg-surface-container-low p-4 space-y-3">
            {error && <FormAlert>{error}</FormAlert>}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                {online.partial && (
                  <div className="w-44">
                    <Input label="Pay less (optional)" type="number" min={online.minimum ?? 1} max={total} placeholder={String(total)} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                )}
                <p className="text-sm text-on-surface-variant pb-3">
                  {rupees(paying)}
                  {fee > 0 && ` + ${rupees(fee)} convenience fee`}
                </p>
              </div>
              <Button onClick={pay} disabled={busy || !selected.length || paying <= 0}>
                {busy ? "Opening…" : `Pay ${rupees(paying + fee)} online`}
              </Button>
            </div>
            <p className="text-xs text-on-surface-variant/70">UPI, debit / credit card or net banking. Your card or bank details go only to the payment gateway, never to the school&apos;s system.</p>
          </div>
        ) : (
          <FormAlert tone="info">Please pay at the school&apos;s fee counter. Online payment is not available yet.</FormAlert>
        ))}
      {!open.length && <FormAlert tone="success">All fees of this year are paid. Thank you!</FormAlert>}

      {child.receipts.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Receipts</h3>
          <table className="w-full text-sm">
            <tbody>
              {child.receipts.map((r) => (
                <tr key={r.id} className="border-t border-outline-variant/10">
                  <td className="py-2">
                    <Link href={`/my-fees/receipts/${r.id}`} className="font-mono text-primary underline">
                      {r.receiptNo}
                    </Link>
                  </td>
                  <td className="py-2">{new Date(`${r.date}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC" })}</td>
                  <td className="py-2">{PAYMENT_MODES[r.mode]}</td>
                  <td className="py-2 text-right font-bold">{rupees(r.amount)}</td>
                  <td className="py-2 text-right">{r.status === "cancelled" && <Pill tone="danger">Cancelled</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Mine() {
  const queryClient = useQueryClient();
  const fees = useQuery({ queryKey: ["my-fees"], queryFn: feesApi.my });
  const school = useQuery({ queryKey: ["public-school"], queryFn: schoolApi.publicInfo, staleTime: Infinity });
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

  if (fees.isError) return <FormAlert>{errorMessage(fees.error)}</FormAlert>;
  if (!fees.data) return <PageLoader />;
  const f = fees.data;

  return (
    <>
      <PageHeader title="My fees" description={f.academicYear ? `Fees for ${f.academicYear.name}.` : undefined} />
      {!f.children.length && <FormAlert tone="info">No fees to show. If this is wrong, please contact the school office.</FormAlert>}
      <div className="space-y-6">
        {f.children.map((c) => (
          <ChildFees key={`${c.id}-${c.dues.totals.paid}`} child={c} online={f.online} onPay={setCheckout} />
        ))}
      </div>
      {checkout && (
        <GatewayCheckout
          checkout={checkout}
          schoolName={school.data?.name ?? "School fees"}
          onClose={() => setCheckout(null)}
          onDone={async (r) => {
            setCheckout(null);
            setResult(r);
            await queryClient.invalidateQueries({ queryKey: ["my-fees"] });
          }}
        />
      )}
      {result && (
        <Modal isOpen onClose={() => setResult(null)} title={result.status === "paid" ? "Payment received" : "Payment not completed"}>
          <div className="space-y-4">
            {result.status === "paid" ? (
              <>
                <FormAlert tone="success">
                  {rupees(result.amount)} paid{result.paymentRef ? ` (payment id ${result.paymentRef})` : ""}. Thank you!
                </FormAlert>
                {result.error && <FormAlert tone="warning">{result.error}. The school will contact you.</FormAlert>}
                {result.receipt && (
                  <Link href={`/my-fees/receipts/${result.receipt.id}`} className="inline-block px-6 py-2.5 font-bold rounded-md bg-primary text-white hover:opacity-90">
                    See receipt {result.receipt.receiptNo}
                  </Link>
                )}
              </>
            ) : (
              <FormAlert>{result.error ?? "The payment did not go through."} No money was taken for this attempt; you can try again.</FormAlert>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default function MyFeesPage() {
  return (
    <RequirePermission permission="fee.pay_online">
      <Mine />
    </RequirePermission>
  );
}
