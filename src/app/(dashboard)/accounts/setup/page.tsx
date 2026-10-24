"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { accApi, Group, inr, Ledger, Nature } from "@/lib/api/accounts";

const NATURE: Record<Nature, string> = { asset: "Assets", liability: "Liabilities and funds", income: "Income", expense: "Expenses" };

function LedgerForm({ l, groups, onClose }: { l: Ledger | null; groups: Group[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [f, setF] = useState({ name: l?.name ?? "", groupId: l?.groupId ?? "", code: l?.code ?? "", kind: l?.kind ?? "other", bank: l?.details.bank ?? "", accountNo: l?.details.accountNo ?? "", ifsc: l?.details.ifsc ?? "", branch: l?.details.branch ?? "", isDefault: l?.isDefault ?? false, isActive: l?.isActive ?? true });
  return (
    <Modal isOpen onClose={onClose} title={l ? `Change ${l.name}` : "New ledger"} width="max-w-xl">
      <div className="space-y-3">
        <Input label="Name" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} maxLength={100} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Under group" value={f.groupId} onChange={(v) => setF((x) => ({ ...x, groupId: v }))} options={[{ value: "", label: "Choose…" }, ...groups.map((g) => ({ value: g.id, label: `${g.name} (${NATURE[g.nature]})` }))]} />
          <Select label="Kind" value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v as "cash" | "bank" | "other" }))} options={[{ value: "other", label: "Ordinary ledger" }, { value: "bank", label: "Bank account" }, { value: "cash", label: "Cash" }]} />
        </div>
        {f.kind === "bank" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Bank" value={f.bank} onChange={(e) => setF((x) => ({ ...x, bank: e.target.value }))} />
            <Input label="Account no." value={f.accountNo} onChange={(e) => setF((x) => ({ ...x, accountNo: e.target.value }))} />
            <Input label="IFSC" value={f.ifsc} onChange={(e) => setF((x) => ({ ...x, ifsc: e.target.value }))} />
            <Input label="Branch" value={f.branch} onChange={(e) => setF((x) => ({ ...x, branch: e.target.value }))} />
            <Checkbox checked={f.isDefault} onChange={(c) => setF((x) => ({ ...x, isDefault: c }))} label="Fees paid other than in cash go here" />
          </div>
        )}
        <Checkbox checked={f.isActive} onChange={(c) => setF((x) => ({ ...x, isActive: c }))} label="In use" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={f.name.trim().length < 2 || !f.groupId}
            onClick={async () => {
              try {
                await accApi.saveLedger(l?.id ?? null, { name: f.name.trim(), groupId: f.groupId, code: f.code || null, kind: f.kind as "cash" | "bank" | "other", details: f.kind === "bank" ? { bank: f.bank, accountNo: f.accountNo, ifsc: f.ifsc, branch: f.branch } : {}, isDefault: f.isDefault, isActive: f.isActive });
                queryClient.invalidateQueries({ queryKey: ["accounts"] });
                showToast("Saved", "success");
                onClose();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Chart() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["accounts", "chart"], queryFn: accApi.chart });
  const [edit, setEdit] = useState<Ledger | null | undefined>(undefined);
  const [group, setGroup] = useState({ name: "", nature: "expense" as Nature, parentId: "" });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const { groups, ledgers } = q.data!;
  return (
    <div className="space-y-4">
      {can("accounts.setup") && (
        <Card padding="sm">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="New group" value={group.name} onChange={(e) => setGroup((x) => ({ ...x, name: e.target.value }))} className="max-w-xs" placeholder="Hostel expenses" />
            <Select className="max-w-[12rem]" label="Kind" value={group.nature} onChange={(v) => setGroup((x) => ({ ...x, nature: v as Nature }))} options={(Object.keys(NATURE) as Nature[]).map((k) => ({ value: k, label: NATURE[k] }))} />
            <Select className="max-w-xs" label="Inside (optional)" value={group.parentId} onChange={(v) => setGroup((x) => ({ ...x, parentId: v }))} options={[{ value: "", label: "Top level" }, ...groups.filter((g) => g.nature === group.nature).map((g) => ({ value: g.id, label: g.name }))]} />
            <Button variant="secondary" disabled={group.name.trim().length < 2} onClick={async () => { try { await accApi.saveGroup(null, { name: group.name.trim(), nature: group.nature, parentId: group.parentId || null }); setGroup({ name: "", nature: group.nature, parentId: "" }); queryClient.invalidateQueries({ queryKey: ["accounts", "chart"] }); } catch (e) { showToast(errorMessage(e), "error"); } }}>
              Add group
            </Button>
            <span className="flex-1" />
            <Button onClick={() => setEdit(null)}>
              <span className="material-symbols-outlined text-lg">add</span> New ledger
            </Button>
          </div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(NATURE) as Nature[]).map((n) => (
          <Card key={n} padding="sm">
            <p className="font-extrabold mb-2">{NATURE[n]}</p>
            {groups.filter((g) => g.nature === n).map((g) => (
              <div key={g.id} className="mb-2">
                <p className="text-xs font-bold text-on-surface-variant">
                  {g.parentId ? "↳ " : ""}
                  {g.name}
                </p>
                <ul className="text-sm pl-3">
                  {ledgers.filter((l) => l.groupId === g.id).map((l) => (
                    <li key={l.id} className="flex items-center gap-2 py-0.5">
                      <button type="button" disabled={!can("accounts.setup")} onClick={() => setEdit(l)} className="flex-1 text-left hover:text-primary">
                        {l.name}
                      </button>
                      {l.kind !== "other" && <Pill tone="primary">{l.kind}</Pill>}
                      {l.isDefault && <Pill tone="success">Fees go here</Pill>}
                      {l.systemKey && <Pill>auto</Pill>}
                      {!l.isActive && <Pill>off</Pill>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        ))}
      </div>
      <p className="text-xs text-on-surface-variant">“auto” ledgers are posted to by the software (fees by head, salaries, PF, store purchases, vendors…): rename them freely.</p>
      {edit !== undefined && <LedgerForm l={edit} groups={groups} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

function Openings({ mode }: { mode: "openings" | "budgets" }) {
  const { showToast } = useToast();
  const chart = useQuery({ queryKey: ["accounts", "chart"], queryFn: accApi.chart });
  const yrs = useQuery({ queryKey: ["accounts", "years"], queryFn: accApi.years });
  const [year, setYear] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const y = yrs.data?.find((x) => x.start === year) ?? yrs.data?.[0];
  useEffect(() => {
    if (y) setVals(Object.fromEntries(Object.entries(mode === "openings" ? y.openings : y.budgets).map(([k, v]) => [k, String(v)])));
  }, [y, mode]);
  if (chart.isLoading || yrs.isLoading) return <PageLoader />;
  const show = (chart.data?.ledgers ?? []).filter((l) => (mode === "openings" ? l.nature === "asset" || l.nature === "liability" : l.nature === "expense"));
  const diff = Object.values(vals).reduce((a, v) => a + (Number(v) || 0), 0);
  return (
    <div className="space-y-3 max-w-3xl">
      <Select className="max-w-xs" label="Financial year" value={y?.start ?? ""} onChange={setYear} options={(yrs.data ?? []).map((x) => ({ value: x.start, label: `${x.start} – ${x.end}${x.status === "closed" ? " (closed)" : ""}` }))} />
      <p className="text-xs text-on-surface-variant">{mode === "openings" ? "Balances at the start of the year: a debit as a plus (cash, bank, assets), a credit as a minus (funds, amounts owed). The total must be zero." : "How much each expense may take this year."}</p>
      <Card padding="none">
        <table className="w-full text-sm">
          <tbody>
            {show.map((l) => (
              <tr key={l.id} className="border-t border-outline-variant/15">
                <td className="px-5 py-1.5">{l.name}</td>
                <td className="px-5 py-1.5 w-48">
                  <input type="number" step="0.01" value={vals[l.id] ?? ""} disabled={y?.status === "closed"} onChange={(e) => setVals((x) => ({ ...x, [l.id]: e.target.value }))} className="w-full rounded-lg bg-surface-container-low px-2 py-1 text-right" aria-label={l.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex items-center justify-between">
        {mode === "openings" ? <p className={Math.abs(diff) > 0.5 ? "text-error font-bold text-sm" : "text-emerald-700 text-sm font-bold"}>{Math.abs(diff) > 0.5 ? `Out by ${inr(diff)}` : "Agrees"}</p> : <span />}
        <Button
          disabled={!y || y.status === "closed"}
          onClick={async () => {
            const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => v !== "" && Number(v)).map(([k, v]) => [k, Number(v)]));
            try {
              if (mode === "openings") {
                const r = await accApi.saveOpenings(y!.start, clean);
                showToast(Math.abs(r.difference) > 0.5 ? `Saved, but out by ${inr(r.difference)}` : "Saved", Math.abs(r.difference) > 0.5 ? "error" : "success");
              } else {
                await accApi.saveBudgets(y!.start, clean);
                showToast("Saved", "success");
              }
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function Years() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["accounts", "years"], queryFn: accApi.years });
  if (q.isLoading) return <PageLoader />;
  return (
    <Card padding="none" className="max-w-2xl">
      <ul className="divide-y divide-outline-variant/15 text-sm">
        {(q.data ?? []).map((y) => (
          <li key={y.id} className="flex items-center gap-3 px-5 py-3">
            <span className="flex-1 font-bold">
              {y.start} – {y.end}
            </span>
            {y.status === "closed" ? (
              <Pill>Closed {y.closedAt ? new Date(y.closedAt).toLocaleDateString("en-IN") : ""}</Pill>
            ) : (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!(await confirm({ title: `Close ${y.start} – ${y.end}?`, message: "The year is locked: no voucher can be added or changed in it. Balances of assets and liabilities carry forward, and the surplus goes into the general fund.", confirmLabel: "Close the year", danger: true }))) return;
                  try {
                    await accApi.closeYear(y.start);
                    queryClient.invalidateQueries({ queryKey: ["accounts"] });
                    showToast("Closed", "success");
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                Close the year
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Setup() {
  const { can } = useAuth();
  const tabs = [{ id: "chart", label: "Chart of accounts" }, ...(can("accounts.setup") ? [{ id: "openings", label: "Opening balances" }, { id: "budgets", label: "Budgets" }] : []), ...(can("accounts.close") ? [{ id: "years", label: "Financial years" }] : [])];
  const [tab, setTab] = useState("chart");
  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab === "chart" && <Chart />}
      {tab === "openings" && <Openings mode="openings" />}
      {tab === "budgets" && <Openings mode="budgets" />}
      {tab === "years" && <Years />}
    </div>
  );
}

export default function AccountSetupPage() {
  return (
    <RequirePermission permission={["accounts.setup", "accounts.close"]}>
      <PageHeader title="Chart of Accounts" description="Groups and ledgers (bank accounts included), opening balances, budgets and closing the financial year." />
      <Setup />
    </RequirePermission>
  );
}
