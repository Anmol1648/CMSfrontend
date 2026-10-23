"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { reportsApi } from "@/lib/api/reports";
import { mastersApi } from "@/lib/api/masters";
import { noticesApi } from "@/lib/api/notices";
import { alertsApi, Channel, CHANNEL_LABEL, CustomAlert, CustomInput, CustomPreview } from "@/lib/api/alerts";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const toggle = <T,>(list: T[], x: T, on: boolean) => (on ? (list.includes(x) ? list : [...list, x]) : list.filter((y) => y !== x));
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY: CustomInput = {
  name: "",
  reportKey: "",
  filters: {},
  sendTo: [],
  frequency: "weekly",
  day: 1,
  time: "08:00",
  channels: ["in_app", "email"],
  type: "messages",
  priority: "normal",
  subject: "",
  body: "",
  shortText: null,
  summarySubject: "{{alert}}: {{count}}",
  summaryBody: "{{list}}",
  repeatDays: 7,
  enabled: true,
};

/** Only the fields that are saved (the list also has the report's name, last run…). */
const inputOf = (c: CustomAlert): CustomInput => ({
  name: c.name,
  reportKey: c.reportKey,
  filters: c.filters ?? {},
  sendTo: c.sendTo,
  frequency: c.frequency,
  day: c.day,
  time: c.time,
  channels: c.channels,
  type: c.type,
  priority: c.priority,
  subject: c.subject,
  body: c.body,
  shortText: c.shortText,
  summarySubject: c.summarySubject,
  summaryBody: c.summaryBody,
  repeatDays: c.repeatDays,
  enabled: c.enabled,
});

