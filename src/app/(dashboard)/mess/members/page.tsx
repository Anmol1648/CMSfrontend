"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { SearchPick } from "@/components/hostel/SearchPick";
import { todayISO } from "@/lib/api/hostel";
import { messApi } from "@/lib/api/mess";

type Picked = { kind: "student" | "staff"; id: string; name: string; code: string };

function AddMembers({ onDone }: { onDone: () => void }) {
  const { showToast } = useToast();
  const plans = useQuery({ queryKey: ["mess", "plans"], queryFn: messApi.plans });
  const [planId, setPlanId] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [people, setPeople] = useState<Picked[]>([]);
  const plan = plans.data?.find((p) => p.id === planId);
  return (
    <Card>
      <p className="mb-3 font-bold">Add members</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Plan" value={planId} onChange={setPlanId} options={[{ value: "", label: "Choose…" }, ...(plans.data ?? []).filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))]} />
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <SearchPick label="Student or staff" placeholder="Type a name or code" search={messApi.people} onPick={(p) => setPeople((x) => (x.some((y) => y.id === p.id) ? x : [...x, p]))} render={(p) => <span><b>{p.name}</b> <span className="text-on-surface-variant">{p.code} · {p.kind}</span></span>} />
      </div>
      {plan?.forBoarders && <FormAlert tone="info">Boarders join this plan by themselves when they get a hostel bed.</FormAlert>}
      {people.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {people.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-sm">
              {p.name}
              <button className="material-symbols-outlined text-base" onClick={() => setPeople((x) => x.filter((y) => y.id !== p.id))}>
                close
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <Button
          disabled={!planId || !people.length}
          onClick={async () => {
            try {
              const r = await messApi.subscribe({ planId, fromDate: from, studentIds: people.filter((p) => p.kind === "student").map((p) => p.id), staffIds: people.filter((p) => p.kind === "staff").map((p) => p.id) });
              showToast(`${r.added} added${r.already ? `, ${r.already} already on it` : ""}. Anyone on another plan moves to this one.`, "success");
              setPeople([]);
              onDone();
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Add
        </Button>
      </div>
    </Card>
  );
}

function Members() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const plans = useQuery({ queryKey: ["mess", "plans"], queryFn: messApi.plans });
  const [f, setF] = useState({ show: "active", planId: "", kind: "" });
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["mess", "members", f], queryFn: () => messApi.members({ ...f, planId: f.planId || undefined }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["mess"] });
  const t = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((m) => !t || m.name.toLowerCase().includes(t) || m.code.toLowerCase().includes(t));
  return (
    <div className="space-y-4">
      {can("mess.manage") && <AddMembers onDone={refresh} />}
      <div className="flex flex-wrap items-end gap-3">
        <Select className="max-w-[12rem]" label="Show" value={f.show} onChange={(v) => setF({ ...f, show: v })} options={[{ value: "active", label: "Members now" }, { value: "all", label: "Everyone, past too" }]} />
        <Select className="max-w-xs" label="Plan" value={f.planId} onChange={(v) => setF({ ...f, planId: v })} options={[{ value: "", label: "All plans" }, ...(plans.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        <Select className="max-w-[12rem]" label="Who" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={[{ value: "", label: "Everyone" }, { value: "student", label: "Students" }, { value: "staff", label: "Staff" }]} />
        <Input className="max-w-xs" placeholder="Find" icon="search" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-sm text-on-surface-variant">{rows.length} shown</span>
      </div>
      {list.isLoading ? (
        <PageLoader />
      ) : list.error ? (
        <FormAlert>{errorMessage(list.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th className="px-5 py-2">Name</th>
                <th className="px-2 py-2">Plan</th>
                <th className="px-2 py-2">From</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-outline-variant/15">
                  <td className="px-5 py-2">
                    <b>{m.name}</b>
                    <p className="text-xs text-on-surface-variant">
                      {m.code} · {m.sub}
                    </p>
                  </td>
                  <td className="px-2 py-2">
                    {m.plan} {m.source === "hostel" && <Pill tone="primary">Boarder</Pill>}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {m.from}
                    {m.to && ` → ${m.to}`}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {m.status === "active" && can("mess.manage") && m.source !== "hostel" && (
                      <Button variant="tertiary" onClick={async () => (await confirm({ title: `End ${m.name}’s mess plan?`, message: "They stop from today; the charge stops with the next instalment / month.", confirmLabel: "End" })) && messApi.end(m.id, todayISO()).then(refresh).catch((e) => showToast(errorMessage(e), "error"))}>
                        End
                      </Button>
                    )}
                    {m.status === "ended" && <Pill>Ended</Pill>}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">
                    No members.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function MessMembersPage() {
  return (
    <RequirePermission permission={["mess.manage", "mess.view"]}>
      <PageHeader title="Mess Members" description="Students and staff on each plan. Students’ charges go into their fee instalments; staff charges come off their salary. Boarders are added and removed with their hostel bed." />
      <Members />
    </RequirePermission>
  );
}
