"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { SearchPick } from "@/components/hostel/SearchPick";
import { hostelApi, when, type FoundStudent } from "@/lib/api/hostel";

const boarders = async (q: string) => (await hostelApi.findStudents(q)).filter((s) => s.current);
const pickRow = (s: FoundStudent) => (
  <span>
    <b>{s.name}</b> <span className="text-on-surface-variant">{s.admissionNo} · {s.current}</span>
  </span>
);
function Chosen({ s, onClear }: { s: FoundStudent; onClear: () => void }) {
  return (
    <div className="rounded-xl bg-surface-container px-3 py-2 text-sm">
      <b>{s.name}</b> <span className="text-on-surface-variant">{s.current}</span>{" "}
      <button className="text-xs text-primary" onClick={onClear}>
        change
      </button>
    </div>
  );
}

function SickBay() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["hostel", "medical"], queryFn: hostelApi.medical });
  const [s, setS] = useState<FoundStudent | null>(null);
  const [f, setF] = useState({ complaint: "", treatment: "", medicine: "", referred: false, tellParent: true });
  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 font-bold">Record a sick-bay visit</p>
        <div className="grid gap-3 md:grid-cols-2">
          {s ? <Chosen s={s} onClear={() => setS(null)} /> : <SearchPick label="Boarder" search={boarders} onPick={setS} render={pickRow} />}
          <Input label="Complaint" value={f.complaint} onChange={(e) => setF({ ...f, complaint: e.target.value })} maxLength={300} />
          <Input label="Treatment" value={f.treatment} onChange={(e) => setF({ ...f, treatment: e.target.value })} maxLength={300} />
          <Input label="Medicine given" value={f.medicine} onChange={(e) => setF({ ...f, medicine: e.target.value })} maxLength={200} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <Checkbox checked={f.referred} onChange={(v) => setF({ ...f, referred: v })} label="Taken to the doctor / hospital" />
          <Checkbox checked={f.tellParent} onChange={(v) => setF({ ...f, tellParent: v })} label="Tell the parents" />
          <div className="flex-1" />
          <Button
            disabled={!s || f.complaint.trim().length < 2}
            onClick={async () => {
              try {
                await hostelApi.addMedical({ studentId: s!.id, complaint: f.complaint, treatment: f.treatment || null, medicine: f.medicine || null, referred: f.referred, tellParent: f.tellParent });
                showToast(f.tellParent ? "Saved: the parents are told" : "Saved", "success");
                setS(null);
                setF({ complaint: "", treatment: "", medicine: "", referred: false, tellParent: true });
                qc.invalidateQueries({ queryKey: ["hostel", "medical"] });
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <th className="px-5 py-2">When</th>
                <th className="px-2 py-2">Boarder</th>
                <th className="px-2 py-2">Complaint</th>
                <th className="px-5 py-2">Treatment</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((m) => (
                <tr key={m.id} className="border-t border-outline-variant/15">
                  <td className="px-5 py-2 whitespace-nowrap">{when(m.at)}</td>
                  <td className="px-2 py-2 font-semibold">{m.student}</td>
                  <td className="px-2 py-2">
                    {m.complaint} {m.referred && <Pill tone="danger">Referred</Pill>}
                  </td>
                  <td className="px-5 py-2 text-on-surface-variant">{[m.treatment, m.medicine].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
              {!q.data?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">
                    No visits.
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

function Inspections() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const list = useQuery({ queryKey: ["hostel", "list"], queryFn: hostelApi.list });
  const [hostelId, setHostelId] = useState("");
  useEffect(() => {
    if (!hostelId && list.data?.hostels.length) setHostelId(list.data.hostels[0].id);
  }, [hostelId, list.data]);
  const rooms = useQuery({ queryKey: ["hostel", "rooms", hostelId], queryFn: () => hostelApi.rooms(hostelId), enabled: !!hostelId });
  const notes = useQuery({ queryKey: ["hostel", "notes", hostelId], queryFn: () => hostelApi.notes(hostelId), enabled: !!hostelId });
  const [kind, setKind] = useState<"inspection" | "fine">("inspection");
  const [roomId, setRoomId] = useState("");
  const [s, setS] = useState<FoundStudent | null>(null);
  const [note, setNote] = useState("");
  const [fine, setFine] = useState("");
  if (list.isLoading) return <PageLoader />;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Select label="Hostel" value={hostelId} onChange={setHostelId} options={(list.data?.hostels ?? []).map((h) => ({ value: h.id, label: h.name }))} />
          <Select label="What" value={kind} onChange={(v) => setKind(v as "inspection" | "fine")} options={[{ value: "inspection", label: "Room inspection" }, { value: "fine", label: "Fine" }]} />
          <Select label="Room" value={roomId} onChange={setRoomId} options={[{ value: "", label: "—" }, ...(rooms.data?.rooms ?? []).map((r) => ({ value: r.id, label: `Room ${r.number}` }))]} />
          {kind === "fine" && <Input label="Fine (₹)" type="number" min={1} value={fine} onChange={(e) => setFine(e.target.value)} />}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {kind === "fine" && (s ? <Chosen s={s} onClear={() => setS(null)} /> : <SearchPick label="Boarder fined" search={boarders} onPick={setS} render={pickRow} />)}
          <Input label={kind === "fine" ? "Why" : "What was found"} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            disabled={!hostelId || note.trim().length < 2 || (kind === "fine" && (!s || !(Number(fine) > 0)))}
            onClick={async () => {
              try {
                qc.setQueryData(["hostel", "notes", hostelId], await hostelApi.addNote({ hostelId, roomId: roomId || null, studentId: kind === "fine" ? s!.id : null, kind, note, fine: kind === "fine" ? Number(fine) : null }));
                showToast(kind === "fine" ? "Fine recorded: it is added to the next fee instalment" : "Saved", "success");
                setNote("");
                setFine("");
                setS(null);
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      </Card>
      <Card padding="none">
        <table className="w-full text-sm">
          <tbody>
            {(notes.data ?? []).map((n) => (
              <tr key={n.id} className="border-t border-outline-variant/15 first:border-0">
                <td className="px-5 py-2 whitespace-nowrap text-on-surface-variant">{when(n.at)}</td>
                <td className="px-2 py-2">
                  <Pill tone={n.kind === "fine" ? "danger" : "neutral"}>{n.kind === "fine" ? `Fine ₹${n.fine}` : "Inspection"}</Pill>
                </td>
                <td className="px-2 py-2">{[n.room && `Room ${n.room}`, n.student].filter(Boolean).join(" · ")}</td>
                <td className="px-5 py-2">{n.note}</td>
              </tr>
            ))}
            {!notes.data?.length && (
              <tr>
                <td className="px-5 py-6 text-center text-on-surface-variant">Nothing recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Visitors() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [s, setS] = useState<FoundStudent | null>(null);
  const v = useQuery({ queryKey: ["hostel", "visitors", s?.id], queryFn: () => hostelApi.visitors(s!.id), enabled: !!s });
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", relation: "", phone: "" });
  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-1 font-bold">Who may visit a boarder</p>
        <p className="mb-3 text-sm text-on-surface-variant">Parents can add these from My Hostel too. The gate checks the list before letting a visitor meet the boarder.</p>
        {s ? <Chosen s={s} onClear={() => setS(null)} /> : <SearchPick label="Boarder" search={boarders} onPick={setS} render={pickRow} />}
      </Card>
      {s && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
            <Input label="Relation" value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} maxLength={40} />
            <Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={20} />
            <Button
              disabled={f.name.trim().length < 2}
              onClick={async () => {
                try {
                  qc.setQueryData(["hostel", "visitors", s.id], await hostelApi.addVisitor({ studentId: s.id, name: f.name, relation: f.relation || null, phone: f.phone || null }));
                  setF({ name: "", relation: "", phone: "" });
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Add
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {(v.data ?? []).map((x) => (
              <div key={x.id} className="flex items-center justify-between rounded-xl bg-surface-container px-3 py-2 text-sm">
                <span>
                  <b>{x.name}</b> {x.relation && `(${x.relation})`} {x.phone}
                </span>
                <button
                  className="material-symbols-outlined text-lg text-on-surface-variant"
                  onClick={async () => (await confirm({ title: `Remove ${x.name}?`, message: "They can no longer visit.", confirmLabel: "Remove" })) && hostelApi.removeVisitor(x.id).then((d) => qc.setQueryData(["hostel", "visitors", s.id], d)).catch((e) => showToast(errorMessage(e), "error"))}
                >
                  delete
                </button>
              </div>
            ))}
            {v.data && !v.data.length && <p className="text-sm text-on-surface-variant">No one added yet.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function HostelCarePage() {
  const [tab, setTab] = useState("sick");
  return (
    <RequirePermission permission="hostel.warden">
      <PageHeader title="Sick Bay & Inspections" description="Sick-bay visits (parents told), room inspections, fines (added to the fees), and who may visit each boarder." />
      <Tabs className="mb-4" tabs={[{ id: "sick", label: "Sick bay" }, { id: "rooms", label: "Inspections & fines" }, { id: "visitors", label: "Allowed visitors" }]} activeTab={tab} onChange={setTab} />
      {tab === "sick" ? <SickBay /> : tab === "rooms" ? <Inspections /> : <Visitors />}
    </RequirePermission>
  );
}
