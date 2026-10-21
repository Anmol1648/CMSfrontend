"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { ReceiptView } from "@/components/fees/ReceiptView";
import { DuesTable } from "@/components/fees/DuesTable";
import { StudentFeeExtras } from "@/components/fees/StudentFeeExtras";
import { UpiQrPay } from "@/components/fees/UpiQrPay";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { COUNTER_MODES, feesApi, PAYMENT_MODES, PaymentMode, PaymentResult, paymentsApi, Receipt, rupees } from "@/lib/api/fees";
import { ApiError, errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";

const today = () => new Date().toISOString().slice(0, 10);
type CounterMode = Exclude<PaymentMode, "online">;

function Counter() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { can } = useAuth();
  const studentId = params.get("student");
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const results = useQuery({ queryKey: ["fee-student-search", debounced], queryFn: () => feesApi.searchStudents(debounced), enabled: debounced.trim().length >= 2 });
  const config = useQuery({ queryKey: ["fee-config"], queryFn: feesApi.config });
  const fees = useQuery({ queryKey: ["student-fees", studentId, year], queryFn: () => feesApi.studentFees(studentId!, year || undefined), enabled: !!studentId && !!year });

  // Payment form
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<CounterMode>("cash");
  const [reference, setReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Receipt | null>(null);
  const [qr, setQr] = useState<PaymentResult | null>(null);

  const dues = fees.data?.dues;
  const open = useMemo(() => (dues?.instalments ?? []).filter((i) => i.balance > 0), [dues]);
  // Start with every overdue instalment ticked (or the first one due).
  useEffect(() => {
    const overdue = open.filter((i) => i.overdue).map((i) => i.id);
    setSelected(overdue.length ? overdue : open.slice(0, 1).map((i) => i.id));
  }, [open]);
  const selectedTotal = open.filter((i) => selected.includes(i.id)).reduce((a, i) => a + i.balance, 0);
  useEffect(() => setAmount(selectedTotal ? String(selectedTotal) : ""), [selectedTotal]);

  const pick = (id: string) => {
    router.replace(`/fees/collect?student=${id}`);
    setSearch("");
  };

  const collect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const r = await feesApi.collect({
        studentId,
        academicYearId: year,
        date,
        mode,
        reference: reference.trim() || null,
        bankName: bankName.trim() || null,
        amount: Number(amount),
        instalmentIds: selected,
        note: note.trim() || null,
      });
      setDone(r);
      setReference("");
      setBankName("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["student-fees", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["fee-receipts"] });
    } catch (err) {
      setError(errorMessage(err));
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  const s = fees.data?.student;
  return (
    <>
      <PageHeader
        title="Collect fees"
        description="Find the student, tick the instalments being paid and take the payment. Payments always clear the oldest dues first."
        actions={
          <Link href="/fees/receipts" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All receipts
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 no-print">
        <div className="md:col-span-2 relative">
          <Input label="Student" placeholder="Name, admission no or parent's mobile" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" autoFocus />
          {debounced.trim().length >= 2 && search && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-outline-variant/30 bg-white shadow-lg max-h-80 overflow-y-auto">
              {results.isLoading && <p className="p-3 text-sm text-on-surface-variant">Searching…</p>}
              {results.data?.length === 0 && <p className="p-3 text-sm text-on-surface-variant">No student found.</p>}
              {results.data?.map((r) => (
                <button key={r.id} type="button" onClick={() => pick(r.id)} className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low border-b border-outline-variant/10 last:border-0">
                  <p className="text-sm font-bold text-primary">
                    {r.name} <span className="font-mono text-xs text-on-surface-variant/70">{r.admissionNo}</span>
                    {r.status !== "active" && <span className="ml-2 text-[10px] uppercase text-error">{r.status}</span>}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {r.section ?? "Not enrolled this year"}
                    {r.parent ? ` · ${r.parent.name}${r.parent.mobile ? ` · ${r.parent.mobile}` : ""}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        <YearSelect value={year} onChange={setYear} />
      </div>

      {!studentId && <FormAlert tone="info">Search for a student to see their fees.</FormAlert>}
      {fees.isError && <FormAlert>{errorMessage(fees.error)}</FormAlert>}
      {studentId && fees.isLoading && <PageLoader />}

      {fees.data && s && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-black text-primary">{s.name}</h2>
                  <p className="text-sm text-on-surface-variant">
                    {s.admissionNo} · {s.section ?? "Not enrolled this year"}
                    {s.roll ? ` · Roll ${s.roll}` : ""}
                    {s.status !== "active" && <span className="ml-2 font-bold text-error uppercase text-xs">{s.status}</span>}
                  </p>
                  <Link href={`/students/${s.id}`} className="text-xs font-bold text-primary underline">
                    Student profile
                  </Link>
                </div>
                {dues && (
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">This year</p>
                      <p className="text-lg font-black">{rupees(dues.totals.net)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Paid</p>
                      <p className="text-lg font-black text-emerald-700">{rupees(dues.totals.paid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Overdue</p>
                      <p className="text-lg font-black text-error">{rupees(dues.totals.overdue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Balance</p>
                      <p className="text-lg font-black text-primary">{rupees(dues.totals.balance)}</p>
                    </div>
                  </div>
                )}
              </div>
              {!fees.data.enrolled ? (
                <FormAlert tone="warning">The student is not enrolled in this academic year.</FormAlert>
              ) : (
                <DuesTable dues={dues!} selectable={can("fee.collect")} selected={selected} onSelect={setSelected} />
              )}
            </Card>

            {fees.data.enrolled && open.length > 0 && can("fee.collect") && (
              <Card>
                <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Take payment</h3>
                <form onSubmit={collect} noValidate className="space-y-4">
                  {error && <FormAlert>{error}</FormAlert>}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input label="Amount (₹) *" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
                    <Select label="Mode" value={mode} onChange={(v) => setMode(v as CounterMode)} options={COUNTER_MODES.map((m) => ({ value: m, label: PAYMENT_MODES[m] }))} />
                    {mode !== "cash" && <Input label={mode === "cheque" ? "Cheque no *" : mode === "dd" ? "DD no *" : "Transaction no *"} value={reference} onChange={(e) => setReference(e.target.value)} error={errors.reference} maxLength={60} />}
                    {(mode === "cheque" || mode === "dd") && <Input label="Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={80} />}
                    <Input label="Date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
                    <div className="md:col-span-3">
                      <Input label="Note (printed on the receipt)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-on-surface-variant/70">
                      Ticked: {rupees(selectedTotal)}.{config.data && !config.data.partial ? " Part payment is off: pay whole instalments." : " A smaller amount pays part of the oldest ticked instalment."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || !Number(amount) || !selected.length}
                        title="Show a UPI QR code for this amount; the parent scans it with any UPI app"
                        onClick={async () => {
                          setError(null);
                          try {
                            setQr(await paymentsApi.qrAtCounter({ studentId: studentId!, instalmentIds: selected, amount: Number(amount) }));
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      >
                        <span className="material-symbols-outlined text-lg align-middle mr-1">qr_code_2</span>
                        UPI QR
                      </Button>
                      <Button type="submit" disabled={busy || !Number(amount) || !selected.length}>
                        {busy ? "Saving…" : `Receive ${rupees(Number(amount) || 0)}`}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            )}
            {fees.data.enrolled && open.length === 0 && <FormAlert tone="success">Nothing is due. All fees of this year are paid.</FormAlert>}

            <Card>
              <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Receipts this year</h3>
              {fees.data.receipts.length ? (
                <table className="w-full text-sm">
                  <tbody>
                    {fees.data.receipts.map((r) => (
                      <tr key={r.id} onClick={() => router.push(`/fees/receipts/${r.id}`)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                        <td className="py-2 font-mono text-xs">{r.receiptNo}</td>
                        <td className="py-2">{new Date(`${r.date}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC" })}</td>
                        <td className="py-2">{PAYMENT_MODES[r.mode]}</td>
                        <td className="py-2">{r.instalments.map((i) => i.name).join(", ")}</td>
                        <td className="py-2 text-right font-bold">{rupees(r.amount)}</td>
                        <td className="py-2 text-right">{r.status === "cancelled" ? <Pill tone="danger">Cancelled</Pill> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-on-surface-variant/70">No receipts yet.</p>
              )}
            </Card>
          </div>

          <StudentFeeExtras fees={fees.data} onChange={(f) => queryClient.setQueryData(["student-fees", studentId, year], f)} canChange={can("fee.concession")} />
        </div>
      )}

      {qr && fees.data && (
        <UpiQrPay
          payment={qr}
          title={`Scan to pay: ${fees.data.student.name}`}
          onClose={() => setQr(null)}
          onPaid={async (r) => {
            setQr(null);
            if (r.receipt) setDone(await feesApi.receipt(r.receipt.id));
          }}
        />
      )}
      {done && (
        <Modal isOpen onClose={() => setDone(null)} title={`Received ${rupees(done.amount)}`} width="max-w-3xl">
          <div className="space-y-4">
            <div className="print-area max-h-[65vh] overflow-y-auto">
              <ReceiptView receipt={done} format={config.data?.receiptFormat} />
            </div>
            <div className="flex justify-end gap-3 no-print">
              <Button variant="secondary" onClick={() => setDone(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDone(null);
                  router.replace("/fees/collect");
                }}
              >
                Next student
              </Button>
              <Button
                onClick={() => {
                  showToast("Opening the print dialog…", "info");
                  window.print();
                }}
              >
                Print receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function CollectFeesPage() {
  return (
    <RequirePermission permission="fee.collect">
      <Suspense>
        <Counter />
      </Suspense>
    </RequirePermission>
  );
}
