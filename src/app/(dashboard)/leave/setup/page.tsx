"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MoveButtons } from "@/components/ui/MoveButtons";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { leaveApi, LeaveType, LeaveTypeInput } from "@/lib/api/leave";

const BLANK: LeaveTypeInput = {
  code: "",
  name: "",
  isActive: true,
  quota: 12,
  credit: "yearly",
  prorate: true,
  carryForward: "none",
  carryMax: null,
  halfDay: true,
  minDays: null,
  maxDays: null,
  noticeDays: 0,
  backDays: 7,
  certificateAfter: null,
  overdraw: "block",
  sandwich: false,
  paid: true,
  countsPresent: false,
  attendanceCode: "LV",
  staffTypeIds: [],
  employmentTypeIds: [],
  genderIds: [],
  approval: "default",
  isCompOff: false,
  compOffDays: null,
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const str = (v: number | null) => (v == null ? "" : String(v));

/** Tick boxes of a master's options (empty = everyone). */
function WhoMay({ master, label, value, onChange }: { master: string; label: string; value: string[]; onChange: (v: string[]) => void }) {
  const options = useQuery({ queryKey: ["master-options", master], queryFn: () => mastersApi.options(master), staleTime: 5 * 60_000 });
  return (
    <div>
      <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</span>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {(options.data ?? []).map((o) => (
          <Checkbox key={o.id} label={o.name} checked={value.includes(o.id)} onChange={(c) => onChange(c ? [...value, o.id] : value.filter((x) => x !== o.id))} />
        ))}
        {options.data && !options.data.length && <span className="text-xs text-on-surface-variant/60">No options in Masters yet.</span>}
      </div>
      <p className="text-[11px] text-on-surface-variant/60 mt-1 ml-1">{value.length ? "Only those ticked." : "None ticked: everyone."}</p>
    </div>
  );
}

function TypeForm({ initial, onClose }: { initial: LeaveType | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [t, setT] = useState<LeaveTypeInput>(initial ? (({ id: _id, sortOrder: _s, ...rest }) => rest)(initial) : BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const statuses = useQuery({ queryKey: ["master-options", "attendance_status"], queryFn: () => mastersApi.options("attendance_status"), staleTime: 5 * 60_000 });
  const set = (patch: Partial<LeaveTypeInput>) => setT((x) => ({ ...x, ...patch }));
  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      if (initial) await leaveApi.saveType(initial.id, t);
      else await leaveApi.addType(t);
      showToast(`${t.name} saved`, "success");
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const section = "text-[10px] font-black uppercase tracking-widest text-primary pt-2";
  return (
    <Modal isOpen onClose={onClose} title={initial ? `Edit ${initial.name}` : "Add a leave type"} width="max-w-3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[8rem_1fr] gap-4">
          <Input label="Code" value={t.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} maxLength={10} placeholder="CL" />
          <Input label="Name" value={t.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} placeholder="Casual Leave" />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Checkbox label="In use" checked={t.isActive} onChange={(c) => set({ isActive: c })} />
          <Checkbox label="Paid" hint="Off: leave without pay (for the salary sheet)" checked={t.paid} onChange={(c) => set({ paid: c })} />
          <Checkbox label="Counts as present (on duty)" checked={t.countsPresent} onChange={(c) => set({ countsPresent: c })} />
          <Checkbox label="Comp-off" hint="Earned by working on a day off; given in Leave Balances" checked={t.isCompOff} onChange={(c) => set({ isCompOff: c, ...(c ? { credit: "none", quota: null } : {}) })} />
        </div>

        <p className={section}>How much</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Given"
            value={t.credit}
            onChange={(v) => set({ credit: v as LeaveTypeInput["credit"], ...(v === "none" ? { quota: null } : { quota: t.quota ?? 12 }) })}
            options={[
              { value: "yearly", label: "All at the start of the leave year" },
              { value: "monthly", label: "A twelfth every month" },
              { value: "none", label: "Not given: no limit, or comp-offs only" },
            ]}
          />
          {t.credit !== "none" && <Input label="Days a year" type="number" step="0.5" min={0} value={str(t.quota)} onChange={(e) => set({ quota: num(e.target.value) })} />}
          {t.credit !== "none" && (
            <div className="flex items-end pb-3">
              <Checkbox label="Less for joining mid-year" checked={t.prorate} onChange={(c) => set({ prorate: c })} />
            </div>
          )}
          {t.isCompOff && <Input label="Each comp-off lapses after (days)" type="number" min={1} value={str(t.compOffDays)} onChange={(e) => set({ compOffDays: num(e.target.value) })} />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Left at the year end"
            value={t.carryForward}
            onChange={(v) => set({ carryForward: v as LeaveTypeInput["carryForward"] })}
            options={[
              { value: "none", label: "Lapses" },
              { value: "all", label: "All carried forward" },
              { value: "upto", label: "Carried, up to a limit" },
            ]}
          />
          {t.carryForward === "upto" && <Input label="Most days carried" type="number" step="0.5" min={0} value={str(t.carryMax)} onChange={(e) => set({ carryMax: num(e.target.value) })} />}
          <Select
            label="Asking for more than the balance"
            value={t.overdraw}
            onChange={(v) => set({ overdraw: v as LeaveTypeInput["overdraw"] })}
            options={[
              { value: "block", label: "Not allowed" },
              { value: "lwp", label: "Allowed: the extra days are without pay" },
              { value: "allow", label: "Allowed: the balance goes below zero" },
            ]}
          />
        </div>

        <p className={section}>Asking</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Input label="Ask days before" type="number" min={0} value={String(t.noticeDays)} onChange={(e) => set({ noticeDays: Number(e.target.value || 0) })} />
          <Input label="Or up to days after" type="number" min={0} value={String(t.backDays)} onChange={(e) => set({ backDays: Number(e.target.value || 0) })} />
          <Input label="Fewest days" type="number" step="0.5" min={0} value={str(t.minDays)} onChange={(e) => set({ minDays: num(e.target.value) })} placeholder="any" />
          <Input label="Most days at a time" type="number" step="0.5" min={0} value={str(t.maxDays)} onChange={(e) => set({ maxDays: num(e.target.value) })} placeholder="any" />
          <Input label="Certificate after days" type="number" step="0.5" min={0} value={str(t.certificateAfter)} onChange={(e) => set({ certificateAfter: num(e.target.value) })} placeholder="never" />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Checkbox label="Half days allowed" checked={t.halfDay} onChange={(c) => set({ halfDay: c })} />
          <Checkbox label="Sandwich rule" hint="Holidays and weekly offs between leave days count as leave" checked={t.sandwich} onChange={(c) => set({ sandwich: c })} />
        </div>

        <p className={section}>Approval and register</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Who approves"
            value={t.approval}
            onChange={(v) => set({ approval: v as LeaveTypeInput["approval"] })}
            options={[
              { value: "default", label: "As in System Settings → Leave" },
              { value: "reports_to", label: "The person they report to" },
              { value: "two_level", label: "Two steps: reports-to, then principal / office" },
              { value: "office", label: "The principal / office only" },
            ]}
          />
          <Select
            label="In the staff register it shows as"
            value={t.attendanceCode}
            onChange={(v) => set({ attendanceCode: v })}
            options={(statuses.data ?? []).filter((s) => s.code).map((s) => ({ value: s.code!, label: `${s.name} (${s.code})` }))}
          />
        </div>

        <p className={section}>Who may take it</p>
        <WhoMay master="staff_type" label="Staff type" value={t.staffTypeIds} onChange={(v) => set({ staffTypeIds: v })} />
        <WhoMay master="employment_type" label="Employment type" value={t.employmentTypeIds} onChange={(v) => set({ employmentTypeIds: v })} />
        <WhoMay master="gender" label="Gender" value={t.genderIds} onChange={(v) => set({ genderIds: v })} />

        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!t.code.trim() || t.name.trim().length < 2}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const summary = (t: LeaveType) =>
  [
    t.isCompOff ? `comp-off, lapses after ${t.compOffDays ?? "—"} days` : t.quota == null ? "no limit" : `${t.quota} days a year${t.credit === "monthly" ? " (monthly)" : ""}`,
    t.carryForward === "all" ? "all carried" : t.carryForward === "upto" ? `up to ${t.carryMax} carried` : null,
    t.noticeDays ? `${t.noticeDays} days notice` : null,
    t.maxDays != null ? `max ${t.maxDays} at a time` : null,
    t.certificateAfter != null ? `certificate after ${t.certificateAfter} days` : null,
    t.sandwich ? "sandwich" : null,
    !t.paid ? "unpaid" : null,
    t.countsPresent ? "counts as present" : null,
    t.staffTypeIds.length || t.employmentTypeIds.length || t.genderIds.length ? "only some staff" : null,
  ]
    .filter(Boolean)
    .join(" · ");

function Setup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const types = useQuery({ queryKey: ["leave-types"], queryFn: leaveApi.types });
  const [editing, setEditing] = useState<LeaveType | "new" | null>(null);
  const run = async (p: Promise<unknown>, done: string) => {
    try {
      await p;
      showToast(done, "success");
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async (t: LeaveType) => {
    if (!(await confirm({ title: `Delete ${t.name}?`, message: "Only a type nobody has taken can be deleted; a used one can be switched off instead.", confirmLabel: "Delete", danger: true }))) return;
    await run(leaveApi.removeType(t.id), `${t.name} deleted`);
  };
  return (
    <>
      <PageHeader
        title="Leave Setup"
        description="The kinds of staff leave and their rules. Who approves by default, the leave year and substitution are in System Settings → Leave."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/settings" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              System Settings
            </Link>
            <Button onClick={() => setEditing("new")}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Add leave type
            </Button>
          </div>
        }
      />
      {types.isError && <FormAlert>{errorMessage(types.error)}</FormAlert>}
      {!types.data && !types.isError && <PageLoader />}
      {types.data && (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {types.data.map((t, i) => (
                <tr key={t.id} className="border-t border-outline-variant/10 first:border-t-0">
                  <td className="px-5 py-4 w-20 font-mono font-bold text-primary">{t.code}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold">
                      {t.name} {!t.isActive && <Pill>Off</Pill>}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/70">{summary(t)}</p>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-4">
                      <MoveButtons label={t.name} position={i + 1} first={i === 0} last={i === types.data.length - 1} onMove={(d) => run(leaveApi.moveType(t.id, d), "Moved")} />
                      <button type="button" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => setEditing(t)}>
                        Edit
                      </button>
                      <button type="button" className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70" onClick={() => remove(t)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {editing && <TypeForm initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function LeaveSetupPage() {
  return (
    <RequirePermission permission="leave.setup">
      <Setup />
    </RequirePermission>
  );
}
