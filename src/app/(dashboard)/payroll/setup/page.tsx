"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Head, Line, MODES, payrollApi, Structure } from "@/lib/api/payroll";
import { SalaryLines } from "@/components/payroll/SalaryLines";

function StructureForm({ s, heads, onClose }: { s: Structure | null; heads: Head[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState(s?.name ?? "");
  const [lines, setLines] = useState<Line[]>(s?.lines ?? []);
  const [active, setActive] = useState(s?.isActive ?? true);
  return (
    <Modal isOpen onClose={onClose} title={s ? `Change “${s.name}”` : "New salary structure"} width="max-w-2xl">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Teaching (TGT)" />
        <p className="text-sm">Basic is set for each staff member; the rest follows from here:</p>
        <SalaryLines heads={heads} lines={lines} setLines={setLines} />
        <Checkbox checked={active} onChange={setActive} label="In use" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={name.trim().length < 2}
            onClick={async () => {
              try {
                queryClient.setQueryData(["payroll", "structures"], await payrollApi.saveStructure(s?.id ?? null, { name: name.trim(), lines, isActive: active }));
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

function Setup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const heads = useQuery({ queryKey: ["payroll", "heads"], queryFn: payrollApi.heads });
  const q = useQuery({ queryKey: ["payroll", "structures"], queryFn: payrollApi.structures });
  const [edit, setEdit] = useState<Structure | null | undefined>(undefined);
  if (q.isLoading || heads.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const name = (id: string) => heads.data?.heads.find((h) => h.id === id)?.name ?? "?";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          Pay heads are in{" "}
          <Link href="/masters" className="font-bold text-primary underline">
            Masters → Payroll
          </Link>
          ; PF, ESI, professional tax, days and rounding in System Settings → Payroll.
        </p>
        <Button onClick={() => setEdit(null)}>
          <span className="material-symbols-outlined text-lg">add</span> New structure
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {q.data!.map((s) => (
          <Card key={s.id} padding="sm">
            <div className="flex items-center gap-2 mb-2">
              <p className="flex-1 font-bold">{s.name}</p>
              {!s.isActive && <Pill>Not in use</Pill>}
            </div>
            <ul className="text-sm space-y-0.5">
              <li>Basic: set per staff member</li>
              {s.lines.map((l) => (
                <li key={l.headId}>
                  {name(l.headId)}: <b>{l.mode === "fixed" ? `₹${l.value}` : `${l.value}%`}</b> <span className="text-xs text-on-surface-variant">{l.mode === "fixed" ? "a month" : MODES.find((m) => m.value === l.mode)?.label.replace(/^% /, "")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="tertiary" onClick={async () => (await confirm({ title: `Remove “${s.name}”?`, message: "If staff salaries use it, it is only marked not in use.", confirmLabel: "Remove", danger: true })) && payrollApi.deleteStructure(s.id).then((d) => queryClient.setQueryData(["payroll", "structures"], d)).catch((e) => showToast(errorMessage(e), "error"))}>
                Remove
              </Button>
              <Button variant="secondary" onClick={() => setEdit(s)}>
                Change
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <p className="font-bold mb-2">Professional tax slabs (choose the state in System Settings → Payroll)</p>
        <div className="grid gap-3 md:grid-cols-3 text-xs">
          {(heads.data?.ptStates ?? []).map((p) => (
            <div key={p.value}>
              <b>{p.label}</b>
              <p className="text-on-surface-variant">{p.slabs.map((x) => `${x.upto ? `≤ ₹${x.upto}` : "above"}: ₹${x.tax}`).join(" · ")}</p>
            </div>
          ))}
        </div>
      </Card>
      {edit !== undefined && <StructureForm s={edit} heads={heads.data?.heads ?? []} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

export default function PayrollSetupPage() {
  return (
    <RequirePermission permission="payroll.setup">
      <PageHeader title="Salary Structures" description="Templates of pay heads (amounts or % of basic) for kinds of staff: TGT, PRT, non-teaching… A staff member’s salary starts from one." />
      <Setup />
    </RequirePermission>
  );
}
