"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { hasAudience, ManagedNotice, NO_AUDIENCE, NOTICE_STATE, NoticeInput, noticesApi } from "@/lib/api/notices";
import { AudiencePicker } from "@/components/notices/AudiencePicker";
import { NoticeBody } from "@/components/notices/NoticeBody";
import { NoticeView } from "@/components/notices/NoticeView";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—");
/** ISO time → the value of a datetime-local input (India time), and back. */
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

const BLANK: NoticeInput = { ...NO_AUDIENCE, title: "", body: "", categoryId: null, important: false, publishAt: null, expiresOn: null, needsAck: false, attachmentIds: [] };

/** Writing a notice: text, category, who it is for, when, attachments; save as draft or publish. */
function Editor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { can } = useAuth();
  const existing = useQuery({ queryKey: ["notice-manage", id], queryFn: () => noticesApi.manageOne(id!), enabled: !!id });
  const cats = useQuery({ queryKey: ["master-options", "notice_category"], queryFn: () => mastersApi.options("notice_category"), staleTime: 5 * 60_000 });
  const opts = useQuery({ queryKey: ["notice-audience-options"], queryFn: noticesApi.audienceOptions, staleTime: 5 * 60_000 });
  const [n, setN] = useState<NoticeInput | null>(id ? null : BLANK);
  const [ackSet, setAckSet] = useState(false);
  // A new notice starts with the school’s choice of “I have read this”.
  if (!id && n && !ackSet && opts.data) {
    setAckSet(true);
    if (opts.data.ackDefault) setN({ ...n, needsAck: true });
  }
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const e = existing.data;
  if (id && e && !n) {
    setN({ ...NO_AUDIENCE, ...e, title: e.title, body: e.body ?? "", categoryId: e.categoryId ?? null, publishAt: e.state === "scheduled" || e.state === "draft" || e.state === "pending" ? e.publishAt : null, attachmentIds: e.attachmentIds ?? [] });
    setFiles(e.attachments ?? []);
  }
  const approval = opts.data?.approval === true;
  const directly = !approval || can("notice.publish");
  const published = e?.state === "published" || e?.state === "scheduled" || e?.state === "expired";
  const set = (patch: Partial<NoticeInput>) => setN((x) => (x ? { ...x, ...patch } : x));

  const upload = async (file: File | undefined) => {
    if (!file || !n) return;
    try {
      const f = await noticesApi.upload(file);
      setFiles((x) => [...x, f]);
      set({ attachmentIds: [...n.attachmentIds, f.id] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const save = async (publish: boolean) => {
    if (!n) return;
    setError(null);
    setBusy(true);
    try {
      const saved = id ? await noticesApi.save(id, n) : await noticesApi.create(n);
      let state = saved.state;
      if (publish && !published) state = (await noticesApi.publish(saved.id)).state;
      showToast(state === "pending" ? "Sent for approval" : state === "scheduled" ? "Scheduled" : state === "published" ? "Published" : "Saved as draft", "success");
      queryClient.invalidateQueries({ queryKey: ["notices-manage"] });
      queryClient.invalidateQueries({ queryKey: ["notices-mine"] });
      queryClient.invalidateQueries({ queryKey: ["notices-unread"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={id ? "Edit notice" : "New notice"} width="max-w-3xl">
      {!n ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <Input label="Title" value={n.title} onChange={(ev) => set({ title: ev.target.value })} maxLength={160} placeholder="e.g. Parent-teacher meeting on Saturday" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Category" value={n.categoryId ?? ""} onChange={(v) => set({ categoryId: v || null })} options={[{ value: "", label: "None" }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            <div className="flex flex-col justify-end gap-3 pb-1">
              <Checkbox label="Important (pinned at the top, highlighted)" checked={n.important} onChange={(c) => set({ important: c })} />
              <Checkbox label="Ask readers to confirm “I have read this”" checked={n.needsAck} onChange={(c) => set({ needsAck: c })} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Message</span>
              <button type="button" className="text-[11px] font-bold uppercase tracking-widest text-primary" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="rounded-xl border border-outline-variant/30 p-4 min-h-[12rem]">
                <NoticeBody text={n.body || "Nothing written yet."} />
              </div>
            ) : (
              <textarea
                value={n.body}
                onChange={(ev) => set({ body: ev.target.value })}
                rows={9}
                maxLength={20000}
                className="w-full rounded-xl bg-surface-container-low p-4 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                placeholder={"Dear parents,\n\nWrite the notice here. **Bold text** with two stars, a list with “- ” at the start of a line; links are made clickable."}
              />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Attachments (PDF or images)</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {files
                .filter((f) => n.attachmentIds.includes(f.id))
                .map((f) => (
                  <span key={f.id} className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs">
                    {f.name}
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => set({ attachmentIds: n.attachmentIds.filter((x) => x !== f.id) })} className="text-error">
                      ✕
                    </button>
                  </span>
                ))}
              {n.attachmentIds.length < 10 && (
                <label className="cursor-pointer rounded-xl bg-surface-container-low px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80">
                  Add file
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(ev) => upload(ev.target.files?.[0])} />
                </label>
              )}
            </div>
          </div>
          <AudiencePicker value={n} onChange={(a) => set(a)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Publish at (empty = when you publish)" type="datetime-local" value={toLocal(n.publishAt)} onChange={(ev) => set({ publishAt: fromLocal(ev.target.value) })} />
            <Input label="Take off the board after (optional)" type="date" value={n.expiresOn ?? ""} onChange={(ev) => set({ expiresOn: ev.target.value || null })} />
          </div>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {published ? (
              <Button onClick={() => save(false)} loading={busy} disabled={n.title.trim().length < 3 || n.body.trim().length < 3 || !hasAudience(n)}>
                Save changes
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => save(false)} loading={busy} disabled={n.title.trim().length < 3}>
                  Save draft
                </Button>
                <Button onClick={() => save(true)} loading={busy} disabled={n.title.trim().length < 3 || n.body.trim().length < 3 || !hasAudience(n)}>
                  {directly ? (n.publishAt && new Date(n.publishAt) > new Date() ? "Schedule" : "Publish") : "Send for approval"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Who it was for and who has read it, group by group. */
function ReadersView({ notice, onClose }: { notice: ManagedNotice; onClose: () => void }) {
  const q = useQuery({ queryKey: ["notice-readers", notice.id], queryFn: () => noticesApi.readers(notice.id) });
  const r = q.data;
  return (
    <Modal isOpen onClose={onClose} title={`Read by: ${notice.title}`} width="max-w-2xl">
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!r && !q.isError && <PageLoader />}
      {r && (
        <div className="space-y-4">
          <p className="text-sm">
            <b>{r.read}</b> of {r.total} have read it{r.needsAck && <> · <b>{r.acknowledged}</b> confirmed</>}.
          </p>
          {r.groups.map((g) => (
            <details key={g.group} className="rounded-xl bg-surface-container-low px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {g.group} <span className="text-on-surface-variant/70 font-normal">· {g.read} of {g.people.length} read</span>
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {g.people.map((p, i) => (
                  <span key={i} className={p.readAt ? "" : "text-on-surface-variant/60"}>
                    {p.readAt ? "✓" : "○"} {p.name}
                    {p.acknowledgedAt ? " · confirmed" : ""}
                  </span>
                ))}
              </div>
            </details>
          ))}
          {!r.groups.length && <p className="text-sm text-on-surface-variant/70">Nobody with a login is in this audience yet.</p>}
        </div>
      )}
    </Modal>
  );
}

function Manage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [readers, setReaders] = useState<ManagedNotice | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["notices-manage", tab, search], queryFn: () => noticesApi.manage({ status: tab, search }) });
  const run = async (p: Promise<unknown>, done: string) => {
    try {
      await p;
      showToast(done, "success");
      queryClient.invalidateQueries({ queryKey: ["notices-manage"] });
      queryClient.invalidateQueries({ queryKey: ["notices-mine"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async (n: ManagedNotice) => {
    if (!(await confirm({ title: `Delete “${n.title}”?`, message: n.state === "draft" ? "The draft is removed." : "It goes off the board for everyone, with who read it.", confirmLabel: "Delete", danger: true }))) return;
    await run(noticesApi.remove(n.id), "Notice deleted");
  };
  const takeOff = async (n: ManagedNotice) => {
    if (!(await confirm({ title: n.state === "pending" ? `Send “${n.title}” back?` : `Take “${n.title}” off the board?`, message: n.state === "pending" ? "It goes back to draft for the writer to change." : "It goes back to draft; readers no longer see it.", confirmLabel: n.state === "pending" ? "Send back" : "Take off" }))) return;
    await run(noticesApi.unpublish(n.id), "Back to draft");
  };
  const link = "text-xs font-bold uppercase tracking-widest hover:opacity-70";
  return (
    <>
      <PageHeader
        title="Manage Notices"
        description="Write notices and circulars, publish them now or later, and see who has read them."
        actions={
          <Button onClick={() => setEditing("new")}>
            <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
            New notice
          </Button>
        }
      />
      <div className="mb-4 space-y-3">
        <Tabs
          tabs={[
            { id: "all", label: "All" },
            { id: "draft", label: "Drafts" },
            { id: "pending", label: "Waiting for approval" },
            { id: "scheduled", label: "Scheduled" },
            { id: "published", label: "On the board" },
            { id: "expired", label: "Expired" },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
        <div className="max-w-sm">
          <Input placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
        </div>
      </div>
      {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
      {!list.data && !list.isError && <PageLoader />}
      {list.data && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Notice</th>
                  <th className="px-5 py-3 font-bold">For</th>
                  <th className="px-5 py-3 font-bold">Published</th>
                  <th className="px-5 py-3 font-bold">Read</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.data.map((n) => (
                  <tr key={n.id} className="border-t border-outline-variant/10 align-top">
                    <td className="px-5 py-3 max-w-[320px]">
                      <button type="button" className="text-left font-semibold hover:text-primary" onClick={() => setViewing(n.id)}>
                        {n.important && <span className="text-error mr-1">●</span>}
                        {n.title}
                      </button>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Pill tone={NOTICE_STATE[n.state].tone}>{NOTICE_STATE[n.state].label}</Pill>
                        {n.category && <Pill>{n.category}</Pill>}
                      </div>
                      <p className="text-[11px] text-on-surface-variant/70 mt-1">
                        {n.state === "pending" && n.sentBy ? `sent by ${n.sentBy}` : n.writtenBy ? `by ${n.writtenBy}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs max-w-[220px]">{n.audience}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">
                      {when(n.publishAt)}
                      {n.expiresOn && <p className="text-on-surface-variant/60">until {new Date(`${n.expiresOn}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</p>}
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">
                      {n.state === "draft" || n.state === "pending" ? (
                        "—"
                      ) : (
                        <button type="button" className="text-left hover:text-primary" onClick={() => setReaders(n)}>
                          <b>{n.readCount}</b> / {n.audienceCount}
                          {n.needsAck && <p className="text-on-surface-variant/70">{n.ackCount} confirmed</p>}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
                        {n.state === "pending" && can("notice.publish") && (
                          <button type="button" className={`${link} text-emerald-700`} onClick={() => run(noticesApi.publish(n.id), "Approved and published")}>
                            Approve
                          </button>
                        )}
                        {n.state === "draft" && (
                          <button type="button" className={`${link} text-emerald-700`} onClick={() => run(noticesApi.publish(n.id), "Done")}>
                            Publish
                          </button>
                        )}
                        <button type="button" className={`${link} text-primary`} onClick={() => setEditing(n.id)}>
                          Edit
                        </button>
                        {n.state !== "draft" && (
                          <button type="button" className={`${link} text-on-surface-variant`} onClick={() => takeOff(n)}>
                            {n.state === "pending" ? "Send back" : "Take off"}
                          </button>
                        )}
                        <button type="button" className={`${link} text-error`} onClick={() => remove(n)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.data.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-on-surface-variant/70">
                      No notices here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing && <Editor id={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {readers && <ReadersView notice={readers} onClose={() => setReaders(null)} />}
      {viewing && <NoticeView id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

export default function ManageNoticesPage() {
  const { can } = useAuth();
  if (!can("notice.create") && !can("notice.publish"))
    return (
      <Card className="max-w-lg mx-auto mt-20 text-center">
        You don&apos;t have access to this page. Ask your school&apos;s administrator to give your role “Write notices”.
      </Card>
    );
  return <Manage />;
}
