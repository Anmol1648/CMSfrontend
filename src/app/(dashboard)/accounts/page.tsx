"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { accApi, inr, Ledger, SRC, todayISO, VT, VType } from "@/lib/api/accounts";
import { cn } from "@/lib/utils";

type Row = { ledgerId: string; dr: string; cr: string; note: string };
const monthStart = () => todayISO().slice(0, 8) + "01";

/** Pick a ledger by typing (cash / bank ones first for receipts and payments). */
function LedgerSelect({ ledgers, value, onChange, prefer }: { ledgers: Ledger[]; value: string; onChange: (id: string) => void; prefer?: "money" }) {
  const sorted = useMemo(() => [...ledgers].filter((l) => l.isActive).sort((a, b) => (prefer === "money" ? Number(b.kind !== "other") - Number(a.kind !== "other") : 0) || a.name.localeCompare(b.name)), [ledgers, prefer]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg bg-surface-container-low px-2 py-1.5 text-sm" aria-label="Ledger">
      <option value="">Choose a ledger…</option>
      {sorted.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
          {l.kind !== "other" ? ` (${l.kind})` : ""}
        </option>
      ))}
    </select>
  );
}

function NewVoucher({ ledgers, onClose, onSaved }: { ledgers: Ledger[]; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [type, setType] = useState<VType>("payment");
  const [date, setDate] = useState(todayISO());
  const [narration, setNarration] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const money = ledgers.find((l) => l.kind === "bank" && l.isDefault) ?? ledgers.find((l) => l.kind === "bank") ?? ledgers.find((l) => l.kind === "cash");
  const blank = (t: VType): Row[] => (t === "payment" ? [{ ledgerId: "", dr: "", cr: "", note: "" }, { ledgerId: money?.id ?? "", dr: "", cr: "", note: "" }] : t === "receipt" ? [{ ledgerId: money?.id ?? "", dr: "", cr: "", note: "" }, { ledgerId: "", dr: "", cr: "", note: "" }] : [{ ledgerId: "", dr: "", cr: "", note: "" }, { ledgerId: "", dr: "", cr: "", note: "" }]);
  const [rows, setRows] = useState<Row[]>(blank("payment"));
  const fileRef = useRef<HTMLInputElement>(null);
  const n = (s: string) => Number(s) || 0;
  const dr = rows.reduce((a, r) => a + n(r.dr), 0);
  const cr = rows.reduce((a, r) => a + n(r.cr), 0);
  const set = (i: number, patch: Partial<Row>) => setRows((x) => x.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  // Simple two-line vouchers: typing one amount fills the other side.
  const autofill = (i: number, side: "dr" | "cr", v: string) => {
    set(i, side === "dr" ? { dr: v, cr: "" } : { cr: v, dr: "" });
    if (rows.length === 2) set(1 - i, side === "dr" ? { cr: v, dr: "" } : { dr: v, cr: "" });
  };
  return (
    <Modal isOpen onClose={onClose} title="New voucher" width="max-w-4xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Type" value={type} onChange={(v) => { setType(v as VType); setRows(blank(v as VType)); }} options={(Object.keys(VT) as VType[]).map((k) => ({ value: k, label: VT[k].label }))} />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Cheque / UPI / reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} className="sm:col-span-2" />
        </div>
        <p className="text-xs text-on-surface-variant">{type === "payment" ? "Money out: debit what it was for (an expense, a vendor…), credit cash or the bank." : type === "receipt" ? "Money in: debit cash or the bank, credit where it came from (income, a refund…)." : type === "contra" ? "Between cash and banks only (cash deposited, withdrawn, bank to bank)." : "Adjustments with no cash or bank (e.g. an expense paid by someone, a correction)."}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="py-1">Ledger</th>
              <th className="w-32">Debit (₹)</th>
              <th className="w-32">Credit (₹)</th>
              <th>Note</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <LedgerSelect ledgers={ledgers} value={r.ledgerId} onChange={(v) => set(i, { ledgerId: v })} prefer={(type === "payment" && i === 1) || (type === "receipt" && i === 0) || type === "contra" ? "money" : undefined} />
                </td>
                <td className="pr-2">
                  <input type="number" min={0} step="0.01" value={r.dr} onChange={(e) => autofill(i, "dr", e.target.value)} className="w-full rounded-lg bg-surface-container-low px-2 py-1.5" aria-label="Debit" />
                </td>
                <td className="pr-2">
                  <input type="number" min={0} step="0.01" value={r.cr} onChange={(e) => autofill(i, "cr", e.target.value)} className="w-full rounded-lg bg-surface-container-low px-2 py-1.5" aria-label="Credit" />
                </td>
                <td className="pr-2">
                  <input value={r.note} onChange={(e) => set(i, { note: e.target.value })} maxLength={200} className="w-full rounded-lg bg-surface-container-low px-2 py-1.5" aria-label="Note" />
                </td>
                <td>
                  {rows.length > 2 && (
                    <button type="button" className="text-error" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} aria-label="Remove">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-1">
                <button type="button" className="text-xs font-bold text-primary" onClick={() => setRows((x) => [...x, { ledgerId: "", dr: "", cr: "", note: "" }])}>
                  + Add a line
                </button>
              </td>
              <td>{inr(dr)}</td>
              <td>{inr(cr)}</td>
              <td className={cn("text-xs", Math.abs(dr - cr) > 0.004 ? "text-error" : "text-emerald-700")}>{Math.abs(dr - cr) > 0.004 ? `Difference ${inr(Math.abs(dr - cr))}` : dr > 0 ? "Balanced" : ""}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Narration</span>
          <textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} maxLength={500} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" placeholder="Electricity bill for September" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <span className="material-symbols-outlined text-lg">attach_file</span> {file ? "Change bill" : "Attach bill"}
            </Button>
            {file && <span className="text-xs">{file.name}</span>}
            <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setFile(await accApi.upload(f)); } catch (er) { showToast(errorMessage(er), "error"); } }} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={dr <= 0 || Math.abs(dr - cr) > 0.004 || rows.some((r) => (n(r.dr) || n(r.cr)) && !r.ledgerId)}
              onClick={async () => {
                try {
                  const r = await accApi.createVoucher({ type, date, narration: narration || null, reference: reference || null, attachmentId: file?.id ?? null, lines: rows.filter((x) => x.ledgerId && (n(x.dr) || n(x.cr))).map((x) => ({ ledgerId: x.ledgerId, dr: n(x.dr), cr: n(x.cr), note: x.note || null })) });
                  showToast(r.status === "pending" ? `${r.number} saved: waiting for approval` : `${r.number} saved`, "success");
                  onSaved();
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Save voucher
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function VoucherModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["accounts", "voucher", id], queryFn: () => accApi.voucher(id) });
  const [print, setPrint] = useState(false);
  const [reason, setReason] = useState("");
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const v = q.data;
  return (
    <Modal isOpen onClose={onClose} title={v ? `${VT[v.type].label} ${v.number}` : "Voucher"} width="max-w-2xl">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : v ? (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Pill tone={v.status === "posted" ? "success" : v.status === "pending" ? "warning" : "neutral"}>{v.status === "posted" ? "Posted" : v.status === "pending" ? "Waiting for approval" : `Cancelled: ${v.cancelReason ?? ""}`}</Pill>
            <Pill>{SRC[v.source] ?? v.source}</Pill>
            <span className="text-xs text-on-surface-variant">
              {new Date(`${v.date}T00:00:00`).toLocaleDateString("en-IN")} · {v.createdByName}
              {v.approvedByName ? ` · approved by ${v.approvedByName}` : ""}
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th>Ledger</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {v.entries.map((e) => (
                <tr key={e.id} className="border-t border-outline-variant/15">
                  <td className="py-1">
                    {e.ledger}
                    {e.note && <span className="block text-xs text-on-surface-variant">{e.note}</span>}
                    {e.reconciledOn && <span className="block text-[10px] text-emerald-700">In bank statement {e.reconciledOn}</span>}
                  </td>
                  <td className="text-right">{e.dr ? inr(e.dr) : ""}</td>
                  <td className="text-right">{e.cr ? inr(e.cr) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {v.narration && <p>{v.narration}</p>}
          {v.reference && <p className="text-xs">Reference: {v.reference}</p>}
          {v.attachmentId && (
            <button type="button" className="text-xs font-bold text-primary" onClick={async () => { try { window.open(await authedImageUrl(accApi.filePath(v.attachmentId!)), "_blank", "noopener"); } catch (e) { showToast(errorMessage(e), "error"); } }}>
              Open the attached bill
            </button>
          )}
          <div className="flex flex-wrap items-end justify-end gap-2 pt-2">
            {v.status !== "cancelled" && can("accounts.approve") && <Input label="Reason (to refuse / cancel)" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" maxLength={300} />}
            {v.status === "pending" && can("accounts.approve") && (
              <>
                <Button variant="secondary" onClick={() => act(() => accApi.approve(v.id, false, reason || null), "Refused")}>
                  Refuse
                </Button>
                <Button onClick={() => act(() => accApi.approve(v.id, true, null), "Approved and posted")}>Approve</Button>
              </>
            )}
            {v.status === "posted" && can("accounts.approve") && (
              <Button variant="tertiary" disabled={reason.trim().length < 3} onClick={async () => (await confirm({ title: `Cancel ${v.number}?`, message: "It stays in the list as cancelled and leaves the books.", confirmLabel: "Cancel voucher", danger: true })) && act(() => accApi.cancel(v.id, reason.trim()), "Cancelled")}>
                Cancel voucher
              </Button>
            )}
            <Button variant="secondary" onClick={() => setPrint(true)}>
              <span className="material-symbols-outlined text-lg">print</span> Print
            </Button>
          </div>
          {print && <DocumentViewer docKey="acc_voucher" params={{ id: v.id }} title={v.number} filename="voucher.pdf" onClose={() => setPrint(false)} />}
        </div>
      ) : null}
    </Modal>
  );
}

function SalaryPaid({ ledgers }: { ledgers: Ledger[] }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["accounts", "salary-months"], queryFn: accApi.salaryMonths });
  const unpaid = (q.data ?? []).filter((m) => !m.paid);
  const [month, setMonth] = useState("");
  const [date, setDate] = useState(todayISO());
  const [bank, setBank] = useState("");
  const [ref, setRef] = useState("");
  useEffect(() => {
    if (unpaid.length && !month) setMonth(unpaid[0].month);
  }, [unpaid, month]);
  if (!unpaid.length) return null;
  return (
    <Card padding="sm">
      <p className="font-bold mb-2">Salaries not yet marked paid</p>
      <div className="grid gap-2 sm:grid-cols-5 items-end">
        <Select label="Month" value={month} onChange={setMonth} options={unpaid.map((m) => ({ value: m.month, label: m.month }))} />
        <Input label="Paid on" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="From bank" value={bank} onChange={setBank} options={[{ value: "", label: "Default bank" }, ...ledgers.filter((l) => l.kind === "bank").map((l) => ({ value: l.id, label: l.name }))]} />
        <Input label="Reference" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="NEFT batch no." />
        <Button
          onClick={async () => {
            try {
              await accApi.salaryPaid({ month, date, bankLedgerId: bank || null, reference: ref || null });
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              setMonth("");
              showToast("Salary payment posted", "success");
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Mark paid
        </Button>
      </div>
    </Card>
  );
}

function Vouchers() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const chart = useQuery({ queryKey: ["accounts", "chart"], queryFn: accApi.chart });
  const money = useQuery({ queryKey: ["accounts", "money"], queryFn: accApi.money });
  const [f, setF] = useState({ from: monthStart(), to: todayISO(), type: "", status: "", source: "", search: "" });
  const q = useQuery({ queryKey: ["accounts", "vouchers", f], queryFn: () => accApi.vouchers(f) });
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [posting, setPosting] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="space-y-4">
      {money.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {money.data.rows.map((r) => (
            <Card key={r.id} padding="sm">
              <p className="text-xs text-on-surface-variant">{r.name}</p>
              <p className={cn("text-xl font-extrabold", r.balance < 0 && "text-error")}>{inr(r.balance)}</p>
            </Card>
          ))}
          {money.data.pending > 0 && (
            <button type="button" onClick={() => setF((x) => ({ ...x, status: "pending", from: "2000-01-01" }))} className="text-left">
              <Card padding="sm" className="ring-2 ring-amber-300">
                <p className="text-xs text-on-surface-variant">Payments waiting for approval</p>
                <p className="text-xl font-extrabold text-amber-700">{money.data.pending}</p>
              </Card>
            </button>
          )}
        </div>
      )}
      {money.data?.cashWarning && <FormAlert tone="warning">Cash in hand is more than {inr(money.data.cashWarning)}: deposit it in the bank (a contra voucher).</FormAlert>}
      {can("accounts.entry") && chart.data && <SalaryPaid ledgers={chart.data.ledgers} />}
      <Card>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1.5fr] items-end">
          <Input label="From" type="date" value={f.from} onChange={(e) => set("from")(e.target.value)} />
          <Input label="To" type="date" value={f.to} onChange={(e) => set("to")(e.target.value)} />
          <Select label="Type" value={f.type} onChange={set("type")} options={[{ value: "", label: "All" }, ...(Object.keys(VT) as VType[]).map((k) => ({ value: k, label: VT[k].label }))]} />
          <Select label="Status" value={f.status} onChange={set("status")} options={[{ value: "", label: "All" }, { value: "posted", label: "Posted" }, { value: "pending", label: "Waiting for approval" }, { value: "cancelled", label: "Cancelled" }]} />
          <Select label="From" value={f.source} onChange={set("source")} options={[{ value: "", label: "Anywhere" }, ...Object.entries(SRC).map(([value, label]) => ({ value, label }))]} />
          <Input label="Search" value={f.search} onChange={(e) => set("search")(e.target.value)} placeholder="Number, narration, cheque…" />
        </div>
        {can("accounts.entry") && (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              loading={posting}
              onClick={async () => {
                setPosting(true);
                try {
                  const r = await accApi.post();
                  queryClient.invalidateQueries({ queryKey: ["accounts"] });
                  showToast(`Posted: fees ${(r.fees?.made ?? 0) + (r.fees?.updated ?? 0)} day(s), payroll ${r.payroll?.made ?? 0}, store ${r.store?.made ?? 0}, loans ${r.loans?.made ?? 0}`, "success");
                } catch (e) {
                  showToast(errorMessage(e), "error");
                } finally {
                  setPosting(false);
                }
              }}
            >
              <span className="material-symbols-outlined text-lg">sync</span> Post from fees, payroll, store
            </Button>
            <Button onClick={() => setCreating(true)} disabled={!chart.data}>
              <span className="material-symbols-outlined text-lg">add</span> New voucher
            </Button>
          </div>
        )}
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
                  <th className="px-5 py-2">Date</th>
                  <th className="px-2 py-2">Voucher</th>
                  <th className="px-2 py-2">Debit → Credit</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {q.data!.map((v) => (
                  <tr key={v.id} onClick={() => setOpen(v.id)} className={cn("border-t border-outline-variant/15 hover:bg-surface-container-low cursor-pointer", v.status === "cancelled" && "opacity-50")}>
                    <td className="px-5 py-2 whitespace-nowrap">{new Date(`${v.date}T00:00:00`).toLocaleDateString("en-IN")}</td>
                    <td className="px-2 py-2">
                      <span className="font-mono text-xs">{v.number}</span>
                      <span className="block text-xs text-on-surface-variant">{v.narration}</span>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {v.debits.join(", ")} → {v.credits.join(", ")}
                    </td>
                    <td className="px-2 py-2 text-right font-bold">{inr(v.total)}</td>
                    <td className="px-5 py-2 whitespace-nowrap">
                      <Pill tone={VT[v.type].tone}>{VT[v.type].label}</Pill> {v.source !== "manual" && <Pill>{SRC[v.source] ?? v.source}</Pill>} {v.status === "pending" && <Pill tone="warning">To approve</Pill>}
                    </td>
                  </tr>
                ))}
                {!q.data!.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-on-surface-variant">
                      No vouchers in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {open && <VoucherModal id={open} onClose={() => setOpen(null)} />}
      {creating && chart.data && <NewVoucher ledgers={chart.data.ledgers} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); queryClient.invalidateQueries({ queryKey: ["accounts"] }); }} />}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <RequirePermission permission={["accounts.entry", "accounts.approve", "accounts.view"]}>
      <PageHeader title="Vouchers" description="Receipts, payments, contra and journal vouchers. Fees, salaries, store purchases and staff loans post by themselves; the rest is entered here." />
      <Vouchers />
    </RequirePermission>
  );
}
