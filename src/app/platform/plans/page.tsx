"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { errorMessage } from "@/lib/api/client";
import { ModuleInfo, Plan, platformApi } from "@/lib/api/platform";
import { usePlatformUser } from "@/components/platform/PlatformContext";

const num = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Math.floor(Number(s)) || 0));

function PlanForm({ plan, modules, onClose, onSaved }: { plan: Plan | null; modules: ModuleInfo[]; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({ name: plan?.name ?? "", description: plan?.description ?? "", modules: plan?.modules ?? modules.map((m) => m.key), sortOrder: plan?.sortOrder ?? 0, isActive: plan?.isActive ?? true });
  const [lim, setLim] = useState({ maxStudents: String(plan?.limits.maxStudents ?? ""), aiMonthly: String(plan?.limits.aiMonthly ?? ""), storageMb: String(plan?.limits.storageMb ?? "") });
  return (
    <Modal isOpen onClose={onClose} title={plan ? `Plan: ${plan.name}` : "Add a plan"} width="max-w-3xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Standard" />
          <Input className="sm:col-span-2" label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Modules in this plan</p>
            <div className="flex gap-3 text-xs font-bold text-primary">
              <button type="button" onClick={() => setF({ ...f, modules: modules.map((m) => m.key) })}>
                All
              </button>
              <button type="button" onClick={() => setF({ ...f, modules: [] })}>
                None
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <Checkbox key={m.key} checked={f.modules.includes(m.key)} onChange={(v) => setF({ ...f, modules: v ? [...f.modules, m.key] : f.modules.filter((x) => x !== m.key) })} label={m.label} hint={m.description} />
            ))}
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">Always included: students, staff, academic set-up, attendance, users and roles, masters, settings, dashboard, documents and reports.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Students allowed" type="number" value={lim.maxStudents} onChange={(e) => setLim({ ...lim, maxStudents: e.target.value })} placeholder="no limit" />
          <Input label="AI requests a month" type="number" value={lim.aiMonthly} onChange={(e) => setLim({ ...lim, aiMonthly: e.target.value })} placeholder="no limit" />
          <Input label="File storage (MB)" type="number" value={lim.storageMb} onChange={(e) => setLim({ ...lim, storageMb: e.target.value })} placeholder="no limit" />
        </div>
        <Checkbox checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="Offered for new schools" />
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={f.name.trim().length < 2}
            onClick={async () => {
              try {
                const limits = Object.fromEntries(Object.entries({ maxStudents: num(lim.maxStudents), aiMonthly: num(lim.aiMonthly), storageMb: num(lim.storageMb) }).filter(([, v]) => v !== undefined));
                await platformApi.savePlan(plan?.id ?? null, { ...f, limits });
                showToast(plan?.schools ? "Saved. Use “Apply to its schools” to update the schools on it." : "Saved", "success");
                onSaved();
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

export default function PlansPage() {
  const { user } = usePlatformUser();
  const owner = user.role === "owner";
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans });
  const [editing, setEditing] = useState<Plan | null | "new">(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const { modules, plans } = q.data!;
  const label = (k: string) => modules.find((m) => m.key === k)?.label ?? k;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Plans</h1>
          <p className="text-sm text-on-surface-variant">What each plan includes. A school on a plan gets its modules and limits; they can still be changed for one school.</p>
        </div>
        {owner && <Button onClick={() => setEditing("new")}>Add a plan</Button>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={p.isActive ? "" : "opacity-60"}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold">{p.name}</p>
                <p className="text-sm text-on-surface-variant">{p.description}</p>
              </div>
              <Pill tone="primary">{p.schools} schools</Pill>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">{p.modules.length === modules.length ? "Every module" : p.modules.map(label).join(", ") || "Core only"}</p>
            <p className="mt-2 text-xs">
              {p.limits.maxStudents ? `${p.limits.maxStudents} students` : "Any number of students"} · {p.limits.aiMonthly ? `${p.limits.aiMonthly} AI requests/month` : "AI: no limit"} · {p.limits.storageMb ? `${p.limits.storageMb} MB files` : "files: no limit"}
            </p>
            {owner && (
              <div className="mt-3 flex flex-wrap justify-end gap-3 text-xs font-bold uppercase tracking-widest">
                {p.schools > 0 && (
                  <button
                    type="button"
                    className="text-primary"
                    onClick={async () => {
                      if (!(await confirm({ title: `Apply ${p.name} to its ${p.schools} schools?`, message: "Their modules and limits become the plan’s again (changes made for one school are replaced).", confirmLabel: "Apply" }))) return;
                      try {
                        const r = await platformApi.applyPlan(p.id);
                        showToast(`${r.schools} schools updated`, "success");
                        qc.invalidateQueries({ queryKey: ["platform"] });
                      } catch (e) {
                        showToast(errorMessage(e), "error");
                      }
                    }}
                  >
                    Apply to its schools
                  </button>
                )}
                <button
                  type="button"
                  className="text-error"
                  onClick={async () => {
                    if (!(await confirm({ title: `Delete ${p.name}?`, message: "Only a plan no school is on can be deleted.", confirmLabel: "Delete", danger: true }))) return;
                    try {
                      await platformApi.deletePlan(p.id);
                      qc.invalidateQueries({ queryKey: ["platform", "plans"] });
                    } catch (e) {
                      showToast(errorMessage(e), "error");
                    }
                  }}
                >
                  Delete
                </button>
                <button type="button" className="text-primary" onClick={() => setEditing(p)}>
                  Edit
                </button>
              </div>
            )}
          </Card>
        ))}
        {!plans.length && <FormAlert tone="info">No plans yet. Schools without a plan get every module.</FormAlert>}
      </div>
      {editing && <PlanForm plan={editing === "new" ? null : editing} modules={modules} onClose={() => setEditing(null)} onSaved={() => (setEditing(null), qc.invalidateQueries({ queryKey: ["platform", "plans"] }))} />}
    </div>
  );
}
