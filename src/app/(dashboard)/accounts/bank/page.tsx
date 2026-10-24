"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { accApi, inr, todayISO } from "@/lib/api/accounts";
import { cn } from "@/lib/utils";

type Match = { date: string; description: string; deposit: number; withdrawal: number; entryId: string | null; voucher: string | null };

function Bank() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const chart = useQuery({ queryKey: ["accounts", "chart"], queryFn: accApi.chart });
  const banks = (chart.data?.ledgers ?? []).filter((l) => l.kind === "bank");
  const [ledger, setLedger] = useState("");
  const [upTo, setUpTo] = useState(todayISO());
  const [show, setShow] = useState<"open" | "all">("open");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [clearDate, setClearDate] = useState(todayISO());
  const [matches, setMatches] = useState<Match[] | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!ledger && banks.length) setLedger((banks.find((b) => b.isDefault) ?? banks[0]).id);
  }, [banks, ledger]);
  const q = useQuery({ queryKey: ["accounts", "bank", ledger, upTo, show], queryFn: () => accApi.bank(ledger, upTo, show), enabled: !!ledger });
  const refresh = () => {
    setPicked(new Set());
    queryClient.invalidateQueries({ queryKey: ["accounts", "bank"] });
  };
  const tick = async (ids: string[], date: string | null, msg: string) => {
    try {
      await accApi.reconcile(ids, date);
      refresh();
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-4 items-end">
          <Select label="Bank account" value={ledger} onChange={setLedger} options={banks.map((b) => ({ value: b.id, label: b.name }))} />
          <Input label="Up to" type="date" value={upTo} onChange={(e) => setUpTo(e.target.value)} />
          <Select label="Show" value={show} onChange={(v) => setShow(v as "open" | "all")} options={[{ value: "open", label: "Not yet in the statement" }, { value: "all", label: "All" }]} />
          <Button variant="secondary" onClick={() => file.current?.click()} disabled={!ledger}>
            <span className="material-symbols-outlined text-lg">upload</span> Match a statement (Excel)
          </Button>
          <input
            ref={file}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const r = await accApi.statement(ledger, f);
                setMatches(r.lines);
                showToast(`${r.matched} of ${r.lines.length} statement lines matched`, "success");
              } catch (er) {
                showToast(errorMessage(er), "error");
              }
            }}
          />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : q.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card padding="sm">
              <p className="text-xs text-on-surface-variant">Balance as per our books</p>
              <p className="text-xl font-extrabold">{inr(q.data.books)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-on-surface-variant">Not yet in the bank statement</p>
              <p className="text-xl font-extrabold text-amber-700">{inr(q.data.notInBank)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-on-surface-variant">So the bank statement should show</p>
              <p className="text-xl font-extrabold text-primary">{inr(q.data.bank)}</p>
            </Card>
          </div>
          {picked.size > 0 && (
            <Card padding="sm">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-sm">{picked.size} ticked</span>
                <Input label="Shown in the statement on" type="date" value={clearDate} onChange={(e) => setClearDate(e.target.value)} className="max-w-[12rem]" />
                <Button onClick={() => tick(Array.from(picked), clearDate, "Marked as in the statement")}>Mark as in the statement</Button>
              </div>
            </Card>
          )}
          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-5 py-2 w-8"></th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Voucher</th>
                  <th className="px-2 py-2 text-right">Deposit</th>
                  <th className="px-2 py-2 text-right">Withdrawal</th>
                  <th className="px-5 py-2">In statement</th>
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((r) => (
                  <tr key={r.id} className={cn("border-t border-outline-variant/15", r.reconciledOn && "bg-emerald-50/50")}>
                    <td className="px-5 py-1.5">
                      {!r.reconciledOn && <input type="checkbox" className="accent-[#1A365D]" checked={picked.has(r.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label="Tick" />}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{new Date(`${r.date}T00:00:00`).toLocaleDateString("en-IN")}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-xs">{r.number}</span>
                      <span className="block text-xs text-on-surface-variant">
                        {r.narration}
                        {r.reference ? ` · ${r.reference}` : ""}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">{r.deposit ? inr(r.deposit) : ""}</td>
                    <td className="px-2 py-1.5 text-right">{r.withdrawal ? inr(r.withdrawal) : ""}</td>
                    <td className="px-5 py-1.5 text-xs">
                      {r.reconciledOn ? (
                        <span className="flex items-center gap-2">
                          <Pill tone="success">{r.reconciledOn}</Pill>
                          <button type="button" className="text-error" onClick={() => tick([r.id], null, "Unticked")}>
                            undo
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {!q.data.rows.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-on-surface-variant">
                      Everything is in the statement. 👍
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
      {matches && (
        <Modal isOpen onClose={() => setMatches(null)} title="Bank statement matched" width="max-w-4xl">
          <div className="space-y-3">
            <p className="text-sm">Lines with the same amount within 5 days of a book entry are matched. Confirm to mark them as in the statement; the rest stay for you to check.</p>
            <ul className="max-h-[55vh] overflow-auto divide-y divide-outline-variant/15 text-sm">
              {matches.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 py-1.5">
                  <span className="w-24">{m.date}</span>
                  <span className="flex-1 text-xs">{m.description}</span>
                  <span className="w-28 text-right">{m.deposit ? `+${inr(m.deposit)}` : `−${inr(m.withdrawal)}`}</span>
                  <span className="w-64 text-xs">{m.voucher ? <Pill tone="success">{m.voucher.slice(0, 40)}</Pill> : <Pill tone="warning">No match in the books</Pill>}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMatches(null)}>
                Close
              </Button>
              <Button
                disabled={!matches.some((m) => m.entryId)}
                onClick={async () => {
                  const byDate = new Map<string, string[]>();
                  for (const m of matches) if (m.entryId) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m.entryId]);
                  try {
                    for (const [d, ids] of Array.from(byDate.entries())) await accApi.reconcile(ids, d);
                    refresh();
                    setMatches(null);
                    showToast("Matched entries marked as in the statement", "success");
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                Mark {matches.filter((m) => m.entryId).length} matched
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function BankReconciliationPage() {
  return (
    <RequirePermission permission="accounts.reconcile">
      <PageHeader title="Bank Reconciliation" description="Tick the entries that appear in the bank statement (or upload the statement to match them); what is left explains the difference between the books and the bank." />
      <Bank />
    </RequirePermission>
  );
}
