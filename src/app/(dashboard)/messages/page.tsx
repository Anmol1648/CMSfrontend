"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { alertsApi, CHANNEL_LABEL, Delivery, SentRow } from "@/lib/api/alerts";
import { cn } from "@/lib/utils";

const STATUS: Record<SentRow["status"], { label: string; tone: "neutral" | "primary" | "warning" | "success" | "danger" }> = {
  draft: { label: "Draft", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "warning" },
  sending: { label: "Sending", tone: "primary" },
  sent: { label: "Sent", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
const DELIVERY: Record<Delivery["status"], { label: string; tone: "neutral" | "primary" | "warning" | "success" | "danger" }> = {
  queued: { label: "Waiting", tone: "warning" },
  sending: { label: "Sending", tone: "primary" },
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  skipped: { label: "Not sent", tone: "neutral" },
};
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState("");
  const q = useQuery({ queryKey: ["message", id], queryFn: () => alertsApi.message(id), refetchInterval: (x) => (x.state.data?.deliveries.some((d) => d.status === "queued" || d.status === "sending") ? 5000 : false) });
  const m = q.data;
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!m) return <PageLoader />;
  const cancel = async () => {
    if (!(await confirm({ title: "Cancel this message?", message: "It won’t be sent.", confirmLabel: "Cancel it" }))) return;
    try {
      await alertsApi.cancel(id);
      queryClient.invalidateQueries({ queryKey: ["message", id] });
      queryClient.invalidateQueries({ queryKey: ["messages-sent"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const rows = m.deliveries.filter((d) => !filter || d.status === filter);
  const count = (s: string) => m.deliveries.filter((d) => d.status === s).length;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-primary flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span> Sent messages
      </button>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-primary">{m.subject}</h2>
            <p className="text-sm text-on-surface-variant/70">
              To {m.audience} · {m.channels.map((c) => CHANNEL_LABEL[c]).join(", ")} · {m.status === "scheduled" ? `goes ${when(m.sendAt)}` : when(m.sentAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Pill>
            {m.status === "scheduled" && (
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm whitespace-pre-line text-on-surface-variant">{m.body}</p>
        {(m.attachments.length > 0 || m.reportCard) && (
          <p className="text-xs text-on-surface-variant/70">
            Attached: {[...m.attachments.map((a) => a.name), ...(m.reportCard ? ["each child’s report card"] : [])].join(", ")}
          </p>
        )}
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["sent", "queued", "failed", "skipped"] as const).map((s) => (
          <Card key={s} padding="sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{DELIVERY[s].label}</p>
            <p className={cn("text-2xl font-extrabold", s === "failed" && count(s) ? "text-error" : "text-primary")}>{count(s)}</p>
          </Card>
        ))}
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">Who got it</h3>
          <Select value={filter} onChange={setFilter} className="w-44 ml-auto" options={[{ value: "", label: "Everyone" }, ...(["sent", "queued", "failed", "skipped"] as const).map((s) => ({ value: s, label: DELIVERY[s].label }))]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                <th className="px-5 py-2 font-bold">Person</th>
                <th className="px-5 py-2 font-bold">Channel</th>
                <th className="px-5 py-2 font-bold">Status</th>
                <th className="px-5 py-2 font-bold">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-outline-variant/10">
                  <td className="px-5 py-2">
                    <p className="font-semibold">{d.recipientName}</p>
                    <p className="text-[10px] text-on-surface-variant/60">
                      {d.recipientKind}
                      {d.address ? ` · ${d.address}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-2 text-xs">{CHANNEL_LABEL[d.channel]}</td>
                  <td className="px-5 py-2">
                    <Pill tone={DELIVERY[d.status].tone}>{DELIVERY[d.status].label}</Pill>
                    {d.read && <span className="ml-2 text-[10px] font-bold text-emerald-700">read</span>}
                  </td>
                  <td className="px-5 py-2 text-xs text-on-surface-variant/80">{d.reason ?? (d.sentAt ? when(d.sentAt) : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="px-5 py-6 text-sm text-on-surface-variant/70">Nobody here.</p>}
        </div>
      </Card>
    </div>
  );
}

function Sent() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = useAuth();
  const open = params.get("open");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: ["messages-sent", page, search, status], queryFn: () => alertsApi.sent({ page, search: search || undefined, status: status || undefined }), placeholderData: keepPreviousData, enabled: !open });
  if (open) return <Detail id={open} onBack={() => router.push("/messages")} />;
  const d = q.data;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Input label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Subject or who it went to" className="sm:w-72" />
        <Select label="Status" value={status} onChange={(s) => { setStatus(s); setPage(1); }} className="w-full sm:w-44" options={[{ value: "", label: "All" }, { value: "sent", label: "Sent" }, { value: "scheduled", label: "Scheduled" }, { value: "cancelled", label: "Cancelled" }]} />
        {can("message.send") && (
          <Link href="/messages/compose" className="sm:ml-auto">
            <Button>Compose</Button>
          </Link>
        )}
      </Card>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Message</th>
                  <th className="px-5 py-3 font-bold">When</th>
                  <th className="px-5 py-3 font-bold">Reached</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((m) => (
                  <tr key={m.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low cursor-pointer" onClick={() => router.push(`/messages?open=${m.id}`)}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-primary">{m.subject}</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        To {m.audience} · {m.channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
                        {m.by ? ` · by ${m.by}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">{when(m.status === "scheduled" ? m.sendAt : m.sentAt)}</td>
                    <td className="px-5 py-3 text-xs">
                      {m.recipients} people{m.counts.failed ? <span className="text-error font-bold"> · {m.counts.failed} failed</span> : null}
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.rows.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">No messages yet.</p>}
          </div>
        </Card>
      )}
      {d && d.pages > 1 && <Pagination currentPage={page} totalPage={d.pages} onPageChange={setPage} />}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Sent Messages" description="Messages sent from Compose: who they reached, on which channel, and who has read them." />
      <Suspense fallback={<PageLoader />}>
        <Sent />
      </Suspense>
    </>
  );
}
