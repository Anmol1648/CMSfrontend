"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { AuthedPhoto, PhotoCapture } from "@/components/visitors/Photo";
import { clock, PersonInput, PickupList, visitorsApi } from "@/lib/api/visitors";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
type Person = PickupList["people"][number];

function PersonForm({ studentId, person, onClose }: { studentId: string; person: Person | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<PersonInput>({ name: person?.name ?? "", relationId: person?.relationId ?? null, mobile: person?.mobile ?? "", photoFileId: person?.photoFileId ?? null, note: person?.note ?? null });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const save = async () => {
    try {
      if (person) await visitorsApi.updatePerson(person.id, v);
      else await visitorsApi.addPerson(studentId, v);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      showToast("Saved: the gate can hand your child to them", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={person ? "Edit" : "Add someone who may collect your child"}>
      <div className="space-y-4">
        <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={fields.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <MasterSelect master="pickup_relation" label="Relation" value={v.relationId ?? ""} onChange={(id) => setV({ ...v, relationId: id || null })} />
          <Input label="Mobile" value={v.mobile} onChange={(e) => setV({ ...v, mobile: e.target.value })} error={fields.mobile} inputMode="tel" />
        </div>
        <PhotoCapture value={v.photoFileId ?? null} preview={person?.photoFileId ? visitorsApi.personPhoto(person.id) : null} onChange={(id) => setV({ ...v, photoFileId: id })} label="Their photo (the guard checks it)" />
        <Input label="Note" value={v.note ?? ""} onChange={(e) => setV({ ...v, note: e.target.value || null })} placeholder="Collects on Saturdays" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function Mine() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["visitors", "my-pickup"], queryFn: visitorsApi.myPickup });
  const [form, setForm] = useState<{ studentId: string; person: Person | null } | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.children.length) return <FormAlert tone="info">No student is linked to your login.</FormAlert>;
  const remove = async (p: Person) => {
    if (!(await confirm({ title: `Remove ${p.name}?`, message: "The gate won’t hand your child to them any more.", confirmLabel: "Remove", danger: true }))) return;
    try {
      await visitorsApi.removePerson(p.id);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4 max-w-3xl">
      {d.children.map((c) => (
        <Card key={c.student.id}>
          <p className="text-lg font-extrabold">{c.student.name}</p>
          <p className={`${label} mt-4`}>Parents and guardians (from the school record)</p>
          <ul className="mt-2 space-y-1 text-sm">
            {c.guardians.map((g) => (
              <li key={g.id}>
                <b>{g.name}</b> · {g.relation}
                {g.mobile ? ` · ${g.mobile}` : ""}
              </li>
            ))}
            {!c.guardians.length && <li className="text-on-surface-variant">None on record: ask the office.</li>}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <p className={label}>Others who may collect {c.student.name.split(" ")[0]}</p>
            {d.canAdd && (
              <Button variant="tertiary" onClick={() => setForm({ studentId: c.student.id, person: null })}>
                Add someone
              </Button>
            )}
          </div>
          {!c.people.length && <p className="mt-2 text-sm text-on-surface-variant">No one else. Only the parents above can collect your child early.</p>}
          <ul className="mt-2 space-y-2">
            {c.people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2">
                <AuthedPhoto path={p.photoFileId ? visitorsApi.personPhoto(p.id) : null} className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-on-surface-variant/70">
                    {p.relation} · {p.mobile}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                {d.canAdd && (
                  <>
                    <Button variant="tertiary" onClick={() => setForm({ studentId: c.student.id, person: p })}>
                      Edit
                    </Button>
                    <Button variant="tertiary" onClick={() => remove(p)}>
                      Remove
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {c.recent.length > 0 && (
            <>
              <p className={`${label} mt-5`}>Collected early lately</p>
              <ul className="mt-2 space-y-1 text-sm">
                {c.recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant w-32">
                      {new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} {clock(r.at)}
                    </span>
                    <span className="flex-1">
                      by {r.name}
                      {r.relation ? ` (${r.relation})` : ""} · {r.reason}
                    </span>
                    {r.status === "refused" ? <Pill tone="danger">Refused</Pill> : r.status === "waiting" ? <Pill tone="warning">Waiting</Pill> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      ))}
      {form && <PersonForm studentId={form.studentId} person={form.person} onClose={() => setForm(null)} />}
    </div>
  );
}

export default function MyPickupPage() {
  return (
    <RequirePermission permission="visitor.pickup_mine">
      <PageHeader title="My Pickup List" description="Who may collect your child from school early. The guard checks the person against this list and you are told when your child leaves." />
      <Mine />
    </RequirePermission>
  );
}
