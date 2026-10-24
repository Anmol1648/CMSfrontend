"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { SearchPick } from "@/components/hostel/SearchPick";
import { hostelApi, todayISO, type Bed, type FoundStudent, type Hostel, type HostelInput, type Room, type RoomType } from "@/lib/api/hostel";

type Picked = { room: Room; bed: Bed };

function HostelForm({ hostel, staff, onClose, onSaved }: { hostel: Hostel | null; staff: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState<HostelInput>({ name: hostel?.name ?? "", gender: hostel?.gender ?? "boys", wardenId: hostel?.wardenId ?? null, phone: hostel?.phone ?? "", isActive: hostel?.isActive ?? true });
  return (
    <Modal isOpen onClose={onClose} title={hostel ? `Edit ${hostel.name}` : "Add a hostel"}>
      <div className="space-y-3">
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
        <Select label="For" value={f.gender} onChange={(v) => setF({ ...f, gender: v as HostelInput["gender"] })} options={[{ value: "boys", label: "Boys" }, { value: "girls", label: "Girls" }, { value: "mixed", label: "Mixed" }]} />
        <Select label="Warden" value={f.wardenId ?? ""} onChange={(v) => setF({ ...f, wardenId: v || null })} options={[{ value: "", label: "—" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
        <p className="text-xs text-on-surface-variant">The warden runs the roll call, leave and sick bay of this hostel. Give them the Hostel Warden role in Users.</p>
        <Input label="Hostel phone" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={20} />
        <Checkbox checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="In use" />
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={f.name.trim().length < 2}
            onClick={async () => {
              try {
                await hostelApi.save(hostel?.id ?? null, { ...f, phone: f.phone || null });
                showToast("Saved", "success");
                onSaved();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RoomsForm({ hostelId, room, types, onClose, onSaved }: { hostelId: string; room: Room | null | "bulk"; types: RoomType[]; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const bulk = room === "bulk";
  const r = room && room !== "bulk" ? room : null;
  const [f, setF] = useState({ block: r?.block ?? "", floor: String(r?.floor ?? 1), number: r?.number ?? "", from: "101", to: "110", prefix: "", roomTypeId: r?.roomTypeId ?? types[0]?.id ?? "", beds: String(r?.beds ?? 4), isActive: r?.isActive ?? true });
  const typeOpts = [{ value: "", label: "—" }, ...types.map((t) => ({ value: t.id, label: `${t.name} (₹${t.fee.toLocaleString("en-IN")} per instalment)` }))];
  return (
    <Modal isOpen onClose={onClose} title={bulk ? "Add rooms" : r ? `Room ${r.number}` : "Add a room"}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Block" value={f.block} onChange={(e) => setF({ ...f, block: e.target.value })} maxLength={20} />
          <Input label="Floor" type="number" value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} />
        </div>
        {bulk ? (
          <div className="grid grid-cols-3 gap-3">
            <Input label="Prefix" value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} maxLength={6} placeholder="e.g. A-" />
            <Input label="From no." type="number" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
            <Input label="To no." type="number" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </div>
        ) : (
          <Input label="Room number" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} maxLength={20} />
        )}
        <Select label="Room type (Masters → Hostel room types)" value={f.roomTypeId} onChange={(v) => setF({ ...f, roomTypeId: v })} options={typeOpts} />
        <Input label="Beds" type="number" min={1} max={40} value={f.beds} onChange={(e) => setF({ ...f, beds: e.target.value })} />
        {!bulk && <Checkbox checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="In use" />}
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                if (bulk) {
                  const res = await hostelApi.addRooms(hostelId, { block: f.block || null, floor: Number(f.floor) || 0, from: Number(f.from), to: Number(f.to), prefix: f.prefix, roomTypeId: f.roomTypeId || null, beds: Number(f.beds) });
                  showToast(`${res.added} room(s) added`, "success");
                } else {
                  await hostelApi.saveRoom(hostelId, r?.id ?? null, { block: f.block || null, floor: Number(f.floor) || 0, number: f.number.trim(), roomTypeId: f.roomTypeId || null, beds: Number(f.beds), isActive: f.isActive });
                  showToast("Saved", "success");
                }
                onSaved();
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function BedModal({ picked, onClose, onDone, onMove }: { picked: Picked; onClose: () => void; onDone: () => void; onMove: (b: Bed) => void }) {
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [date, setDate] = useState(todayISO());
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const { room, bed } = picked;
  return (
    <Modal isOpen onClose={onClose} title={`Room ${room.number}, bed ${bed.bed}`}>
      {bed.studentId ? (
        <div className="space-y-3">
          <p className="text-lg font-bold">{bed.name}</p>
          <p className="text-sm text-on-surface-variant">
            {bed.admissionNo} · {bed.section} · since {bed.from}
          </p>
          {can("hostel.allot") && (
            <>
              <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => onMove(bed)}>
                  Move to another bed
                </Button>
                <Button
                  onClick={async () => {
                    if (!(await confirm({ title: `Vacate ${bed.name}?`, message: `The bed is free from ${date}. The hostel fee stops after this date.`, confirmLabel: "Vacate" }))) return;
                    try {
                      await hostelApi.vacate(bed.allotmentId!, date, null);
                      showToast("Vacated", "success");
                      onDone();
                    } catch (e) {
                      showToast(errorMessage(e), "error");
                    }
                  }}
                >
                  Vacate
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">{room.type || "Room"} · empty bed</p>
          {student ? (
            <div className="rounded-xl bg-surface-container p-3">
              <p className="font-bold">{student.name}</p>
              <p className="text-xs text-on-surface-variant">
                {student.admissionNo} · {student.section}
                {student.current ? ` · now in ${student.current} (will be moved)` : ""}
              </p>
              <button className="mt-1 text-xs text-primary" onClick={() => setStudent(null)}>
                Change
              </button>
            </div>
          ) : (
            <SearchPick label="Student" search={hostelApi.findStudents} onPick={setStudent} render={(s) => <span><b>{s.name}</b> <span className="text-on-surface-variant">{s.admissionNo} · {s.section}{s.current ? ` · ${s.current}` : ""}</span></span>} />
          )}
          <Input label="From" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!student}
              onClick={async () => {
                try {
                  const r = await hostelApi.allot({ studentId: student!.id, roomId: room.id, bed: bed.bed, fromDate: date });
                  showToast(r.moved ? "Moved" : "Bed allotted: the hostel fee is added to the fees", "success");
                  onDone();
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Allot
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Rooms() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["hostel", "list"], queryFn: hostelApi.list });
  const [hostelId, setHostelId] = useState("");
  const [editHostel, setEditHostel] = useState<Hostel | null | "new">(null);
  const [editRoom, setEditRoom] = useState<Room | null | "bulk" | "new">(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [moving, setMoving] = useState<Bed | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!hostelId && list.data?.hostels.length) setHostelId(list.data.hostels[0].id);
  }, [hostelId, list.data]);
  const rooms = useQuery({ queryKey: ["hostel", "rooms", hostelId], queryFn: () => hostelApi.rooms(hostelId), enabled: !!hostelId });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["hostel"] });
  };
  if (list.isLoading) return <PageLoader />;
  if (list.error) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  const { hostels, staff, roomTypes } = list.data!;
  const hostel = hostels.find((h) => h.id === hostelId);
  const t = q.trim().toLowerCase();
  const shown = (rooms.data?.rooms ?? []).filter((r) => !t || r.number.toLowerCase().includes(t) || r.bedList.some((b) => b.name?.toLowerCase().includes(t) || b.admissionNo?.toLowerCase().includes(t)));
  const floors = Array.from(new Set(shown.map((r) => `${r.block ?? ""}|${r.floor}`)));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hostels.map((h) => (
          <button key={h.id} onClick={() => setHostelId(h.id)} className={`rounded-2xl border p-4 text-left transition ${h.id === hostelId ? "border-primary bg-primary/5" : "border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container"}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold">{h.name}</p>
              <Pill tone={h.isActive ? "primary" : "neutral"}>{h.gender === "boys" ? "Boys" : h.gender === "girls" ? "Girls" : "Mixed"}</Pill>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              {h.boarders} / {h.beds} beds · {h.rooms} rooms
            </p>
            <p className="text-xs text-on-surface-variant">Warden: {h.warden || "—"}</p>
          </button>
        ))}
        {can("hostel.setup") && (
          <button onClick={() => setEditHostel("new")} className="rounded-2xl border border-dashed border-outline-variant/50 p-4 text-sm font-semibold text-primary hover:bg-surface-container">
            + Add a hostel
          </button>
        )}
      </div>
      {!hostels.length && <FormAlert tone="info">No hostels yet.{can("hostel.setup") ? " Add one, then its rooms." : ""}</FormAlert>}
      {hostel && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Input className="max-w-xs" placeholder="Find a room or boarder" icon="search" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex-1" />
            {can("hostel.setup") && (
              <>
                <Button variant="tertiary" onClick={() => setEditHostel(hostel)}>Edit hostel</Button>
                <Button variant="secondary" onClick={() => setEditRoom("new")}>Add a room</Button>
                <Button variant="secondary" onClick={() => setEditRoom("bulk")}>Add many rooms</Button>
              </>
            )}
          </div>
          {moving && (
            <FormAlert tone="warning">
              Moving <b>{moving.name}</b>: click an empty bed.{" "}
              <button className="underline" onClick={() => setMoving(null)}>
                Cancel
              </button>
            </FormAlert>
          )}
          {rooms.isLoading ? (
            <PageLoader />
          ) : (
            floors.map((fk) => {
              const [block, floor] = fk.split("|");
              return (
                <div key={fk}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                    {block ? `Block ${block} · ` : ""}Floor {floor}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shown
                      .filter((r) => `${r.block ?? ""}|${r.floor}` === fk)
                      .map((r) => (
                        <Card key={r.id} className={r.isActive ? "" : "opacity-60"}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold">Room {r.number}</p>
                              <p className="text-xs text-on-surface-variant">
                                {r.type || "—"} · {r.occupants}/{r.beds}
                                {!r.isActive && " · not in use"}
                              </p>
                            </div>
                            {can("hostel.setup") && (
                              <div className="flex gap-1">
                                <button className="material-symbols-outlined text-lg text-on-surface-variant" title="Edit" onClick={() => setEditRoom(r)}>
                                  edit
                                </button>
                                <button
                                  className="material-symbols-outlined text-lg text-on-surface-variant"
                                  title="Remove"
                                  onClick={async () => {
                                    if (!(await confirm({ title: `Remove room ${r.number}?`, message: "A room that has had boarders is kept as not in use.", confirmLabel: "Remove" }))) return;
                                    try {
                                      const res = await hostelApi.deleteRoom(hostel.id, r.id);
                                      showToast(res.deactivated ? "Marked not in use" : "Removed", "success");
                                      refresh();
                                    } catch (e) {
                                      showToast(errorMessage(e), "error");
                                    }
                                  }}
                                >
                                  delete
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 space-y-1">
                            {r.bedList.map((b) => (
                              <button
                                key={b.bed}
                                disabled={!r.isActive && !b.studentId}
                                onClick={async () => {
                                  if (moving && !b.studentId) {
                                    try {
                                      await hostelApi.allot({ studentId: moving.studentId!, roomId: r.id, bed: b.bed, fromDate: todayISO() });
                                      showToast(`${moving.name} moved to room ${r.number}`, "success");
                                      setMoving(null);
                                      refresh();
                                    } catch (e) {
                                      showToast(errorMessage(e), "error");
                                    }
                                    return;
                                  }
                                  if (b.studentId || can("hostel.allot")) setPicked({ room: r, bed: b });
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${b.studentId ? "bg-surface-container" : moving ? "border border-dashed border-primary text-primary" : "border border-dashed border-outline-variant/40 text-on-surface-variant"}`}
                              >
                                <span className="material-symbols-outlined text-base">{b.studentId ? "bed" : "add"}</span>
                                <span className="w-5 text-xs">{b.bed}</span>
                                <span className="truncate">{b.name ? <><b>{b.name}</b> <span className="text-xs text-on-surface-variant">{b.section}</span></> : "Empty"}</span>
                              </button>
                            ))}
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              );
            })
          )}
          {rooms.data && !rooms.data.rooms.length && <FormAlert tone="info">No rooms in this hostel yet.</FormAlert>}
        </>
      )}
      {editHostel && <HostelForm hostel={editHostel === "new" ? null : editHostel} staff={staff} onClose={() => setEditHostel(null)} onSaved={() => (setEditHostel(null), refresh())} />}
      {editRoom && hostel && <RoomsForm hostelId={hostel.id} room={editRoom === "new" ? null : editRoom} types={roomTypes} onClose={() => setEditRoom(null)} onSaved={() => (setEditRoom(null), refresh())} />}
      {picked && (
        <BedModal
          picked={picked}
          onClose={() => setPicked(null)}
          onDone={() => (setPicked(null), refresh())}
          onMove={(b) => {
            setPicked(null);
            setMoving(b);
          }}
        />
      )}
    </div>
  );
}

export default function HostelPage() {
  return (
    <RequirePermission permission={["hostel.allot", "hostel.view", "hostel.warden", "hostel.setup"]}>
      <PageHeader title="Rooms & Boarders" description="Hostels, their rooms and beds, and who sleeps where. Click an empty bed to allot it; the room type’s fee goes into the boarder’s fee instalments." />
      <Rooms />
    </RequirePermission>
  );
}