function CustomForm({ alert, onClose }: { alert: CustomAlert | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<CustomInput>(alert ? inputOf(alert) : EMPTY);
  const [preview, setPreview] = useState<CustomPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<"subject" | "body" | "shortText" | "summarySubject" | "summaryBody">("body");
  const reports = useQuery({ queryKey: ["custom-alert-reports"], queryFn: alertsApi.customReports });
  const info = useQuery({ queryKey: ["report", v.reportKey], queryFn: () => reportsApi.get(v.reportKey), enabled: !!v.reportKey });
  const types = useQuery({ queryKey: ["master-options", "notification_type"], queryFn: () => mastersApi.options("notification_type"), staleTime: 5 * 60_000 });
  const priorities = useQuery({ queryKey: ["master-options", "alert_priority"], queryFn: () => mastersApi.options("alert_priority"), staleTime: 5 * 60_000 });
  const roles = useQuery({ queryKey: ["notice-audience-options"], queryFn: noticesApi.audienceOptions, staleTime: 5 * 60_000 });
  const r = reports.data?.find((x) => x.key === v.reportKey);
  const set = (patch: Partial<CustomInput>) => {
    setV((x) => ({ ...x, ...patch }));
    setPreview(null);
  };
  // A new report: its default filters (dates are worked out on the day it runs, so they are not kept).
  useEffect(() => {
    if (!info.data || (alert && alert.reportKey === info.data.key)) return;
    setV((x) => ({ ...x, filters: Object.fromEntries(info.data!.filters.filter((f) => f.type !== "date" && f.type !== "year" && f.value).map((f) => [f.key, f.value])) }));
  }, [info.data, alert]);
  const filters = (info.data?.filters ?? []).filter((f) => f.type !== "date");
  const dated = (info.data?.filters ?? []).filter((f) => f.type === "date");
  const perRow = r?.about === "student" ? [{ key: "parent", label: "Parents (one message each)" }, { key: "student", label: "Students (one message each)" }] : r ? [{ key: "staff", label: "The staff member (one message each)" }] : [];
  const lists = [...(r?.about === "student" ? [{ key: "class_teacher", label: "Class teacher (a list of their students)" }] : []), ...(roles.data?.roles ?? []).map((x) => ({ key: `role:${x.id}`, label: `${x.name} (a list of everyone)` }))];
  const hasList = v.sendTo.some((s) => s === "class_teacher" || s.startsWith("role:"));
  const hasRow = v.sendTo.some((s) => ["parent", "student", "staff"].includes(s));
  const fields = [...(r?.columns ?? []).map((c) => c.key), "group", "name", "school", "alert"];
  const insert = (k: string) => setV((x) => ({ ...x, [focus]: `${x[focus] ?? ""}{{${k}}}` }));
  const fail = (err: unknown) => {
    setError(errorMessage(err));
    setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
  };
  const check = async () => {
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      setPreview(await alertsApi.previewCustom(v));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await alertsApi.saveCustom(alert?.id ?? null, v);
      queryClient.invalidateQueries({ queryKey: ["custom-alerts"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={alert ? `Edit ${alert.name}` : "Add a custom alert"} width="max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          <Input label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={fieldErrors.name} placeholder="Attendance below 75% (weekly)" maxLength={100} />

          <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
            <p className={label}>1 · Who it is about (a report)</p>
            <Select
              label="Report"
              value={v.reportKey}
              onChange={(k) => set({ reportKey: k, sendTo: [], filters: {} })}
              error={fieldErrors.reportKey}
              options={[{ value: "", label: reports.data?.length ? "Choose…" : "No reports you can use" }, ...(reports.data ?? []).map((x) => ({ value: x.key, label: `${x.category}: ${x.label} (${x.about === "student" ? "students" : "staff"})` }))]}
            />
            {r && <p className="text-xs text-on-surface-variant/70">{r.description}</p>}
            {!!filters.length && <ReportFilters filters={filters} values={v.filters} onChange={(f) => set({ filters: f })} />}
            {!!dated.length && <p className="text-[11px] text-on-surface-variant/70">{dated.map((f) => f.label).join(" and ")}: worked out on the day it runs (as the report does by default, e.g. today, the start of the session).</p>}
          </div>

          {r && (
            <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
              <p className={label}>2 · Who gets told</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {perRow.map((x) => (
                  <Checkbox key={x.key} label={x.label} checked={v.sendTo.includes(x.key)} onChange={(c) => set({ sendTo: toggle(v.sendTo, x.key, c) })} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {lists.map((x) => (
                  <Checkbox key={x.key} label={x.label} checked={v.sendTo.includes(x.key)} onChange={(c) => set({ sendTo: toggle(v.sendTo, x.key, c) })} />
                ))}
              </div>
              {fieldErrors.sendTo && <p className="text-xs text-error">{fieldErrors.sendTo}</p>}
            </div>
          )}

          <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
            <p className={label}>3 · When</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="How often" value={v.frequency} onChange={(f) => set({ frequency: f as CustomInput["frequency"], day: f === "daily" ? null : 1 })} options={[{ value: "daily", label: "Every day" }, { value: "weekly", label: "Every week" }, { value: "monthly", label: "Every month" }]} />
              {v.frequency === "weekly" && <Select label="On" value={String(v.day ?? 1)} onChange={(d) => set({ day: Number(d) })} options={DAYS.map((d, i) => ({ value: String(i + 1), label: d }))} />}
              {v.frequency === "monthly" && <Select label="On day" value={String(v.day ?? 1)} onChange={(d) => set({ day: Number(d) })} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />}
              <Input label="At (24-hour)" type="time" value={v.time} onChange={(e) => set({ time: e.target.value })} error={fieldErrors.time} />
            </div>
            <Input label="Don’t tell anyone about the same student / staff member again within (days; 0 = every run)" type="number" min={0} max={365} value={String(v.repeatDays)} onChange={(e) => set({ repeatDays: Math.max(0, Number(e.target.value) || 0) })} />
          </div>

          <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
            <p className={label}>4 · How and what</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(["in_app", "email", "sms", "whatsapp"] as Channel[]).map((c) => (
                <Checkbox key={c} label={CHANNEL_LABEL[c]} checked={v.channels.includes(c)} onChange={(on) => set({ channels: toggle(v.channels, c, on) })} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Kind (people choose channels per kind)" value={v.type} onChange={(t) => set({ type: t })} options={(types.data ?? []).map((t) => ({ value: t.code ?? t.name, label: t.name }))} />
              <Select label="Priority" value={v.priority} onChange={(p) => set({ priority: p })} options={(priorities.data ?? []).map((p) => ({ value: p.code ?? p.name, label: p.name }))} />
            </div>
            {(hasRow || !hasList) && (
              <>
                <Input label="Subject / title (one message each)" value={v.subject} onFocus={() => setFocus("subject")} onChange={(e) => set({ subject: e.target.value })} error={fieldErrors.subject} maxLength={200} />
                <TextArea label="Message" rows={5} value={v.body} onFocus={() => setFocus("body")} onChange={(e) => set({ body: e.target.value })} error={fieldErrors.body} />
                <TextArea label="Short text (SMS / WhatsApp, optional)" rows={2} maxLength={480} value={v.shortText ?? ""} onFocus={() => setFocus("shortText")} onChange={(e) => set({ shortText: e.target.value || null })} />
              </>
            )}
            {hasList && (
              <>
                <Input label="Subject of the list (class teacher / role)" value={v.summarySubject} onFocus={() => setFocus("summarySubject")} onChange={(e) => set({ summarySubject: e.target.value })} error={fieldErrors.summarySubject} maxLength={200} />
                <TextArea label="The list message ({{list}} = the rows, {{count}} = how many)" rows={4} value={v.summaryBody} onFocus={() => setFocus("summaryBody")} onChange={(e) => set({ summaryBody: e.target.value })} error={fieldErrors.summaryBody} />
              </>
            )}
            {!hasRow && hasList && <p className="text-[11px] text-on-surface-variant/70">Only lists are sent; the one-message-each wording is kept for later.</p>}
          </div>
          <Checkbox label="On" hint="Off: it isn’t sent at its time (Run now still works)." checked={v.enabled} onChange={(c) => set({ enabled: c })} />
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={check} disabled={busy || !v.reportKey}>
              Check who it reaches
            </Button>
            <Button onClick={save} disabled={busy}>
              Save
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-surface-container-low p-4 space-y-2">
            <p className={label}>Fields (click to add)</p>
            <div className="flex flex-wrap gap-1.5">
              {[...fields, ...(focus.startsWith("summary") ? ["count", "list"] : [])].map((k) => (
                <button key={k} type="button" title={r?.columns.find((c) => c.key === k)?.label ?? k} onClick={() => insert(k)} className="rounded-full bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 hover:bg-primary/20">
                  {`{{${k}}}`}
                </button>
              ))}
            </div>
            {r && (
              <p className="text-[10px] text-on-surface-variant/60">
                {r.columns.map((c) => `${c.key} = ${c.label}`).join(" · ")} · group = the section
              </p>
            )}
          </div>
          {preview && (
            <div className="rounded-xl border border-outline-variant/20 p-4 space-y-2 text-sm">
              <p className={label}>If it ran now</p>
              <p>
                <b>{preview.fresh}</b> of {preview.rows} rows (the rest were told within the last {v.repeatDays} days).
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.counts).map(([k, n]) => (
                  <Pill key={k}>
                    {n} {k}
                  </Pill>
                ))}
              </div>
              {preview.sample && (
                <div className="border-t border-outline-variant/15 pt-2">
                  <p className="font-bold">{preview.sample.subject}</p>
                  <p className="whitespace-pre-line text-on-surface-variant">{preview.sample.body}</p>
                </div>
              )}
              {preview.summarySample && (
                <div className="border-t border-outline-variant/15 pt-2">
                  <p className="font-bold">{preview.summarySample.subject}</p>
                  <p className="whitespace-pre-line text-on-surface-variant text-xs">{preview.summarySample.body}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

const when = (c: CustomAlert) => `${c.frequency === "daily" ? "Every day" : c.frequency === "weekly" ? `Every ${DAYS[(c.day ?? 1) - 1]}` : `Day ${c.day} of every month`} at ${c.time}`;

function CustomAlerts() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["custom-alerts"], queryFn: alertsApi.customList });
  const [editing, setEditing] = useState<CustomAlert | "new" | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  if (!q.data) return <PageLoader />;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["custom-alerts"] });
  const flip = async (c: CustomAlert) => {
    try {
      await alertsApi.saveCustom(c.id, { ...inputOf(c), enabled: !c.enabled });
      refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const run = async (c: CustomAlert) => {
    if (!(await confirm({ title: `Run “${c.name}” now?`, message: "It sends its messages now (people told within its “don’t repeat” days are left out).", confirmLabel: "Run now" }))) return;
    setRunning(c.id);
    try {
      const r = await alertsApi.runCustom(c.id);
      showToast(`Done: ${r.result}`, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setRunning(null);
      refresh();
    }
  };
  const remove = async (c: CustomAlert) => {
    if (!(await confirm({ title: `Delete “${c.name}”?`, message: "Messages already sent stay in the log.", confirmLabel: "Delete" }))) return;
    await alertsApi.deleteCustom(c.id).catch((err) => showToast(errorMessage(err), "error"));
    refresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>Add a custom alert</Button>
      </div>
      <div className="space-y-3">
        {q.data.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center gap-4">
            <button type="button" role="switch" aria-checked={c.enabled} aria-label={`${c.name} on`} onClick={() => flip(c)} className={cn("relative w-10 h-6 rounded-full shrink-0 transition-colors", c.enabled ? "bg-primary" : "bg-outline-variant/50")}>
              <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", c.enabled ? "left-5" : "left-1")} />
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("font-extrabold", c.enabled ? "text-primary" : "text-on-surface-variant")}>{c.name}</p>
              <p className="text-xs text-on-surface-variant/80">
                {c.report} · to {c.sendToLabels.join(", ")} · {c.channels.map((x) => CHANNEL_LABEL[x]).join(", ")}
              </p>
              <p className="text-[11px] text-on-surface-variant/60">
                {when(c)}
                {c.lastRunAt ? ` · last run ${new Date(c.lastRunAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}: ${c.lastResult ?? ""}` : " · not run yet"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => run(c)} disabled={running === c.id}>
                {running === c.id ? "Running…" : "Run now"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(c)}>
                Edit
              </Button>
              <button type="button" onClick={() => remove(c)} aria-label="Delete" className="p-2 rounded-full hover:bg-surface-container-high text-error">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </Card>
        ))}
        {!q.data.length && <Card className="text-center text-sm text-on-surface-variant/70">No custom alerts yet. Add one: pick a report, who gets told and when.</Card>}
      </div>
      {editing && <CustomForm alert={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function CustomAlertsPage() {
  return (
    <RequirePermission permission="alert.custom">
      <PageHeader title="Custom Alerts" description="Your own alerts from reports: e.g. every Monday tell parents of students below 75% attendance, or send the principal a list of fee defaulters each month." />
      <CustomAlerts />
    </RequirePermission>
  );
}
