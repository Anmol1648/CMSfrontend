"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { inr, Line, payrollApi, SalaryRow } from "@/lib/api/payroll";
import { SalaryLines } from "@/components/payroll/SalaryLines";

type Doc = { key: string; params: Record<string, string>; title: string };
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function SalaryForm({ staffId, onSaved }: { staffId: string; onSaved: () => void }) {
  const { showToast } = useToast();
  const heads = useQuery({ queryKey: ["payroll", "heads"], queryFn: payrollApi.heads });
  const structures = useQuery({ queryKey: ["payroll", "structures"], queryFn: payrollApi.structures });
  const q = useQuery({ queryKey: ["payroll", "salary", staffId], queryFn: () => payrollApi.salary(staffId) });
  const cur = q.data?.history[0];
  const [f, setF] = useState({ structureId: "", effectiveFrom: today(), basic: "", tds: "0", pf: true, esi: true, esiNumber: "", reason: "revision" as "new" | "revision" | "increment", note: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [preview, setPreview] = useState<{ gross: number } | null>(null);
  useEffect(() => {
    if (!q.data) return;
    if (cur) {
      setF((x) => ({ ...x, structureId: cur.structureId ?? "", basic: String(cur.basic), tds: String(cur.tdsMonthly), pf: cur.pf, esi: cur.esi, esiNumber: cur.esiNumber ?? "", reason: "revision" }));
      setLines(cur.lines);
    } else setF((x) => ({ ...x, reason: "new" }));
  }, [q.data, cur]);
  useEffect(() => {
    const b = Number(f.basic);
    if (!(b > 0)) return setPreview(null);
    const t = setTimeout(() => payrollApi.preview(b, lines).then(setPreview).catch(() => setPreview(null)), 300);
    return () => clearTimeout(t);
  }, [f.basic, lines]);
  if (q.isLoading || heads.isLoading) return <PageLoader />;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Structure"
          value={f.structureId}
          onChange={(v) => {
            setF((x) => ({ ...x, structureId: v }));
            const s = structures.data?.find((x) => x.id === v);
            if (s) setLines(s.lines);
          }}
          options={[{ value: "", label: "Custom" }, ...(structures.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))]}
        />
        <Input label="Basic (₹ a month)" type="number" min={0} value={f.basic} onChange={(e) => setF((x) => ({ ...x, basic: e.target.value }))} />
        <Input label="From" type="date" value={f.effectiveFrom} onChange={(e) => setF((x) => ({ ...x, effectiveFrom: e.target.value }))} />
      </div>
      <SalaryLines heads={heads.data?.heads ?? []} lines={lines} setLines={setLines} />
      <div className="grid gap-3 sm:grid-cols-3 items-end">
        <Input label="TDS a month (₹)" type="number" min={0} value={f.tds} onChange={(e) => setF((x) => ({ ...x, tds: e.target.value }))} />
        <Input label="ESI IP number" value={f.esiNumber} onChange={(e) => setF((x) => ({ ...x, esiNumber: e.target.value }))} maxLength={30} />
        <Select label="Reason" value={f.reason} onChange={(v) => setF((x) => ({ ...x, reason: v as typeof f.reason }))} options={[{ value: "new", label: "New salary" }, { value: "revision", label: "Revision / correction" }, { value: "increment", label: "Increment" }]} />
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox checked={f.pf} onChange={(c) => setF((x) => ({ ...x, pf: c }))} label="PF applies" />
        <Checkbox checked={f.esi} onChange={(c) => setF((x) => ({ ...x, esi: c }))} label="ESI applies (when gross is under the limit)" />
      </div>
      <Input label="Note (optional)" value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} maxLength={300} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-extrabold">Gross a month: {preview ? inr(preview.gross) : "—"}</p>
        <Button
          disabled={!(Number(f.basic) > 0)}
          onClick={async () => {
            try {
              const r = await payrollApi.saveSalary(staffId, { structureId: f.structureId || null, effectiveFrom: f.effectiveFrom, basic: Number(f.basic), lines, tdsMonthly: Number(f.tds) || 0, pf: f.pf, esi: f.esi, esiNumber: f.esiNumber || null, reason: f.reason, note: f.note || null });
              showToast(r.arrears ? `Saved. Arrears of ${inr(r.arrears)} go into the next payroll.` : "Saved", "success");
              onSaved();
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Save salary
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant">A change keeps the old salary in history. A date before finalised months gives arrears in the next payroll.</p>
    </div>
  );
}

function StaffDrawer({ row, onClose, onDoc }: { row: SalaryRow; onClose: () => void; onDoc: (d: Doc) => void }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["payroll", "salary", row.staffId], queryFn: () => payrollApi.salary(row.staffId) });
  const [lastDay, setLastDay] = useState(today());
  const [purpose, setPurpose] = useState("");
  return (
    <Drawer isOpen onClose={onClose} title={`${row.name} · ${row.employeeCode}`} width="max-w-3xl">
      <div className="space-y-5">
        {q.data && (
          <p className="text-xs text-on-surface-variant">
            Bank {q.data.staff.bank ?? "not set"} · PAN {q.data.staff.pan ?? "—"} · UAN {q.data.staff.uan ?? "—"} (Staff profile)
          </p>
        )}
        <Card padding="sm">
          <p className="font-bold mb-3">{row.salary ? "Change the salary" : "Set the salary"}</p>
          <SalaryForm staffId={row.staffId} onSaved={() => queryClient.invalidateQueries({ queryKey: ["payroll"] })} />
        </Card>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">History</p>
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {(q.data?.history ?? []).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-28">{new Date(`${h.effectiveFrom}T00:00:00`).toLocaleDateString("en-IN")}</span>
                <span className="flex-1">
                  Basic {inr(h.basic)} · gross {inr(h.gross)} {h.note ? <span className="text-xs text-on-surface-variant">· {h.note}</span> : null}
                </span>
                <Pill tone={h.reason === "increment" ? "success" : "neutral"}>{h.reason}</Pill>
                {h.reason === "increment" && (
                  <Button variant="tertiary" onClick={() => onDoc({ key: "increment_letter", params: { salary: h.id }, title: `Increment letter · ${row.name}` })}>
                    Letter
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <Card padding="sm">
          <p className="font-bold mb-2">Letters</p>
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Salary certificate: for" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="a home loan" className="max-w-xs" />
            <Button variant="secondary" disabled={!row.salary} onClick={() => onDoc({ key: "salary_certificate", params: { staff: row.staffId, purpose }, title: `Salary certificate · ${row.name}` })}>
              Salary certificate
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Input label="Leaving: last working day" type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} className="max-w-xs" />
            <Button variant="secondary" disabled={!row.salary} onClick={() => onDoc({ key: "settlement", params: { staff: row.staffId, lastDay }, title: `Full and final settlement · ${row.name}` })}>
              Full and final settlement
            </Button>
          </div>
        </Card>
      </div>
    </Drawer>
  );
}

function Increments({ rows, onClose }: { rows: SalaryRow[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [picked, setPicked] = useState<Set<string>>(new Set(rows.filter((r) => r.salary).map((r) => r.staffId)));
  const [f, setF] = useState({ date: `${today().slice(0, 4)}-04-01`, percent: "5", amount: "0", note: "" });
  return (
    <Modal isOpen onClose={onClose} title="Increments" width="max-w-3xl">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="From" type="date" value={f.date} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} />
          <Input label="Basic up by %" type="number" min={0} value={f.percent} onChange={(e) => setF((x) => ({ ...x, percent: e.target.value }))} />
          <Input label="and / or ₹" type="number" min={0} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} />
          <Input label="Note" value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} placeholder="Annual increment" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Checkbox checked={picked.size === rows.filter((r) => r.salary).length} onChange={(c) => setPicked(new Set(c ? rows.filter((r) => r.salary).map((r) => r.staffId) : []))} label={`${picked.size} staff ticked`} />
        </div>
        <ul className="max-h-[45vh] overflow-auto divide-y divide-outline-variant/15 text-sm">
          {rows
            .filter((r) => r.salary)
            .map((r) => (
              <li key={r.staffId} className="flex items-center gap-3 py-1.5">
                <input type="checkbox" className="accent-[#1A365D]" checked={picked.has(r.staffId)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(r.staffId)) n.delete(r.staffId); else n.add(r.staffId); return n; })} aria-label={`Tick ${r.name}`} />
                <span className="flex-1">
                  {r.name} <span className="text-xs text-on-surface-variant">· {r.designation}</span>
                </span>
                <span className="text-xs">basic {inr(r.salary!.basic)} → {inr(Math.round(r.salary!.basic * (1 + (Number(f.percent) || 0) / 100) + (Number(f.amount) || 0)))}</span>
              </li>
            ))}
        </ul>
        <p className="text-xs text-on-surface-variant">Allowances given as % of basic go up with it; fixed ones stay. A date before finalised months gives arrears in the next payroll. Print each increment letter from the staff member’s history.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!picked.size || (!(Number(f.percent) > 0) && !(Number(f.amount) > 0))}
            onClick={async () => {
              try {
                const r = await payrollApi.increments({ staffIds: Array.from(picked), effectiveFrom: f.date, percent: Number(f.percent) || 0, amount: Number(f.amount) || 0, note: f.note || null });
                queryClient.invalidateQueries({ queryKey: ["payroll"] });
                showToast(`${r.done} increment(s) given${r.arrears ? `; arrears ${inr(r.arrears)} in the next payroll` : ""}`, "success");
                onClose();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Give increments
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Salaries() {
  const q = useQuery({ queryKey: ["payroll", "salaries"], queryFn: payrollApi.salaries });
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState("all");
  const [open, setOpen] = useState<SalaryRow | null>(null);
  const [inc, setInc] = useState(false);
  const [doc, setDoc] = useState<Doc | null>(null);
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data ?? []).filter((r) => (!t || r.name.toLowerCase().includes(t) || r.employeeCode.toLowerCase().includes(t)) && (only === "all" || (only === "missing" ? !r.salary : only === "nobank" ? !r.bank : true)));
  }, [q.data, search, only]);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const total = (q.data ?? []).reduce((a, r) => a + (r.salary?.gross ?? 0), 0);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select className="max-w-xs" label="Show" value={only} onChange={setOnly} options={[{ value: "all", label: "Everyone" }, { value: "missing", label: "No salary set" }, { value: "nobank", label: "No bank account" }]} />
          <span className="flex-1 text-sm text-right">
            Monthly gross of all: <b>{inr(Math.round(total))}</b>
          </span>
          <Button onClick={() => setInc(true)}>
            <span className="material-symbols-outlined text-lg">trending_up</span> Increments
          </Button>
        </div>
      </Card>
      <Card padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="px-5 py-2">Staff</th>
              <th className="px-2 py-2">Structure</th>
              <th className="px-2 py-2 text-right">Basic</th>
              <th className="px-2 py-2 text-right">Gross</th>
              <th className="px-2 py-2">From</th>
              <th className="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staffId} onClick={() => setOpen(r)} className="border-t border-outline-variant/15 hover:bg-surface-container-low cursor-pointer">
                <td className="px-5 py-2">
                  <b>{r.name}</b>
                  <p className="text-xs text-on-surface-variant">
                    {r.employeeCode} · {r.designation}
                  </p>
                </td>
                <td className="px-2 py-2 text-xs">{r.salary?.structure ?? "—"}</td>
                <td className="px-2 py-2 text-right">{inr(r.salary?.basic)}</td>
                <td className="px-2 py-2 text-right font-bold">{inr(r.salary?.gross)}</td>
                <td className="px-2 py-2 text-xs">{r.salary ? new Date(`${r.salary.effectiveFrom}T00:00:00`).toLocaleDateString("en-IN") : ""}</td>
                <td className="px-5 py-2">
                  {!r.salary && <Pill tone="danger">No salary</Pill>} {!r.bank && <Pill tone="warning">No bank</Pill>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {open && <StaffDrawer row={open} onClose={() => setOpen(null)} onDoc={setDoc} />}
      {inc && <Increments rows={q.data ?? []} onClose={() => setInc(false)} />}
      {doc && <DocumentViewer docKey={doc.key} params={doc.params} title={doc.title} filename={`${doc.key}.pdf`} onClose={() => setDoc(null)} />}
    </div>
  );
}

export default function PayrollSalariesPage() {
  return (
    <RequirePermission permission="payroll.salary">
      <PageHeader title="Staff Salaries" description="Each staff member’s salary (from a structure, changed as needed) with its history, increments, salary certificates and the full and final settlement." />
      <Salaries />
    </RequirePermission>
  );
}
