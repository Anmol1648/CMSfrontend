"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { eventsApi, noticesApi } from "@/lib/api/notices";
import { NoticeView } from "@/components/notices/NoticeView";
import { cn } from "@/lib/utils";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const eventDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** The next events on the side of the board. */
function Upcoming() {
  const q = useQuery({ queryKey: ["events-upcoming"], queryFn: eventsApi.upcoming });
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Coming up</h3>
        <Link href="/events" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:opacity-70">
          Calendar
        </Link>
      </div>
      {q.data && !q.data.length && <p className="text-sm text-on-surface-variant/70">Nothing in the next 30 days.</p>}
      {(q.data ?? []).map((e) => (
        <div key={e.id} className="border-t border-outline-variant/10 pt-3 first:border-0 first:pt-0">
          <p className="text-xs font-bold text-primary">
            {eventDay(e.from)}
            {e.to !== e.from && ` – ${eventDay(e.to)}`}
            {e.startTime && ` · ${e.startTime}`}
          </p>
          <p className="text-sm font-semibold">{e.title}</p>
          {e.venue && <p className="text-[11px] text-on-surface-variant/70">{e.venue}</p>}
        </div>
      ))}
    </Card>
  );
}

function Board() {
  const { can } = useAuth();
  const [tab, setTab] = useState("current");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const cats = useQuery({ queryKey: ["master-options", "notice_category"], queryFn: () => mastersApi.options("notice_category"), staleTime: 5 * 60_000 });
  const list = useQuery({ queryKey: ["notices-mine", tab, category, search], queryFn: () => noticesApi.mine({ archive: tab === "archive", category, search }) });
  return (
    <>
      <PageHeader
        title="Notices"
        description="Circulars and notices for you. Open one to read it in full."
        actions={
          can("notice.create") || can("notice.publish") ? (
            <Link href="/notices/manage" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Write and manage notices
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4 min-w-0">
          <Tabs
            tabs={[
              { id: "current", label: "On the board" },
              { id: "archive", label: "Archive" },
            ]}
            activeTab={tab}
            onChange={setTab}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Search notices" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
            <Select value={category} onChange={setCategory} options={[{ value: "", label: "All categories" }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
          {!list.data && !list.isError && <PageLoader />}
          {list.data && !list.data.length && <Card className="text-center text-on-surface-variant/70 py-12">{tab === "archive" ? "No older notices." : "No notices for you right now."}</Card>}
          {(list.data ?? []).map((n) => (
            <button key={n.id} type="button" onClick={() => setOpen(n.id)} className="block w-full text-left">
              <Card className={cn("transition-shadow hover:shadow-md", n.important && "ring-2 ring-error/30", !n.read && "border-l-4 border-primary")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Not read" />}
                      {n.important && <Pill tone="danger">Important</Pill>}
                      {n.category && <Pill tone="primary">{n.category}</Pill>}
                      {n.needsAck && !n.acknowledged && <Pill tone="warning">Please confirm</Pill>}
                    </div>
                    <p className={cn("text-base text-on-surface", n.read ? "font-semibold" : "font-extrabold")}>{n.title}</p>
                    <p className="mt-1 text-sm text-on-surface-variant/80 line-clamp-2">{n.excerpt}</p>
                  </div>
                  <div className="text-right text-[11px] text-on-surface-variant/70 shrink-0">
                    <p>{day(n.publishAt)}</p>
                    {n.by && <p>{n.by}</p>}
                    {n.attachments > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                        {n.attachments}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
        <div>
          <Upcoming />
        </div>
      </div>
      {open && <NoticeView id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export default function NoticesPage() {
  return <Board />;
}
