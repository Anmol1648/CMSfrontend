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
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { inr, payrollApi, RUN, RunView, Slip, thisMonth } from "@/lib/api/payroll";
import { cn } from "@/lib/utils";

type Doc = { key: string; params: Record<string, string>; title: string };

function SlipModal({ s, onClose, onDoc }: { s: Slip; onClose: () => void; onDoc: (d: Doc) => void }) {
  const d = s.days;
  return (
    <Modal isOpen onClose={onClose} title={`${s.name} · ${s.employeeCode}`} width="max-w-3xl">
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Pill tone="primary">
            Paid {s.paidDays} of {s.totalDays} days
          </Pill>
          {d.paidLeave > 0 && <Pill>Paid leave {d.paidLeave}</Pill>}
          {d.lwp > 0 && <Pill tone="warning">Leave without pay {d.lwp}</Pill>}
          {d.absent > 0 && <Pill tone="warning">Absent {d.absent}</Pill>}
          {d.lates > 0 && <Pill>Late {d.lates}{d.latePenalty ? ` (−${d.latePenalty} day)` : ""}</Pill>}
          {d.notJoined > 0 && <Pill>Not in service {d.notJoined}</Pill>}
          {s.warnings.map((w) => (
            <Pill key={w} tone="danger">
              {w}
            </Pill>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1">Earnings</p>
            <ul className="space-y-1">
              {s.earnings.map((e, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {e.name}
                    {e.full != null && e.full !== e.amount && <span className="text-xs text-on-surface-variant"> (of {inr(e.full)})</span>}
                  </span>
                  <b>{inr(e.amount)}</b>
                </li>
              ))}
              <li className="flex justify-between border-t pt-1 font-extrabold">
                <span>Gross</span>
                <span>{inr(s.gross)}</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1">Deductions</p>
            <ul className="space-y-1">
              {s.deductions.map((e, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{e.name}</span>
                  <b>{inr(e.amount)}</b>
                </li>
              ))}
              {!s.deductions.length && <li className="text-on-surface-variant">None</li>}
              <li className="flex justify-between border-t pt-1 font-extrabold">
                <span>Total</span>
                <span>{inr(s.deducted)}</span>
              </li>
            </ul>
          </div>
        </div>
        <p className="text-lg font-extrabold">Net pay {inr(s.net)}</p>
        {(s.employer.pf || s.employer.esi) && <p className="text-xs text-on-surface-variant">School’s share: {s.employer.pf ? `PF ${inr(s.employer.pf)}` : ""} {s.employer.esi ? `ESI ${inr(s.employer.esi)}` : ""}</p>}
        <p className="text-xs text-on-surface-variant">Bank: {s.bank.bank || "—"} · {s.bank.accountNo || "no account"} · {s.bank.ifsc}</p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => onDoc({ key: "payslip", params: { slip: s.id }, title: `Payslip · ${s.name}` })}>
            <span className="material-symbols-outlined text-lg">print</span> Payslip
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Adjustments({ month, locked }: { month: string; locked: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["payroll", "adjustments", month], queryFn: () => payrollApi.adjustments(month) });
  const staff = useQuery({ queryKey: ["payroll", "salaries"], queryFn: payrollApi.salaries });
  const [f, setF] = useState({ staffId: "", kind: "earning" as "earning" | "deduction", label: "", amount: "" });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["payroll", "adjustments", month] });
  return (
    <Card>
      <p className="font-extrabold mb-1">One-time additions and deductions</p>
      <p className="text-xs text-on-surface-variant mb-3">Bonus, arrears, fines… for this month. Prepare the month again after changing them.</p>
      <ul className="divide-y divide-outline-variant/15 text-sm mb-3">
        {(q.data ?? []).map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-1.5">
            <span className="flex-1">
              <b>{a.name}</b> · {a.label} {a.source === "arrears" && <Pill tone="primary">From increment</Pill>}
            </span>
            <span className={a.kind === "earning" ? "text-emerald-700 font-bold" : "text-error font-bold"}>
              {a.kind === "earning" ? "+" : "−"}
              {inr(a.amount)}
            </span>
            {!locked && (
              <button type="button" className="text-error" aria-label="Remove" onClick={() => payrollApi.deleteAdjustment(a.id).then(refresh).catch((e) => showToast(errorMessage(e), "error"))}>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </li>
        ))}
        {!q.data?.length && <li className="py-1.5 text-on-surface-variant">None.</li>}
      </ul>
      {!locked && (
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_1fr_auto] items-end">
          <Select label="Staff member" value={f.staffId} onChange={(v) => setF((x) => ({ ...x, staffId: v }))} options={[{ value: "", label: "Choose…" }, ...(staff.data ?? []).map((s) => ({ value: s.staffId, label: `${s.name} (${s.employeeCode})` }))]} />
          <Select label="Kind" value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v as "earning" | "deduction" }))} options={[{ value: "earning", label: "Addition" }, { value: "deduction", label: "Deduction" }]} />
          <Input label="What for" value={f.label} onChange={(e) => setF((x) => ({ ...x, label: e.target.value }))} maxLength={100} placeholder="Bonus, fine…" />
          <Input label="₹" type="number" min={0} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} />
          <Button
            disabled={!f.staffId || f.label.trim().length < 2 || !(Number(f.amount) > 0)}
            onClick={async () => {
              try {
                await payrollApi.addAdjustment({ staffId: f.staffId, month, kind: f.kind, label: f.label.trim(), amount: Number(f.amount) });
                setF({ staffId: "", kind: "earning", label: "", amount: "" });
                refresh();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Add
          </Button>
        </div>
      )}
    </Card>
  );
}

