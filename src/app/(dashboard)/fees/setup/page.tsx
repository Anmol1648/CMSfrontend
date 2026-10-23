"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { academicApi } from "@/lib/api/academic";
import { mastersApi } from "@/lib/api/masters";
import { Concession, ConcessionInput, feesApi, rupees, StructureGrid } from "@/lib/api/fees";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useConfirm } from "@/components/ui/ConfirmProvider";

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// ─── Instalments ─────────────────────────────────────────────────────────────

function Instalments({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["fee-instalments", year], queryFn: () => feesApi.instalments(year) });
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const [name, setName] = useState("");
  const [due, setDue] = useState("");
  const [plan, setPlan] = useState<"monthly" | "quarterly" | "half_yearly" | "yearly">("quarterly");
  const [dueDay, setDueDay] = useState("10");
  const [copyFrom, setCopyFrom] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; dueDate: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (data: Awaited<ReturnType<typeof feesApi.instalments>>) => queryClient.setQueryData(["fee-instalments", year], data);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setErrors({});
    try {
      await fn();
      showToast(ok, "success");
      return true;
    } catch (err) {
      showToast(errorMessage(err), "error");
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
      return false;
    }
  };
  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      {!rows.length && list.data && (
        <Card>
          <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-1">Start the year</h3>
          <p className="text-sm text-on-surface-variant mb-4">Make the instalments of a plan from the first month of the year, or copy last year&apos;s instalments, amounts and concessions.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Select
              label="Plan"
              value={plan}
              onChange={(v) => setPlan(v as typeof plan)}
              options={[
                { value: "monthly", label: "Monthly (12)" },
                { value: "quarterly", label: "Quarterly (4)" },
                { value: "half_yearly", label: "Half-yearly (2)" },
                { value: "yearly", label: "Yearly (1)" },
              ]}
            />
            <Input label="Due on day of the month" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            <Button onClick={() => act(async () => set(await feesApi.generateInstalments(year, { plan, dueDay: Number(dueDay) || 10 })), "Instalments made")}>Make instalments</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-6 pt-6 border-t border-outline-variant/20">
            <div className="md:col-span-2">
              <Select label="Or copy everything from" value={copyFrom} onChange={setCopyFrom} options={[{ value: "", label: "Choose a year…" }, ...(years.data ?? []).filter((y) => y.id !== year).map((y) => ({ value: y.id, label: y.name }))]} />
            </div>
            <Button
              variant="secondary"
              disabled={!copyFrom}
              onClick={() =>
                act(async () => {
                  const r = await feesApi.copyYear(year, copyFrom);
                  showToast(`Copied ${r.instalments} instalments, ${r.amounts} amounts, ${r.concessions} concessions`, "success");
                  await queryClient.invalidateQueries({ queryKey: ["fee-instalments", year] });
                  await queryClient.invalidateQueries({ queryKey: ["fee-structure"] });
                  await queryClient.invalidateQueries({ queryKey: ["fee-concessions", year] });
                }, "Copied")
              }
            >
              Copy
            </Button>
          </div>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-3 font-bold">Instalment</th>
              <th className="px-5 py-3 font-bold">Due date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-outline-variant/10">
                <td className="px-5 py-3 font-semibold">{i.name}</td>
                <td className="px-5 py-3">{fmt(i.dueDate)}</td>
                <td className="px-5 py-3 text-right space-x-4">
                  <button type="button" onClick={() => setEditing(i)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                    Edit
                  </button>
                  {!i.paidAgainst && (
                    <button type="button" onClick={async () => (await confirm({ title: `Remove ${i.name}?`, message: "Its amounts for every class go with it.", confirmLabel: "Remove", danger: true })) && act(async () => set(await feesApi.deleteInstalment(i.id)), "Removed")} className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.data && !rows.length && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-on-surface-variant/70">
                  No instalments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-5 border-t border-outline-variant/20">
          <Input label="Add an instalment" placeholder="e.g. Quarter 1 (Apr–Jun)" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={60} />
          <Input label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} error={errors.dueDate} />
          <Button
            variant="secondary"
            disabled={!name.trim() || !due}
            onClick={async () => {
              if (await act(async () => set(await feesApi.addInstalment(year, { name: name.trim(), dueDate: due })), "Instalment added")) {
                setName("");
                setDue("");
              }
            }}
          >
            Add
          </Button>
        </div>
      </Card>

      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`Edit ${editing.name}`}>
          <div className="space-y-4">
            <Input label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={60} />
            <Input label="Due date" type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={async () => (await act(async () => set(await feesApi.updateInstalment(editing.id, { name: editing.name.trim(), dueDate: editing.dueDate })), "Saved")) && setEditing(null)}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Amounts per class ───────────────────────────────────────────────────────

function Structure({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const overview = useQuery({ queryKey: ["fee-structure", year], queryFn: () => feesApi.structureOverview(year) });
  const [classId, setClassId] = useState("");
  const grid = useQuery({ queryKey: ["fee-structure", year, classId], queryFn: () => feesApi.structure(year, classId), enabled: !!classId });
  const [cells, setCells] = useState<Record<string, string>>({});
  const [copyTo, setCopyTo] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = (h: string, i: string) => `${h}|${i}`;

  useEffect(() => {
    if (!classId && overview.data?.length) setClassId(overview.data[0].id);
  }, [overview.data, classId]);
  useEffect(() => {
    if (grid.data) setCells(Object.fromEntries(grid.data.amounts.map((a) => [key(a.feeHeadId, a.instalmentId), String(a.amount)])));
  }, [grid.data]);

  const g: StructureGrid | undefined = grid.data;
  const amount = (h: string, i: string) => Number(cells[key(h, i)] || 0);
  const total = useMemo(() => Object.values(cells).reduce((a, v) => a + (Number(v) || 0), 0), [cells]);
  const dirty = g ? total !== g.total || g.amounts.some((a) => amount(a.feeHeadId, a.instalmentId) !== a.amount) || Object.entries(cells).some(([k, v]) => Number(v) && !g.amounts.some((a) => key(a.feeHeadId, a.instalmentId) === k)) : false;

  const save = async () => {
    if (!g) return;
    setBusy(true);
    try {
      const amounts = g.heads.flatMap((h) => g.instalments.map((i) => ({ feeHeadId: h.id, instalmentId: i.id, amount: Math.max(0, Math.round(amount(h.id, i.id))) }))).filter((a) => a.amount > 0);
      queryClient.setQueryData(["fee-structure", year, classId], await feesApi.saveStructure(year, classId, amounts));
      await queryClient.invalidateQueries({ queryKey: ["fee-structure", year], exact: true });
      showToast("Fee amounts saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <Card padding="none" className="overflow-hidden h-fit">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {(overview.data ?? []).map((c) => (
              <tr key={c.id} onClick={() => setClassId(c.id)} className={`border-t border-outline-variant/10 cursor-pointer ${c.id === classId ? "bg-primary/5" : "hover:bg-surface-container-low/60"}`}>
                <td className="px-4 py-2.5 font-semibold">{c.name}</td>
                <td className="px-4 py-2.5 text-right">{c.total ? rupees(c.total) : <span className="text-on-surface-variant/50">not set</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <div className="xl:col-span-3 space-y-4">
        {g && !g.instalments.length && <FormAlert tone="warning">Make the instalments first (the Instalments tab).</FormAlert>}
        {g && g.instalments.length > 0 && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-black text-primary">{g.class.name}</h3>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCopying(true)} disabled={dirty}>
                  Copy to other classes
                </Button>
                <Button onClick={save} disabled={busy || !dirty}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                    <th className="py-2 pr-3 font-bold">Fee head</th>
                    {g.instalments.map((i) => (
                      <th key={i.id} className="py-2 px-1 font-bold text-right min-w-[90px]">
                        {i.name}
                      </th>
                    ))}
                    <th className="py-2 pl-3 font-bold text-right">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {g.heads.map((h) => (
                    <tr key={h.id} className="border-t border-outline-variant/10">
                      <td className="py-1.5 pr-3 font-semibold">
                        {h.name}
                        {h.oneTime && <span className="block text-[10px] font-normal text-on-surface-variant/60">new admissions only</span>}
                      </td>
                      {g.instalments.map((i) => (
                        <td key={i.id} className="py-1.5 px-1">
                          <input
                            type="number"
                            min={0}
                            value={cells[key(h.id, i.id)] ?? ""}
                            onChange={(e) => setCells({ ...cells, [key(h.id, i.id)]: e.target.value })}
                            placeholder="0"
                            className="w-full rounded-lg bg-surface-container-low px-2 py-2 text-right text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary/10"
                            aria-label={`${h.name}, ${i.name}`}
                          />
                        </td>
                      ))}
                      <td className="py-1.5 pl-3 text-right font-bold">{rupees(g.instalments.reduce((a, i) => a + amount(h.id, i.id), 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-outline-variant/30 font-black">
                    <td className="py-2 pr-3">Total</td>
                    {g.instalments.map((i) => (
                      <td key={i.id} className="py-2 px-1 text-right">
                        {rupees(g.heads.reduce((a, h) => a + amount(h.id, i.id), 0))}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right">{rupees(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-on-surface-variant/60 mt-3">
              Amounts in whole rupees, before concessions. Fee heads are a list in{" "}
              <Link href="/masters" className="underline">
                Configuration → Masters → Fee heads
              </Link>
              .
            </p>
          </Card>
        )}
      </div>
      {copying && g && (
        <Modal isOpen onClose={() => setCopying(false)} title={`Copy ${g.class.name}'s amounts to…`} width="max-w-lg">
          <div className="space-y-4">
            <FormAlert tone="warning">The chosen classes&apos; own amounts are replaced.</FormAlert>
            <div className="grid grid-cols-2 gap-2">
              {(overview.data ?? []).filter((c) => c.id !== classId).map((c) => (
                <Checkbox key={c.id} label={c.name} checked={copyTo.includes(c.id)} onChange={(on) => setCopyTo((l) => (on ? [...l, c.id] : l.filter((x) => x !== c.id)))} />
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCopying(false)}>
                Cancel
              </Button>
              <Button
                disabled={!copyTo.length}
                onClick={async () => {
                  try {
                    const r = await feesApi.copyStructure(year, classId, copyTo);
                    showToast(`Copied to ${r.classes} class(es)`, "success");
                    setCopying(false);
                    setCopyTo([]);
                    await queryClient.invalidateQueries({ queryKey: ["fee-structure", year] });
                  } catch (err) {
                    showToast(errorMessage(err), "error");
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Concessions ─────────────────────────────────────────────────────────────

const emptyConcession: ConcessionInput = { name: "", automatic: true, genderIds: [], casteCategoryIds: [], categoryIds: [], classIds: [], note: "", isActive: true, lines: [] };

function OptionChecks({ label, options, value, onChange }: { label: string; options: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">{label}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {options.map((o) => (
          <Checkbox key={o.id} label={o.name} checked={value.includes(o.id)} onChange={(on) => onChange(on ? [...value, o.id] : value.filter((x) => x !== o.id))} />
        ))}
      </div>
    </div>
  );
}

function ConcessionForm({ year, initial, onDone }: { year: string; initial: Concession | null; onDone: () => void }) {
  const { showToast } = useToast();
  const config = useQuery({ queryKey: ["fee-config"], queryFn: feesApi.config });
  const genders = useQuery({ queryKey: ["master-options", "gender", null, null], queryFn: () => mastersApi.options("gender") });
  const castes = useQuery({ queryKey: ["master-options", "caste_category", null, null], queryFn: () => mastersApi.options("caste_category") });
  const categories = useQuery({ queryKey: ["master-options", "student_category", null, null], queryFn: () => mastersApi.options("student_category") });
  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: () => academicApi.classOptions() });
  const [v, setV] = useState<ConcessionInput>(initial ? { ...initial, note: initial.note ?? "", lines: initial.lines.map(({ feeHeadId, kind, value }) => ({ feeHeadId, kind, value })) } : emptyConcession);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const line = (headId: string) => v.lines.find((l) => l.feeHeadId === headId);
  const setLine = (headId: string, patch: Partial<{ kind: "percent" | "amount"; value: number }> | null) =>
    setV({ ...v, lines: patch === null ? v.lines.filter((l) => l.feeHeadId !== headId) : line(headId) ? v.lines.map((l) => (l.feeHeadId === headId ? { ...l, ...patch } : l)) : [...v.lines, { feeHeadId: headId, kind: "percent", value: 100, ...patch }] });

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const input = { ...v, name: v.name.trim(), note: v.note?.trim() || null };
      if (initial) await feesApi.updateConcession(initial.id, input);
      else await feesApi.addConcession(year, input);
      showToast("Concession saved", "success");
      onDone();
    } catch (err) {
      showToast(errorMessage(err), "error");
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Name *" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} maxLength={80} placeholder="e.g. Girl students – no tuition fee" />
        <Select
          label="Applies"
          value={v.automatic ? "auto" : "manual"}
          onChange={(x) => setV({ ...v, automatic: x === "auto" })}
          options={[
            { value: "auto", label: "By itself, to the students below" },
            { value: "manual", label: "Only to students it is given to" },
          ]}
        />
      </div>
      {errors.automatic && <FormAlert>{errors.automatic}</FormAlert>}
      {v.automatic && (
        <Card className="space-y-4">
          <p className="text-xs text-on-surface-variant">A student gets it when they match every condition that has a tick (no ticks in a row = any).</p>
          <OptionChecks label="Gender" options={genders.data ?? []} value={v.genderIds} onChange={(genderIds) => setV({ ...v, genderIds })} />
          <OptionChecks label="Caste category" options={castes.data ?? []} value={v.casteCategoryIds} onChange={(casteCategoryIds) => setV({ ...v, casteCategoryIds })} />
          <OptionChecks label="Admission category" options={categories.data ?? []} value={v.categoryIds} onChange={(categoryIds) => setV({ ...v, categoryIds })} />
          <OptionChecks label="Classes" options={(classes.data ?? []).map((c) => ({ id: c.id, name: c.name }))} value={v.classIds} onChange={(classIds) => setV({ ...v, classIds })} />
        </Card>
      )}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">What it takes off *</p>
        {errors.lines && <FormAlert>{errors.lines}</FormAlert>}
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {(config.data?.heads ?? []).map((h) => {
              const l = line(h.id);
              return (
                <tr key={h.id} className="border-t border-outline-variant/10">
                  <td className="py-2">
                    <Checkbox label={h.name} checked={!!l} onChange={(on) => setLine(h.id, on ? {} : null)} />
                  </td>
                  <td className="py-2 w-40">
                    {l && <Select value={l.kind} onChange={(kind) => setLine(h.id, { kind: kind as "percent" | "amount" })} options={[{ value: "percent", label: "Percent" }, { value: "amount", label: "₹ per instalment" }]} />}
                  </td>
                  <td className="py-2 w-32 pl-2">{l && <Input type="number" min={0} max={l.kind === "percent" ? 100 : undefined} value={String(l.value)} onChange={(e) => setLine(h.id, { value: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      <Input label="Note" value={v.note ?? ""} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={300} />
      <Checkbox label="In use" checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button disabled={busy || !v.name.trim() || !v.lines.length} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Concessions({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["fee-concessions", year], queryFn: () => feesApi.concessions(year) });
  const [editing, setEditing] = useState<Concession | "new" | null>(null);
  const describe = (l: Concession["lines"][number]) => `${l.feeHead?.name}: ${l.kind === "percent" ? `${l.value}%` : `${rupees(l.value)} per instalment`}`;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>Add concession</Button>
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-3 font-bold">Concession</th>
              <th className="px-5 py-3 font-bold">Applies</th>
              <th className="px-5 py-3 font-bold">Takes off</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((c) => (
              <tr key={c.id} onClick={() => setEditing(c)} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer">
                <td className="px-5 py-3">
                  <p className="font-semibold">
                    {c.name} {!c.isActive && <Pill>Not in use</Pill>}
                  </p>
                  {c.note && <p className="text-xs text-on-surface-variant">{c.note}</p>}
                </td>
                <td className="px-5 py-3">{c.automatic ? <Pill tone="primary">Automatic</Pill> : <span>Given to {c.students} student(s)</span>}</td>
                <td className="px-5 py-3 text-xs">{c.lines.map(describe).join(" · ")}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!(await confirm({ title: `Remove "${c.name}"?`, message: "The concession is deleted for this year.", confirmLabel: "Remove", danger: true }))) return;
                      try {
                        await feesApi.deleteConcession(c.id);
                        await queryClient.invalidateQueries({ queryKey: ["fee-concessions", year] });
                      } catch (err) {
                        showToast(errorMessage(err), "error");
                      }
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {list.data && !list.data.length && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant/70">
                  No concessions this year.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>
      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={editing === "new" ? "Add concession" : `Edit ${editing.name}`} width="max-w-3xl">
          <ConcessionForm
            year={year}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              queryClient.invalidateQueries({ queryKey: ["fee-concessions", year] });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Setup() {
  const [year, setYear] = useState("");
  const [tab, setTab] = useState("instalments");
  return (
    <>
      <PageHeader
        title="Fee setup"
        description="For each academic year: the instalments, what every class pays per fee head, and the concessions. Fine, part payment and receipt rules are in System Settings → Fees."
      />
      <div className="max-w-xs mb-4">
        <YearSelect value={year} onChange={setYear} />
      </div>
      <Tabs
        tabs={[
          { id: "instalments", label: "Instalments" },
          { id: "structure", label: "Amounts per class" },
          { id: "concessions", label: "Concessions" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <div className="mt-6">{year && (tab === "instalments" ? <Instalments year={year} /> : tab === "structure" ? <Structure year={year} /> : <Concessions year={year} />)}</div>
    </>
  );
}

export default function FeeSetupPage() {
  return (
    <RequirePermission permission="fee.setup">
      <Setup />
    </RequirePermission>
  );
}
