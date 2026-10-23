"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { alertsApi, Channel, CHANNEL_LABEL, NotificationItem, Preferences, timeAgo } from "@/lib/api/alerts";
import { cn } from "@/lib/utils";

/** My notifications, and which channels I'm told on for each kind. */

function MyChoices() {
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["notification-prefs"], queryFn: () => alertsApi.preferences() });
  const [v, setV] = useState<Preferences["types"] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setV(q.data.types);
  }, [q.data]);
  if (!q.data || !v) return <PageLoader />;
  const toggle = (code: string, c: Channel) => setV(v.map((t) => (t.code !== code ? t : { ...t, muted: t.muted.includes(c) ? t.muted.filter((x) => x !== c) : [...t.muted, c] })));
  const save = async () => {
    setBusy(true);
    try {
      const r = await alertsApi.savePreferences(v.map((t) => ({ code: t.code, muted: t.muted })));
      setV(r.types);
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card padding="none" className="overflow-hidden">
      <p className="px-5 pt-4 text-sm text-on-surface-variant/80">Choose how you are told about each kind of thing. Some messages the school always sends (marked “always”).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
              <th className="px-5 py-2 font-bold">Kind</th>
              {q.data.channels.map((c) => (
                <th key={c} className="px-4 py-2 font-bold text-center">
                  {CHANNEL_LABEL[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.map((t) => (
              <tr key={t.code} className="border-t border-outline-variant/10">
                <td className="px-5 py-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-lg text-primary">{t.icon}</span>
                    {t.name}
                    {t.required && <Pill>always</Pill>}
                  </span>
                </td>
                {q.data.channels.map((c) => (
                  <td key={c} className="px-4 py-2.5 text-center">
                    <input type="checkbox" aria-label={`${t.name} by ${CHANNEL_LABEL[c]}`} checked={t.required || !t.muted.includes(c)} disabled={t.required || busy} onChange={() => toggle(t.code, c)} className="w-4 h-4 accent-primary" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end px-5 py-4">
        <Button onClick={save} disabled={busy}>
          Save
        </Button>
      </div>
    </Card>
  );
}

function List({ unread }: { unread: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["notifications", unread, type, page], queryFn: () => alertsApi.notifications({ unread, type: type || undefined, page }), placeholderData: keepPreviousData });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["bell"] });
  };
  const open = async (n: NotificationItem) => {
    if (!n.read) await alertsApi.markRead([n.id]).catch(() => null);
    refresh();
    if (n.link) router.push(n.link);
  };
  const remove = async (n: NotificationItem) => {
    await alertsApi.remove(n.id).catch(() => null);
    refresh();
  };
  const d = q.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Kind" value={type} onChange={(t) => { setType(t); setPage(1); }} className="w-full sm:w-56" options={[{ value: "", label: "All kinds" }, ...(d?.types ?? []).map((t) => ({ value: t.code, label: t.name }))]} />
        {!!d?.unread && (
          <Button variant="secondary" className="sm:ml-auto" onClick={async () => { await alertsApi.markRead("all"); refresh(); }}>
            Mark all as read
          </Button>
        )}
      </div>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!d && !q.isError && <PageLoader />}
      {d && (
        <Card padding="none" className="overflow-hidden">
          {d.rows.map((n) => (
            <div key={n.id} className={cn("flex gap-3 px-5 py-3.5 border-b border-outline-variant/10", !n.read && "bg-primary/5")}>
              <span className={cn("material-symbols-outlined text-2xl shrink-0", n.priority !== "normal" ? "text-error" : "text-primary")}>{n.icon}</span>
              <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-sm", n.read ? "font-semibold" : "font-extrabold text-primary")}>{n.title}</span>
                  {n.priority !== "normal" && <Pill tone="danger">{n.priority}</Pill>}
                  <span className="text-[10px] text-on-surface-variant/60">
                    {n.typeName} · {timeAgo(n.at)}
                  </span>
                </span>
                <span className="block text-sm text-on-surface-variant/90 mt-0.5 whitespace-pre-line">{n.body}</span>
              </button>
              <button type="button" onClick={() => remove(n)} aria-label="Delete" className="self-start p-1 rounded-full text-on-surface-variant/60 hover:text-error hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ))}
          {!d.rows.length && <p className="px-5 py-10 text-center text-sm text-on-surface-variant/70">{unread ? "Nothing unread. ✓" : "No notifications yet."}</p>}
        </Card>
      )}
      {d && d.pages > 1 && <Pagination currentPage={page} totalPage={d.pages} onPageChange={setPage} />}
    </div>
  );
}

export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  return (
    <>
      <PageHeader title="Notifications" description="Everything the school has told you: attendance, fees, results, leave, notices and messages." />
      <Tabs
        className="mb-4"
        tabs={[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread" },
          { id: "choices", label: "How I’m told" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      {tab === "choices" ? <MyChoices /> : <List key={tab} unread={tab === "unread"} />}
    </>
  );
}
