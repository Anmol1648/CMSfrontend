"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { errorMessage } from "@/lib/api/client";
import { Notice, platformApi, when } from "@/lib/api/platform";
import { usePlatformUser } from "@/components/platform/PlatformContext";

const local = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 16) : "");
const toIso = (v: string) => `${v}:00+05:30`;

export default function NoticesPage() {
  const { user } = usePlatformUser();
  const owner = user.role === "owner";
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["platform", "notices"], queryFn: platformApi.notices });
  const blank = { kind: "banner" as Notice["kind"], title: "", body: "", audience: "all" as Notice["audience"], startsAt: local(new Date().toISOString()), endsAt: "" };
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  if (q.isLoading) return <PageLoader />;
  const now = Date.now();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Notices to schools</h1>
        <p className="text-sm text-on-surface-variant">A banner shows across the top of every school’s screens while it is on (e.g. maintenance tonight). “What’s new” is shown once to each person after an update.</p>
      </div>
      {owner && (
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Select label="Kind" value={f.kind} onChange={(v) => setF({ ...f, kind: v as Notice["kind"] })} options={[{ value: "banner", label: "Banner (maintenance, outage)" }, { value: "news", label: "What’s new (after an update)" }]} />
            <Select label="Who sees it" value={f.audience} onChange={(v) => setF({ ...f, audience: v as Notice["audience"] })} options={[{ value: "all", label: "Everyone" }, { value: "admins", label: "School admins and principals" }]} />
            <Input label="From" type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
            <Input label="Until (optional)" type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
          </div>
          <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} placeholder="e.g. Update tonight 10:00–10:30 pm" />
          <label className="flex flex-col gap-2">
            <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Text</span>
            <textarea className="min-h-[5rem] rounded-xl border border-outline-variant/40 bg-transparent px-3 py-2 text-sm" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={3000} />
          </label>
          <div className="flex justify-end gap-2">
            {editId && (
              <Button variant="tertiary" onClick={() => (setEditId(null), setF(blank))}>
                Cancel
              </Button>
            )}
            <Button
              disabled={f.title.trim().length < 2 || !f.startsAt}
              onClick={async () => {
                try {
                  qc.setQueryData(["platform", "notices"], await platformApi.saveNotice(editId, { kind: f.kind, title: f.title, body: f.body, audience: f.audience, startsAt: toIso(f.startsAt), endsAt: f.endsAt ? toIso(f.endsAt) : null }));
                  setEditId(null);
                  setF(blank);
                  showToast("Saved", "success");
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              {editId ? "Save" : "Publish"}
            </Button>
          </div>
        </Card>
      )}
      <Card padding="none">
        {(q.data ?? []).map((n) => {
          const on = new Date(n.startsAt).getTime() <= now && (!n.endsAt || new Date(n.endsAt).getTime() > now);
          return (
            <div key={n.id} className="flex flex-wrap items-start gap-3 border-b border-outline-variant/10 px-5 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={n.kind === "banner" ? "warning" : "primary"}>{n.kind === "banner" ? "Banner" : "What’s new"}</Pill>
                  {on ? <Pill tone="success">On now</Pill> : <Pill>Off</Pill>}
                  {n.audience === "admins" && <Pill>Admins</Pill>}
                  <b>{n.title}</b>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant whitespace-pre-wrap">{n.body}</p>
                <p className="text-xs text-on-surface-variant">
                  {when(n.startsAt)} → {n.endsAt ? when(n.endsAt) : "no end"}
                </p>
              </div>
              {owner && (
                <div className="flex gap-3 text-xs font-bold uppercase tracking-widest">
                  <button type="button" className="text-primary" onClick={() => (setEditId(n.id), setF({ kind: n.kind, title: n.title, body: n.body, audience: n.audience, startsAt: local(n.startsAt), endsAt: local(n.endsAt) }))}>
                    Edit
                  </button>
                  <button type="button" className="text-error" onClick={async () => (await confirm({ title: "Delete this notice?", message: n.title, confirmLabel: "Delete", danger: true })) && qc.setQueryData(["platform", "notices"], await platformApi.deleteNotice(n.id))}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!q.data?.length && <p className="px-5 py-8 text-center text-sm text-on-surface-variant">No notices.</p>}
      </Card>
      {q.error && <FormAlert>{errorMessage(q.error)}</FormAlert>}
    </div>
  );
}