function Month({ month }: { month: string }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["payroll", "run", month], queryFn: () => payrollApi.run(month) });
  const [slip, setSlip] = useState<Slip | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const act = async (fn: () => Promise<RunView>, msg: string) => {
    setBusy(true);
    try {
      const v = await fn();
      queryClient.setQueryData(["payroll", "run", month], v);
      queryClient.invalidateQueries({ queryKey: ["payroll", "runs"] });
      showToast(v.missing?.length ? `${msg}. No salary set for: ${v.missing.slice(0, 5).join(", ")}${v.missing.length > 5 ? "…" : ""}` : msg, v.missing?.length ? "error" : "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const v = q.data!;
  const st = v.run?.status;
  const t = search.trim().toLowerCase();
  const slips = v.slips.filter((s) => !t || s.name.toLowerCase().includes(t) || s.employeeCode.toLowerCase().includes(t));
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="text-xl font-extrabold">{v.label}</p>
            {v.run ? (
              <p className="text-xs text-on-surface-variant">
                Prepared by {v.run.preparedBy} on {new Date(v.run.preparedAt).toLocaleDateString("en-IN")}
                {v.run.approvedBy ? ` · approved by ${v.run.approvedBy}` : ""}
                {v.run.reopenReason ? ` · reopened: ${v.run.reopenReason}` : ""}
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant">Not prepared yet.</p>
            )}
          </div>
          {st && <Pill tone={RUN[st].tone}>{RUN[st].label}</Pill>}
          {can("payroll.run") && st !== "finalised" && (
            <Button variant={st ? "secondary" : "primary"} loading={busy} onClick={async () => (!st || (await confirm({ title: `Prepare ${v.label} again?`, message: "The payslips are worked out again from today’s salaries, attendance, leave and additions. Approval is needed again.", confirmLabel: "Prepare again" }))) && act(() => payrollApi.prepare(month), "Prepared")}>
              {st ? "Prepare again" : "Prepare payroll"}
            </Button>
          )}
          {can("payroll.approve") && st === "prepared" && <Button onClick={() => act(() => payrollApi.approve(month), "Approved")}>Approve</Button>}
          {can("payroll.approve") && st === "approved" && (
            <Button onClick={async () => (await confirm({ title: `Finalise ${v.label}?`, message: "The month is locked, loan instalments are recovered and staff see their payslips.", confirmLabel: "Finalise" })) && act(() => payrollApi.finalise(month), "Finalised: staff can see their payslips")}>
              <span className="material-symbols-outlined text-lg">lock</span> Finalise
            </Button>
          )}
          {can("payroll.approve") && st === "finalised" && (
            <Button variant="tertiary" onClick={() => setReopening(true)}>
              Reopen
            </Button>
          )}
        </div>
        {v.totals && (
          <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-5 text-sm">
            <div>
              <p className="text-xs text-on-surface-variant">Staff</p>
              <p className="text-lg font-extrabold">{v.totals.staff}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Gross</p>
              <p className="text-lg font-extrabold">{inr(Math.round(v.totals.gross))}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Deductions</p>
              <p className="text-lg font-extrabold">{inr(Math.round(v.totals.deducted))}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Net pay</p>
              <p className="text-lg font-extrabold text-primary">{inr(Math.round(v.totals.net))}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">PF / ESI (school)</p>
              <p className="text-sm font-bold">
                {inr(v.totals.pfEmployer)} / {inr(v.totals.esiEmployer)}
              </p>
            </div>
          </div>
        )}
        {v.totals && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDoc({ key: "payslip", params: { month }, title: `Payslips · ${v.label}` })}>
              All payslips
            </Button>
            {(can("payroll.view") || can("payroll.approve")) && (
              <>
                <Button variant="secondary" onClick={() => payrollApi.download(month, "bank.xlsx").catch((e) => showToast(errorMessage(e), "error"))}>
                  Bank sheet
                </Button>
                <Button variant="secondary" onClick={() => setDoc({ key: "salary_bank_letter", params: { month }, title: `Bank letter · ${v.label}` })}>
                  Bank letter
                </Button>
                <Button variant="secondary" onClick={() => payrollApi.download(month, "register.xlsx").catch((e) => showToast(errorMessage(e), "error"))}>
                  Salary register
                </Button>
                <Button variant="secondary" onClick={async () => { try { const miss = await payrollApi.pfMissing(month); await payrollApi.download(month, "pf-ecr.txt"); if (miss.length) showToast(`No UAN for: ${miss.join(", ")} (left out of the ECR)`, "error"); } catch (e) { showToast(errorMessage(e), "error"); } }}>
                  PF ECR file
                </Button>
                <Button variant="secondary" onClick={() => payrollApi.download(month, "esi.xlsx").catch((e) => showToast(errorMessage(e), "error"))}>
                  ESI sheet
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
      {(can("payroll.run") || can("payroll.approve")) && <Adjustments month={month} locked={st === "finalised"} />}
      {v.slips.length > 0 && (
        <Card padding="none">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-outline-variant/20">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a staff member" className="max-w-xs" />
            {v.totals?.warnings ? <Pill tone="warning">{v.totals.warnings} with warnings</Pill> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-5 py-2">Staff</th>
                  <th className="px-2 py-2 text-right">Paid days</th>
                  <th className="px-2 py-2 text-right">Gross</th>
                  <th className="px-2 py-2 text-right">Deductions</th>
                  <th className="px-2 py-2 text-right">Net</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {slips.map((s) => (
                  <tr key={s.id} onClick={() => setSlip(s)} className="border-t border-outline-variant/15 hover:bg-surface-container-low cursor-pointer">
                    <td className="px-5 py-2">
                      <b>{s.name}</b>
                      <p className="text-xs text-on-surface-variant">
                        {s.employeeCode} · {s.designation}
                      </p>
                    </td>
                    <td className={cn("px-2 py-2 text-right", s.paidDays < s.totalDays && "text-amber-700 font-bold")}>
                      {s.paidDays}/{s.totalDays}
                    </td>
                    <td className="px-2 py-2 text-right">{inr(s.gross)}</td>
                    <td className="px-2 py-2 text-right">{inr(s.deducted)}</td>
                    <td className="px-2 py-2 text-right font-extrabold">{inr(s.net)}</td>
                    <td className="px-5 py-2">
                      {s.warnings.map((w) => (
                        <Pill key={w} tone="danger">
                          {w}
                        </Pill>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {slip && <SlipModal s={slip} onClose={() => setSlip(null)} onDoc={(d) => { setSlip(null); setDoc(d); }} />}
      {doc && <DocumentViewer docKey={doc.key} params={doc.params} title={doc.title} filename={`${doc.key}.pdf`} onClose={() => setDoc(null)} />}
      {reopening && (
        <Modal isOpen onClose={() => setReopening(false)} title={`Reopen ${v.label}`} width="max-w-md">
          <div className="space-y-3">
            <Input label="Why (recorded)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="A staff member’s leave was missed" />
            <p className="text-xs text-on-surface-variant">Loan instalments recovered this month are put back; prepare, approve and finalise again.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReopening(false)}>
                Cancel
              </Button>
              <Button disabled={reason.trim().length < 5} onClick={async () => { await act(() => payrollApi.reopen(month, reason.trim()), "Reopened"); setReopening(false); setReason(""); }}>
                Reopen
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Payroll() {
  const runs = useQuery({ queryKey: ["payroll", "runs"], queryFn: payrollApi.runs });
  const [month, setMonth] = useState(thisMonth());
  useEffect(() => {
    if (runs.data?.length && !runs.data.some((r) => r.month === thisMonth())) setMonth(runs.data[0].month);
  }, [runs.data]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="max-w-[12rem]" />
        <div className="flex flex-wrap gap-2">
          {(runs.data ?? []).slice(0, 8).map((r) => (
            <button key={r.month} type="button" onClick={() => setMonth(r.month)} className={cn("rounded-xl px-3 py-1.5 text-xs border text-left", r.month === month ? "bg-primary text-white border-primary" : "border-outline-variant/40")}>
              <b>{r.label}</b>
              <span className="block opacity-80">
                {inr(Math.round(r.net))} · {r.status}
              </span>
            </button>
          ))}
        </div>
      </div>
      <Month key={month} month={month} />
    </div>
  );
}

export default function PayrollPage() {
  return (
    <RequirePermission permission={["payroll.run", "payroll.approve", "payroll.view"]}>
      <PageHeader title="Monthly Payroll" description="Prepare the month from salaries, attendance and leave, check each payslip, approve and finalise; then the bank sheet, payslips, PF and ESI files." />
      <Payroll />
    </RequirePermission>
  );
}
