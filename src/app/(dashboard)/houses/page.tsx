"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Allocation, cocurricularApi, day, HousesOverview, place, StudentHit, todayIso } from "@/lib/api/cocurricular";
import { HouseChip, LABEL, StudentSearch } from "@/components/cocurricular/Parts";
import { cn } from "@/lib/utils";

type On = Extract<HousesOverview, { on: true }>;
type HouseRow = On["houses"][number];

function GivePoints({ d, onClose }: { d: On; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [houseId, setHouseId] = useState(d.houses[0]?.id ?? "");
  const [points, setPoints] = useState("5");
  const [take, setTake] = useState(false);
  const [reason, setReason] = useState("");
  const [student, setStudent] = useState<StudentHit | null>(null);
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setError(null);
    try {
      const n = Math.abs(Math.floor(Number(points) || 0));
      await cocurricularApi.givePoints({ houseId, points: take ? -n : n, reason: reason.trim(), studentId: student?.id ?? null, date });
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast(take ? "Points taken" : "Points given", "success");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="House points" width="max-w-lg">
      <div className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex gap-2">
          {[false, true].map((t) => (
            <button key={String(t)} type="button" onClick={() => setTake(t)} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold border", take === t ? (t ? "border-error bg-error/10 text-error" : "border-green-700 bg-green-50 text-green-800") : "border-outline-variant/40 text-on-surface-variant")}>
              {t ? "Take points" : "Give points"}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="House" value={houseId} onChange={setHouseId} options={d.houses.map((h) => ({ value: h.id, label: h.name }))} />
          <Input label="Points" type="number" min={1} max={1000} value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
        <Input label="Why" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={take ? "Littering near the house board" : "Cleanest corridor of the month"} maxLength={200} />
        <Input label="Date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        <div>
          <p className={LABEL}>For a student (optional)</p>
          <div className="mt-2">{student ? <p className="text-sm"><b>{student.name}</b> {student.section} <button type="button" onClick={() => setStudent(null)} className="ml-2 text-xs font-bold text-error">remove</button></p> : <StudentSearch onPick={setStudent} />}</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!houseId || reason.trim().length < 2}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Officials({ d, house, onClose }: { d: On; house: HouseRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const staff = useQuery({ queryKey: ["cocurricular", "club-options"], queryFn: cocurricularApi.clubOptions });
  const [rows, setRows] = useState(house.officials.map((o) => ({ role: o.role, staffId: o.staffId, studentId: o.studentId, name: o.name, section: o.section })));
  const [error, setError] = useState<string | null>(null);
  const isStaff = (role: string) => !!d.roles.find((r) => r.value === role)?.staff;
  const save = async () => {
    setError(null);
    try {
      await cocurricularApi.setOfficials(house.id, rows.map((r) => ({ role: r.role, staffId: isStaff(r.role) ? r.staffId : null, studentId: isStaff(r.role) ? null : r.studentId })));
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast("Saved", "success");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`${house.name}: house masters and captains`} width="max-w-2xl">
      <div className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-container-low p-3">
            <Select className="w-52" label="Role" value={r.role} onChange={(v) => setRows((x) => x.map((y, k) => (k === i ? { role: v, staffId: null, studentId: null, name: "", section: "" } : y)))} options={d.roles.map((x) => ({ value: x.value, label: x.label }))} />
            <div className="min-w-[14rem] flex-1">
              {isStaff(r.role) ? (
                <Select label="Teacher" value={r.staffId ?? ""} onChange={(v) => setRows((x) => x.map((y, k) => (k === i ? { ...y, staffId: v || null } : y)))} options={[{ value: "", label: "Choose…" }, ...(staff.data?.staff ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
              ) : r.studentId ? (
                <p className="py-2 text-sm">
                  <b>{r.name}</b> {r.section}{" "}
                  <button type="button" onClick={() => setRows((x) => x.map((y, k) => (k === i ? { ...y, studentId: null, name: "", section: "" } : y)))} className="ml-1 text-xs font-bold text-primary">
                    change
                  </button>
                </p>
              ) : (
                <StudentSearch placeholder={`A student of ${house.name}`} onPick={(s) => setRows((x) => x.map((y, k) => (k === i ? { ...y, studentId: s.id, name: s.name, section: s.section } : y)))} />
              )}
            </div>
            <button type="button" aria-label="Remove" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} className="mb-1 h-9 w-9 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-error">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
        <Button variant="tertiary" onClick={() => setRows((x) => [...x, { role: x.some((y) => y.role === "captain") ? "prefect" : "captain", staffId: null, studentId: null, name: "", section: "" }])}>
          + Add
        </Button>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function Allocate({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const opts = useQuery({ queryKey: ["cocurricular", "club-options"], queryFn: cocurricularApi.clubOptions });
  const [which, setWhich] = useState<"unassigned" | "all">("unassigned");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<Allocation | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (preview: boolean) => {
    if (!preview && which === "all" && !(await confirm({ title: "Put everyone in houses again?", message: "Students who already have a house may move to another one. House points stay with the houses.", confirmLabel: "Re-allocate", danger: true }))) return;
    setBusy(true);
    try {
      const r = await cocurricularApi.allocate({ which, classIds, preview });
      setPlan(r);
      if (r.done) {
        qc.invalidateQueries({ queryKey: ["cocurricular"] });
        showToast(`${r.students} students put in houses`, "success");
        onClose();
      }
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Put students in houses" width="max-w-xl">
      <div className="space-y-4 text-sm">
        <p className="text-on-surface-variant">Each student goes to the house with the fewest students of their section, keeping boys and girls even and brothers and sisters together (System Settings → Co-curricular).</p>
        <div className="flex gap-2">
          {(["unassigned", "all"] as const).map((w) => (
            <button key={w} type="button" onClick={() => (setWhich(w), setPlan(null))} className={cn("flex-1 rounded-xl px-3 py-2 font-bold border", which === w ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {w === "unassigned" ? "Only students without a house" : "Everyone again"}
            </button>
          ))}
        </div>
        <MultiSelect label="Classes (none = all)" options={(opts.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} defaultValues={classIds} onChange={(v) => (setClassIds(v), setPlan(null))} />
        {plan && (
          <Card className="space-y-2">
            <p className="font-bold">{plan.students} students would be placed</p>
            {plan.houses.map((h) => (
              <div key={h.houseId} className="flex items-center gap-2">
                <HouseChip name={h.name} colour={h.colour} className="flex-1" />
                <span className="text-xs text-on-surface-variant">+{h.adding}</span>
                <span className="w-20 text-right font-bold">{h.total} in all</span>
              </div>
            ))}
          </Card>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => run(true)} loading={busy && !plan}>
            Preview
          </Button>
          <Button onClick={() => run(false)} disabled={!plan || !plan.students} loading={busy && !!plan}>
            Put them in houses
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StrengthTab() {
  const q = useQuery({ queryKey: ["cocurricular", "strength"], queryFn: cocurricularApi.strength });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  const total = (h: string) => d.rows.reduce((a, r) => a + (r.counts[h] ?? 0), 0);
  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
            <th className="px-4 py-3">Section</th>
            {d.houses.map((h) => (
              <th key={h.id} className="px-3 py-3 text-center">
                <HouseChip name={h.name} colour={h.colour} />
              </th>
            ))}
            <th className="px-3 py-3 text-center">No house</th>
          </tr>
        </thead>
        <tbody>
          {d.rows.map((r) => (
            <tr key={r.sectionId} className="border-t border-outline-variant/10">
              <td className="px-4 py-2 font-semibold">{r.section}</td>
              {d.houses.map((h) => (
                <td key={h.id} className="px-3 py-2 text-center tabular-nums">
                  {r.counts[h.id] || "—"}
                </td>
              ))}
              <td className={cn("px-3 py-2 text-center tabular-nums", r.none && "font-bold text-amber-700")}>{r.none || "—"}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-outline-variant/30 font-bold">
            <td className="px-4 py-2">Total</td>
            {d.houses.map((h) => (
              <td key={h.id} className="px-3 py-2 text-center tabular-nums">
                {total(h.id)}
              </td>
            ))}
            <td className="px-3 py-2 text-center tabular-nums">{d.rows.reduce((a, r) => a + r.none, 0)}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function PointsTab({ d }: { d: On }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [house, setHouse] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["cocurricular", "points", house, page], queryFn: () => cocurricularApi.points({ house: house || undefined, page }) });
  const remove = async (id: string, reason: string) => {
    if (!(await confirm({ title: "Remove these points?", message: reason, confirmLabel: "Remove", danger: true }))) return;
    try {
      await cocurricularApi.removePoints(id);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / 50));
  return (
    <div className="space-y-3">
      <Select className="w-60" label="House" value={house} onChange={(v) => (setHouse(v), setPage(1))} options={[{ value: "", label: "All houses" }, ...d.houses.map((h) => ({ value: h.id, label: h.name }))]} />
      <Card padding="none" className="overflow-x-auto">
        {q.isLoading ? (
          <PageLoader />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {(q.data?.rows ?? []).map((r) => {
                const h = d.houses.find((x) => x.id === r.houseId);
                return (
                  <tr key={r.id} className="border-t border-outline-variant/10 first:border-0">
                    <td className="px-4 py-2 text-xs text-on-surface-variant whitespace-nowrap">{day(r.date)}</td>
                    <td className="px-3 py-2">{h ? <HouseChip name={h.name} colour={h.colour} /> : r.house}</td>
                    <td className={cn("px-3 py-2 text-right font-bold tabular-nums", r.points < 0 ? "text-error" : "text-green-700")}>{r.points > 0 ? `+${r.points}` : r.points}</td>
                    <td className="px-3 py-2">
                      {r.reason}
                      {r.student && <span className="text-on-surface-variant"> · {r.student}</span>}
                      <span className="block text-[11px] text-on-surface-variant/70">{r.fromResult ? "from a result" : r.by ? `by ${r.by}` : ""}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {d.can.points && !r.fromResult && (
                        <button type="button" onClick={() => remove(r.id, r.reason)} className="text-xs font-bold text-error hover:opacity-70">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!q.data?.rows.length && (
                <tr>
                  <td className="px-4 py-10 text-center text-on-surface-variant">No points yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function HouseStudents({ house, onClose }: { house: HouseRow; onClose: () => void }) {
  const q = useQuery({ queryKey: ["cocurricular", "house-students", house.id], queryFn: () => cocurricularApi.houseStudents(house.id) });
  return (
    <Modal isOpen onClose={onClose} title={`${house.name}: ${house.students} students`} width="max-w-2xl">
      {q.isLoading ? (
        <PageLoader />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {(q.data ?? []).map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/10 first:border-0">
                  <td className="px-2 py-1.5 font-semibold">
                    <Link href={`/students/${s.id}`} className="hover:text-primary">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">{s.section}</td>
                  <td className="px-2 py-1.5 text-xs text-on-surface-variant">{s.admissionNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Houses() {
  const q = useQuery({ queryKey: ["cocurricular", "houses"], queryFn: cocurricularApi.houses });
  const [tab, setTab] = useState<"standings" | "strength" | "points">("standings");
  const [give, setGive] = useState(false);
  const [alloc, setAlloc] = useState(false);
  const [officials, setOfficials] = useState<HouseRow | null>(null);
  const [students, setStudents] = useState<HouseRow | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.on) return <FormAlert tone="info">Houses are switched off. Switch them on in System Settings → Academic, then add them in Masters → Houses.</FormAlert>;
  const top = d.houses[0]?.points ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["standings", "strength", "points"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-xl px-4 py-2 text-sm font-bold", tab === t ? "bg-primary text-white" : "bg-surface-container-low text-primary hover:bg-surface-container-high")}>
            {t === "standings" ? "Standings" : t === "strength" ? "Strength by class" : "All points"}
          </button>
        ))}
        <span className="flex-1" />
        {d.can.manage && (
          <Button variant="secondary" onClick={() => setAlloc(true)}>
            Put students in houses
          </Button>
        )}
        {d.can.points && <Button onClick={() => setGive(true)}>House points</Button>}
      </div>
      {d.unassigned > 0 && (
        <FormAlert tone="warning">
          {d.unassigned} student{d.unassigned === 1 ? " has" : "s have"} no house this session.{d.can.manage ? " Use “Put students in houses”." : ""}
        </FormAlert>
      )}

      {tab === "standings" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {d.houses.map((h) => (
              <Card key={h.id} padding="none" className="overflow-hidden">
                <div className="h-2" style={{ background: h.colour }} />
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xl font-extrabold" style={{ color: h.colour }}>
                        {h.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {place(h.rank)} · {h.students} students
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black tabular-nums">{h.points}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">points</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container">
                    <div className="h-2 rounded-full" style={{ width: `${top > 0 ? Math.max(4, (Math.max(0, h.points) / top) * 100) : 0}%`, background: h.colour }} />
                  </div>
                  <ul className="space-y-0.5 text-xs">
                    {h.officials.map((o) => (
                      <li key={o.id}>
                        <span className="text-on-surface-variant">{o.roleLabel}:</span> <b>{o.name}</b>
                        {o.section && <span className="text-on-surface-variant"> ({o.section})</span>}
                      </li>
                    ))}
                    {!h.officials.length && <li className="text-on-surface-variant">No house master or captain yet</li>}
                  </ul>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStudents(h)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                      Students
                    </button>
                    {d.can.manage && (
                      <button type="button" onClick={() => setOfficials(h)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                        Masters & captains
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="space-y-2">
            <p className="font-bold">Latest points</p>
            {d.recent.map((r) => {
              const h = d.houses.find((x) => x.id === r.houseId);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 py-1.5 text-sm last:border-0">
                  <span className="w-20 text-xs text-on-surface-variant">{day(r.date)}</span>
                  {h && <HouseChip name={h.name} colour={h.colour} className="w-24" />}
                  <span className={cn("w-12 text-right font-bold tabular-nums", r.points < 0 ? "text-error" : "text-green-700")}>{r.points > 0 ? `+${r.points}` : r.points}</span>
                  <span className="flex-1">
                    {r.reason}
                    {r.student && <span className="text-on-surface-variant"> · {r.student}</span>}
                  </span>
                </div>
              );
            })}
            {!d.recent.length && <p className="text-sm text-on-surface-variant">No points yet. Results of inter-house competitions add them by themselves.</p>}
            <Pill tone="neutral">{d.year}</Pill>
          </Card>
        </>
      )}
      {tab === "strength" && <StrengthTab />}
      {tab === "points" && <PointsTab d={d} />}

      {give && <GivePoints d={d} onClose={() => setGive(false)} />}
      {alloc && <Allocate onClose={() => setAlloc(false)} />}
      {officials && <Officials d={d} house={officials} onClose={() => setOfficials(null)} />}
      {students && <HouseStudents house={students} onClose={() => setStudents(null)} />}
    </div>
  );
}

export default function HousesPage() {
  return (
    <RequirePermission permission={["cocurricular.view", "house.manage", "house.points"]}>
      <PageHeader title="Houses" description="House standings this session, house masters and captains, points, and which students are in each house." />
      <Houses />
    </RequirePermission>
  );
}
