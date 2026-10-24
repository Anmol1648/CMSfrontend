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
import { todayISO } from "@/lib/api/hostel";
import { WEEKDAYS, dayLabel, messApi, type Meal, type MenuRow, type Plan, type PlanInput } from "@/lib/api/mess";

function WeeklyMenu() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["mess", "menu"], queryFn: messApi.menu });
  const [week, setWeek] = useState(0);
  const [rows, setRows] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const edit = can("mess.setup");
  useEffect(() => {
    if (q.data && !dirty) {
      setRows(Object.fromEntries(q.data.rows.map((r) => [`${r.week}|${r.weekday}|${r.mealId}`, r.items])));
      setWeek((w) => w || q.data.thisWeek);
    }
  }, [q.data, dirty]);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const { weeks, meals, thisWeek } = q.data!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {weeks > 1 && <Tabs tabs={Array.from({ length: weeks }, (_, i) => ({ id: String(i + 1), label: `Week ${i + 1}${i + 1 === thisWeek ? " (this week)" : ""}` }))} activeTab={String(week)} onChange={(v) => setWeek(Number(v))} />}
        <p className="text-xs text-on-surface-variant">The menu repeats every {weeks} week(s): System Settings → Mess.</p>
        <div className="flex-1" />
        {edit && (
          <Button
            disabled={!dirty}
            onClick={async () => {
              const out: MenuRow[] = Object.entries(rows).map(([k, items]) => {
                const [w, d, mealId] = k.split("|");
                return { week: Number(w), weekday: Number(d), mealId, items: items.trim() };
              });
              try {
                await messApi.saveMenu(out.filter((r) => r.week <= weeks));
                setDirty(false);
                qc.invalidateQueries({ queryKey: ["mess", "menu"] });
                showToast("Menu saved", "success");
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save menu
          </Button>
        )}
      </div>
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="w-28 px-5 py-2">Day</th>
              {meals.map((m) => (
                <th key={m.id} className="px-2 py-2">
                  {m.name} <span className="font-normal normal-case">{m.time}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((d, i) => (
              <tr key={d} className="border-t border-outline-variant/15 align-top">
                <td className="px-5 py-2 font-semibold">{d}</td>
                {meals.map((m) => {
                  const k = `${week}|${i + 1}|${m.id}`;
                  return (
                    <td key={m.id} className="px-2 py-2">
                      {edit ? (
                        <textarea
                          className="w-full resize-y rounded-lg border border-outline-variant/30 bg-transparent px-2 py-1 text-sm"
                          rows={2}
                          maxLength={300}
                          value={rows[k] ?? ""}
                          onChange={(e) => {
                            setRows((x) => ({ ...x, [k]: e.target.value }));
                            setDirty(true);
                          }}
                        />
                      ) : (
                        rows[k] || <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Specials() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["mess", "menu"], queryFn: messApi.menu });
  const [f, setF] = useState({ date: todayISO(), mealId: "", items: "", note: "" });
  const edit = can("mess.setup") || can("mess.manage");
  if (q.isLoading) return <PageLoader />;
  const meals = q.data?.meals ?? [];
  const name = (id: string) => meals.find((m) => m.id === id)?.name ?? "";
  return (
    <div className="space-y-4">
      {edit && (
        <Card>
          <p className="mb-3 font-bold">A special menu on a date (festival, function)</p>
          <div className="grid gap-3 md:grid-cols-4">
            <Input label="Date" type="date" value={f.date} min={todayISO()} onChange={(e) => setF({ ...f, date: e.target.value })} />
            <Select label="Meal" value={f.mealId} onChange={(v) => setF({ ...f, mealId: v })} options={[{ value: "", label: "Choose…" }, ...meals.map((m) => ({ value: m.id, label: m.name }))]} />
            <Input label="Occasion" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={100} placeholder="Diwali" />
            <Input label="Menu" value={f.items} onChange={(e) => setF({ ...f, items: e.target.value })} maxLength={300} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              disabled={!f.mealId || f.items.trim().length < 2}
              onClick={async () => {
                try {
                  await messApi.saveSpecial({ ...f, note: f.note || null });
                  qc.invalidateQueries({ queryKey: ["mess", "menu"] });
                  setF({ date: todayISO(), mealId: "", items: "", note: "" });
                  showToast("Saved: it replaces the weekly menu that day", "success");
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      )}
      <Card padding="none">
        {(q.data?.specials ?? []).map((s) => (
          <div key={s.id} className="flex items-center gap-3 border-b border-outline-variant/10 px-5 py-3 text-sm last:border-0">
            <span className="w-32 font-semibold">{dayLabel(s.date)}</span>
            <Pill tone="primary">{s.note || "Special"}</Pill>
            <span className="w-24">{name(s.mealId)}</span>
            <span className="flex-1">{s.items}</span>
            {edit && (
              <button className="material-symbols-outlined text-lg text-on-surface-variant" onClick={async () => (await confirm({ title: "Remove this special menu?", message: "The weekly menu is served that day.", confirmLabel: "Remove" })) && messApi.deleteSpecial(s.id).then(() => qc.invalidateQueries({ queryKey: ["mess", "menu"] })).catch((e) => showToast(errorMessage(e), "error"))}>
                delete
              </button>
            )}
          </div>
        ))}
        {!q.data?.specials.length && <p className="px-5 py-6 text-center text-sm text-on-surface-variant">No special days coming up.</p>}
      </Card>
    </div>
  );
}

function PlanForm({ plan, meals, onClose, onSaved }: { plan: Plan | null; meals: Meal[]; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState<PlanInput>({ name: plan?.name ?? "", mealIds: plan?.mealIds ?? meals.map((m) => m.id), fee: plan?.fee ?? 0, monthly: plan?.monthly ?? 0, forBoarders: plan?.forBoarders ?? false, forWho: plan?.forWho ?? "both", isActive: plan?.isActive ?? true });
  return (
    <Modal isOpen onClose={onClose} title={plan ? `Edit ${plan.name}` : "Add a plan"}>
      <div className="space-y-3">
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Meals</p>
          <div className="flex flex-wrap gap-4">
            {meals.map((m) => (
              <Checkbox key={m.id} checked={f.mealIds.includes(m.id)} onChange={(v) => setF({ ...f, mealIds: v ? [...f.mealIds, m.id] : f.mealIds.filter((x) => x !== m.id) })} label={m.name} />
            ))}
          </div>
        </div>
        <Select label="For" value={f.forWho} onChange={(v) => setF({ ...f, forWho: v as PlanInput["forWho"] })} options={[{ value: "both", label: "Students and staff" }, { value: "students", label: "Students" }, { value: "staff", label: "Staff" }]} />
        <div className="grid grid-cols-2 gap-3">
          {f.forWho !== "staff" && <Input label="Students: ₹ per fee instalment" type="number" min={0} value={String(f.fee)} onChange={(e) => setF({ ...f, fee: Math.max(0, Number(e.target.value) || 0) })} />}
          {f.forWho !== "students" && <Input label="Staff: ₹ per month (salary)" type="number" min={0} value={String(f.monthly)} onChange={(e) => setF({ ...f, monthly: Math.max(0, Number(e.target.value) || 0) })} />}
        </div>
        {f.forWho !== "staff" && <Checkbox checked={f.forBoarders} onChange={(v) => setF({ ...f, forBoarders: v })} label="Every hostel boarder is on this plan" hint="Boarders join when they get a bed and leave when they vacate. Only one plan can be the boarders’ plan." />}
        <Checkbox checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="In use" />
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={f.name.trim().length < 2 || !f.mealIds.length}
            onClick={async () => {
              try {
                await messApi.savePlan(plan?.id ?? null, f);
                showToast("Saved", "success");
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

function Plans() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["mess", "plans"], queryFn: messApi.plans });
  const meals = useQuery({ queryKey: ["mess", "meals"], queryFn: messApi.meals });
  const [editing, setEditing] = useState<Plan | null | "new">(null);
  if (plans.isLoading || meals.isLoading) return <PageLoader />;
  const mealName = (id: string) => meals.data?.find((m) => m.id === id)?.name ?? "";
  return (
    <div className="space-y-4">
      {can("mess.setup") && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>Add a plan</Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(plans.data ?? []).map((p) => (
          <Card key={p.id} className={p.isActive ? "" : "opacity-60"}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{p.name}</p>
                <p className="text-xs text-on-surface-variant">{p.mealIds.map(mealName).join(", ")}</p>
              </div>
              {can("mess.setup") && (
                <button className="material-symbols-outlined text-lg text-on-surface-variant" onClick={() => setEditing(p)}>
                  edit
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.forBoarders && <Pill tone="primary">All boarders</Pill>}
              {p.fee > 0 && <Pill>₹{p.fee.toLocaleString("en-IN")} per instalment</Pill>}
              {p.monthly > 0 && <Pill>₹{p.monthly.toLocaleString("en-IN")} per month</Pill>}
              <Pill tone="success">{p.members} members</Pill>
            </div>
          </Card>
        ))}
      </div>
      {!plans.data?.length && <FormAlert tone="info">No plans yet.</FormAlert>}
      {editing && meals.data && <PlanForm plan={editing === "new" ? null : editing} meals={meals.data} onClose={() => setEditing(null)} onSaved={() => (setEditing(null), qc.invalidateQueries({ queryKey: ["mess"] }))} />}
    </div>
  );
}

export default function MessMenuPage() {
  const [tab, setTab] = useState("menu");
  return (
    <RequirePermission permission={["mess.setup", "mess.manage", "mess.view"]}>
      <PageHeader title="Menu & Plans" description="The weekly menu, special days, and the mess plans with their charges. Meals and their times are in Masters → Meals." />
      <Tabs className="mb-4" tabs={[{ id: "menu", label: "Weekly menu" }, { id: "special", label: "Special days" }, { id: "plans", label: "Plans" }]} activeTab={tab} onChange={setTab} />
      {tab === "menu" ? <WeeklyMenu /> : tab === "special" ? <Specials /> : <Plans />}
    </RequirePermission>
  );
}
