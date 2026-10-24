"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { clock, Visit, VISIT_STATUS, visitorsApi } from "@/lib/api/visitors";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function Waiting({ v }: { v: Visit }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const answer = async (allow: boolean) => {
    try {
      await visitorsApi.answer(v.id, allow, note);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      showToast(allow ? "The gate lets them in" : "The gate is told", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <li className="rounded-xl bg-amber-50 p-3">
      <div className="flex items-center gap-3">
        <AuthedPhoto path={v.photoFileId ? visitorsApi.visitPhoto(v.id) : null} className="h-14 w-14 rounded-lg object-cover" />
        <div className="flex-1">
          <p className="font-bold">{v.visitor.name}{v.people > 1 ? ` +${v.people - 1}` : ""}</p>
          <p className="text-xs text-on-surface-variant">
            {v.visitor.mobile} · {v.purpose ?? "Visit"}
            {v.note ? ` · ${v.note}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Message for the gate (optional)" className="flex-1 min-w-[10rem] rounded-lg bg-white px-3 py-2 text-sm" aria-label="Message for the gate" />
        <Button variant="secondary" onClick={() => answer(false)}>
          Not now
        </Button>
        <Button onClick={() => answer(true)}>Allow</Button>
      </div>
    </li>
  );
}

function Mine() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["visitors", "mine"], queryFn: visitorsApi.mine, refetchInterval: 15_000 });
  const [v, setV] = useState({ name: "", mobile: "", day: today(), purposeId: "", people: 1, note: "" });
  const add = async () => {
    try {
      await visitorsApi.expect({ name: v.name.trim(), mobile: v.mobile.trim() || null, day: v.day, purposeId: v.purposeId || null, people: v.people, note: v.note.trim() || null });
      setV({ name: "", mobile: "", day: today(), purposeId: "", people: 1, note: "" });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      showToast("The gate will let them in", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const cancel = async (id: string) => {
    try {
      await visitorsApi.cancelExpected(id);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <p className={label}>At the gate for you</p>
          {!d.waiting.length ? <p className="mt-2 text-sm text-on-surface-variant">No one waiting.</p> : <ul className="mt-2 space-y-2">{d.waiting.map((w) => <Waiting key={w.id} v={w} />)}</ul>}
        </Card>
        <Card>
          <p className={label}>Lately</p>
          {!d.recent.length && <p className="mt-2 text-sm text-on-surface-variant">No visitors yet.</p>}
          <ul className="mt-2 space-y-1.5 text-sm">
            {d.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="w-24 text-xs text-on-surface-variant">{r.day}</span>
                <span className="flex-1">
                  {r.visitor.name} <span className="text-xs text-on-surface-variant">{clock(r.inAt)}</span>
                </span>
                <Pill tone={VISIT_STATUS[r.status].tone}>{VISIT_STATUS[r.status].label}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <p className={label}>Tell the gate who is coming</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
            <Input label="Mobile" value={v.mobile} onChange={(e) => setV({ ...v, mobile: e.target.value })} inputMode="tel" />
            <Input label="Day" type="date" value={v.day} onChange={(e) => setV({ ...v, day: e.target.value })} />
            <MasterSelect master="visit_purpose" label="Purpose" value={v.purposeId} onChange={(id) => setV({ ...v, purposeId: id })} />
          </div>
          <div className="mt-3">
            <Input label="Note for the gate" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="Guest talk for Class VII" />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={add} disabled={v.name.trim().length < 2}>
              Add
            </Button>
          </div>
        </Card>
        <Card>
          <p className={label}>Expected</p>
          {!d.expected.length && <p className="mt-2 text-sm text-on-surface-variant">No one expected.</p>}
          <ul className="mt-2 space-y-2 text-sm">
            {d.expected.map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <span className="w-24 text-xs text-on-surface-variant">{e.day}</span>
                <span className="flex-1">
                  <b>{e.visitor.name}</b>
                  {e.note ? <span className="text-xs text-on-surface-variant"> · {e.note}</span> : null}
                </span>
                <Button variant="tertiary" onClick={() => cancel(e.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function MyVisitorsPage() {
  return (
    <RequirePermission permission="visitor.expect">
      <PageHeader title="My Visitors" description="Visitors waiting at the gate for your OK, and the ones you expect (they go in without waiting)." />
      <Mine />
    </RequirePermission>
  );
}
