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
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { AlertInput, AlertRow, alertsApi, Channel, CHANNEL_LABEL } from "@/lib/api/alerts";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const toggle = <T,>(list: T[], x: T, on: boolean) => (on ? (list.includes(x) ? list : [...list, x]) : list.filter((y) => y !== x));

function AlertEditor({ alertKey, onClose }: { alertKey: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["alert", alertKey], queryFn: () => alertsApi.alert(alertKey) });
  const priorities = useQuery({ queryKey: ["master-options", "alert_priority"], queryFn: () => mastersApi.options("alert_priority"), staleTime: 5 * 60_000 });
  const [v, setV] = useState<AlertInput | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string; shortText: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<"subject" | "body" | "shortText">("body");
  useEffect(() => {
    if (q.data) setV({ enabled: q.data.enabled, channels: q.data.channels, recipients: q.data.recipients, priority: q.data.priority, required: q.data.required, subject: q.data.subject, body: q.data.body, shortText: q.data.shortText });
  }, [q.data]);
  useEffect(() => {
    if (!v) return;
    const t = setTimeout(() => alertsApi.previewAlert(alertKey, v).then(setPreview).catch(() => null), 400);
    return () => clearTimeout(t);
  }, [v, alertKey]);
  const a = q.data;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["alerts-builtin"] });
    queryClient.invalidateQueries({ queryKey: ["alert", alertKey] });
  };
  const save = async () => {
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      await alertsApi.saveAlert(alertKey, v);
      refresh();
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!(await confirm({ title: "Back to the default?", message: "The school’s wording, channels and who gets it are replaced by the defaults.", confirmLabel: "Use the default" }))) return;
    await alertsApi.resetAlert(alertKey);
    refresh();
    onClose();
  };
  const test = async () => {
    if (!v) return;
    try {
      const r = await alertsApi.testAlert(alertKey, v);
      showToast(r.people ? `Test sent to you (${r.inApp ? "in-app" : ""}${r.inApp && r.queued ? " + " : ""}${r.queued ? "email / SMS queued" : ""})` : "You can’t be reached on these channels", r.people ? "success" : "error");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const insert = (key: string) => v && setV({ ...v, [focus]: `${v[focus]}{{${key}}}` });
  return (
    <Modal isOpen onClose={onClose} title={a ? a.label : "Alert"} width="max-w-4xl">
      {!a || !v ? (
        <PageLoader />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant/80">
              {a.description} <Pill>{a.when === "daily" ? "daily" : "when it happens"}</Pill>
            </p>
            <Checkbox label="On" hint="Off: this alert is not sent at all." checked={v.enabled} onChange={(c) => setV({ ...v, enabled: c })} />
            <div className="space-y-2">
              <p className={label}>Who gets it</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {a.recipientChoices.map((r) => (
                  <Checkbox key={r.key} label={r.label} checked={v.recipients.includes(r.key)} onChange={(c) => setV({ ...v, recipients: toggle(v.recipients, r.key, c) })} />
                ))}
              </div>
              {fieldErrors.recipients && <p className="text-xs text-error">{fieldErrors.recipients}</p>}
            </div>
            <div className="space-y-2">
              <p className={label}>Send by</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(["in_app", "email", "sms", "whatsapp"] as Channel[]).map((c) => (
                  <Checkbox key={c} label={CHANNEL_LABEL[c]} checked={v.channels.includes(c)} onChange={(on) => setV({ ...v, channels: toggle(v.channels, c, on) })} />
                ))}
              </div>
              {fieldErrors.channels && <p className="text-xs text-error">{fieldErrors.channels}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Priority" value={v.priority} onChange={(p) => setV({ ...v, priority: p })} options={(priorities.data ?? []).map((p) => ({ value: p.code ?? p.name, label: p.name }))} />
              <div className="pt-6">
                <Checkbox label="Always sent" hint="People can’t turn it off for themselves." checked={v.required} onChange={(c) => setV({ ...v, required: c })} />
              </div>
            </div>
            <Input label="Subject (email) / title (in-app)" value={v.subject} onFocus={() => setFocus("subject")} onChange={(e) => setV({ ...v, subject: e.target.value })} error={fieldErrors.subject} maxLength={200} />
            <TextArea label="Message (email / in-app)" rows={6} value={v.body} onFocus={() => setFocus("body")} onChange={(e) => setV({ ...v, body: e.target.value })} error={fieldErrors.body} />
            <TextArea label="Short text (SMS / WhatsApp)" rows={2} maxLength={480} value={v.shortText} onFocus={() => setFocus("shortText")} onChange={(e) => setV({ ...v, shortText: e.target.value })} error={fieldErrors.shortText} />
            {error && <FormAlert>{error}</FormAlert>}
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex gap-3">
                <Button variant="secondary" onClick={reset}>
                  Use the default
                </Button>
                <Button variant="secondary" onClick={test}>
                  Send me a test
                </Button>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={busy}>
                  Save
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-container-low p-4 space-y-2">
              <p className={label}>Fields (click to add)</p>
              <div className="flex flex-wrap gap-1.5">
                {a.fields.map((f) => (
                  <button key={f.key} type="button" title={`${f.label}, e.g. ${f.example}`} onClick={() => insert(f.key)} className="rounded-full bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 hover:bg-primary/20">
                    {`{{${f.key}}}`}
                  </button>
                ))}
              </div>
            </div>
            {preview && (
              <div className="rounded-xl border border-outline-variant/20 p-4 space-y-2">
                <p className={label}>Preview</p>
                <p className="text-sm font-bold">{preview.subject}</p>
                <p className="text-sm whitespace-pre-line text-on-surface-variant">{preview.body}</p>
                <p className="text-xs text-on-surface-variant/70 border-t border-outline-variant/15 pt-2">SMS: {preview.shortText}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Jobs() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["alert-jobs"], queryFn: alertsApi.jobs });
  const names: Record<string, string> = {
    attendance_absent_streak: "Absent several days in a row",
    staff_not_checked_in: "Staff not checked in",
    staff_birthday: "Staff birthdays",
    fee_due_soon: "Fee instalment due soon",
    fee_overdue: "Fees overdue",
    exam_marks_pending: "Marks entry closes tomorrow",
    enquiry_followups_due: "Follow-ups due today",
    alerts_cleanup: "Clean-up of old notifications and log",
  };
  const run = async (key: string) => {
    if (!(await confirm({ title: `Run “${names[key] ?? key}” now?`, message: "It sends its alerts now (people already alerted today are not sent again).", confirmLabel: "Run now" }))) return;
    try {
      const r = await alertsApi.runJob(key);
      showToast(`Done: ${r.result ?? "nothing to send"}`, "success");
      queryClient.invalidateQueries({ queryKey: ["alert-jobs"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Card padding="none" className="overflow-hidden">
      <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">Daily jobs</h3>
      <p className="px-5 text-xs text-on-surface-variant/70">They run once a day at the time in System Settings → Alerts.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm mt-2">
          <tbody>
            {(q.data ?? []).map((j) => (
              <tr key={j.key} className="border-t border-outline-variant/10">
                <td className="px-5 py-2.5 font-semibold">{names[j.key] ?? j.key}</td>
                <td className="px-5 py-2.5 text-xs text-on-surface-variant/70">{j.lastDay ? `${new Date(j.lastDay).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: ${j.lastResult ?? "running"}` : "not run yet"}</td>
                <td className="px-5 py-2.5 text-right">
                  {j.key !== "alerts_cleanup" && (
                    <button type="button" onClick={() => run(j.key)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                      Run now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const TYPE_NAMES: Record<string, string> = { attendance: "Attendance", fees: "Fees", exams: "Exams", leave: "Leave", notices: "Notices", admissions: "Admissions", students: "Students", staff: "Staff" };

function BuiltIn() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["alerts-builtin"], queryFn: alertsApi.builtin });
  const [open, setOpen] = useState<string | null>(null);
  if (!q.data) return <PageLoader />;
  const flip = async (a: AlertRow) => {
    try {
      const full = await alertsApi.alert(a.key);
      await alertsApi.saveAlert(a.key, { enabled: !a.enabled, channels: full.channels, recipients: full.recipients, priority: full.priority, required: full.required, subject: full.subject, body: full.body, shortText: full.shortText });
      queryClient.invalidateQueries({ queryKey: ["alerts-builtin"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const types = Array.from(new Set(q.data.map((a) => a.type)));
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        {types.map((t) => (
          <Card key={t} padding="none" className="overflow-hidden">
            <h3 className="px-5 pt-4 pb-2 text-sm font-black uppercase tracking-widest text-primary">{TYPE_NAMES[t] ?? t}</h3>
            {q.data
              .filter((a) => a.type === t)
              .map((a) => (
                <div key={a.key} className="flex items-center gap-3 px-5 py-3 border-t border-outline-variant/10">
                  <button type="button" role="switch" aria-checked={a.enabled} aria-label={`${a.label} on`} onClick={() => flip(a)} className={cn("relative w-10 h-6 rounded-full shrink-0 transition-colors", a.enabled ? "bg-primary" : "bg-outline-variant/50")}>
                    <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", a.enabled ? "left-5" : "left-1")} />
                  </button>
                  <button type="button" onClick={() => setOpen(a.key)} className="min-w-0 flex-1 text-left">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm font-bold", a.enabled ? "text-primary" : "text-on-surface-variant")}>{a.label}</span>
                      {a.when === "daily" && <Pill>daily</Pill>}
                      {a.custom && <Pill tone="primary">changed</Pill>}
                      {a.required && <Pill tone="warning">always sent</Pill>}
                    </span>
                    <span className="block text-xs text-on-surface-variant/70">
                      To {a.recipients.map((r) => a.recipientChoices.find((x) => x.key === r)?.label ?? r).join(", ") || "nobody"} · {a.channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
                    </span>
                  </button>
                  <span className="material-symbols-outlined text-on-surface-variant/50">chevron_right</span>
                </div>
              ))}
          </Card>
        ))}
      </div>
      <div>
        <Jobs />
      </div>
      {open && <AlertEditor alertKey={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <RequirePermission permission="alert.setup">
      <PageHeader title="Built-in Alerts" description="Messages the school sends by itself: absent today, fees due, results out, leave to approve… Turn each on or off and choose who gets it, how, and the wording." />
      <BuiltIn />
    </RequirePermission>
  );
}
