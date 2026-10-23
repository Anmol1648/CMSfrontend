"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { alertsApi, CHANNEL_LABEL, LogQuery, LogRow } from "@/lib/api/alerts";

const STATUS: Record<LogRow["status"], { label: string; tone: "neutral" | "primary" | "warning" | "success" | "danger" }> = {
  queued: { label: "Waiting", tone: "warning" },
  sending: { label: "Sending", tone: "primary" },
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  skipped: { label: "Not sent", tone: "neutral" },
};
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Log() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [f, setF] = useState<LogQuery>({ page: 1 });
  const set = (patch: Partial<LogQuery>) => setF((x) => ({ ...x, ...patch, page: patch.page ?? 1 }));
  const q = useQuery({ queryKey: ["alert-log", f], queryFn: () => alertsApi.log(f), placeholderData: keepPreviousData });
  const bad = useQuery({ queryKey: ["alert-bouncing"], queryFn: alertsApi.bouncing });
  const d = q.data;
  const retry = async (r: LogRow) => {
    try {
      await alertsApi.retry(r.id);
      showToast("Queued again", "success");
      queryClient.invalidateQueries({ queryKey: ["alert-log"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Input label="Search" value={f.search ?? ""} onChange={(e) => set({ search: e.target.value })} placeholder="Name, email, mobile or subject" className="sm:w-64" />
        <Select label="Alert" value={f.alert ?? ""} onChange={(alert) => set({ alert })} className="w-full sm:w-56" options={[{ value: "", label: "All" }, { value: "compose", label: "Messages (Compose)" }, ...(d?.alerts ?? []).map((a) => ({ value: a.key, label: a.label }))]} />
        <Select label="Channel" value={f.channel ?? ""} onChange={(channel) => set({ channel })} className="w-full sm:w-36" options={[{ value: "", label: "All" }, ...(["in_app", "email", "sms", "whatsapp"] as const).map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))]} />
        <Select label="Status" value={f.status ?? ""} onChange={(status) => set({ status })} className="w-full sm:w-36" options={[{ value: "", label: "All" }, ...(Object.keys(STATUS) as LogRow["status"][]).map((s) => ({ value: s, label: STATUS[s].label }))]} />
        <Input label="From" type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value })} className="sm:w-40" />
        <Input label="To" type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value })} className="sm:w-40" />
        <Button variant="secondary" className="sm:ml-auto" onClick={() => alertsApi.exportLog(f).catch((err) => showToast(errorMessage(err), "error"))}>
          Excel
        </Button>
      </Card>
      {d && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(STATUS) as LogRow["status"][]).map((s) => (
            <Card key={s} padding="sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{STATUS[s].label}</p>
              <p className="text-2xl font-extrabold text-primary">{d.counts[s] ?? 0}</p>
            </Card>
          ))}
        </div>
      )}
      {!!bad.data?.length && (
        <FormAlert tone="warning">
          These keep failing (last 30 days), correct them on the person’s record: {bad.data.map((b) => `${b.name} <${b.address}> (${b.failures})`).join(", ")}
        </FormAlert>
      )}
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">To</th>
                  <th className="px-4 py-3 font-bold">What</th>
                  <th className="px-4 py-3 font-bold">Channel</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10 align-top">
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{when(r.createdAt)}</td>
                    <td className="px-4 py-2">
                      <p className="font-semibold">{r.recipientName}</p>
                      <p className="text-[10px] text-on-surface-variant/60">
                        {r.recipientKind}
                        {r.address ? ` · ${r.address}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-bold text-primary">{r.source}</p>
                      <p className="text-xs text-on-surface-variant/80">{r.subject}</p>
                    </td>
                    <td className="px-4 py-2 text-xs">{CHANNEL_LABEL[r.channel]}</td>
                    <td className="px-4 py-2">
                      <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                      {r.reason && <p className="text-[10px] text-on-surface-variant/70 mt-1 max-w-[16rem]">{r.reason}</p>}
                      {r.status === "queued" && r.attempts > 0 && <p className="text-[10px] text-on-surface-variant/70 mt-1">try {r.attempts + 1} at {when(r.nextAttemptAt)}</p>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "failed" && (
                        <button type="button" onClick={() => retry(r)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                          Try again
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.rows.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">Nothing here.</p>}
          </div>
        </Card>
      )}
      {d && d.pages > 1 && <Pagination currentPage={f.page ?? 1} totalPage={d.pages} onPageChange={(page) => set({ page })} />}
    </div>
  );
}

export default function AlertLogPage() {
  return (
    <RequirePermission permission="alert.log">
      <PageHeader title="Alert Log" description="Every alert and message: to whom, on which channel, and whether it went (or why not)." />
      <Log />
    </RequirePermission>
  );
}
