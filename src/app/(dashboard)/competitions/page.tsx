"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { cocurricularApi, CompInput, CompOptions, Competition, day, EntryInput, MEDAL, place, STATUS, todayIso } from "@/lib/api/cocurricular";
import { HouseChip, LABEL, StudentSearch } from "@/components/cocurricular/Parts";
import { cn } from "@/lib/utils";

const useOptions = () => useQuery({ queryKey: ["cocurricular", "comp-options"], queryFn: cocurricularApi.compOptions });

function CompForm({ comp, onClose }: { comp: Competition | null; onClose: (id?: string) => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const opts = useOptions();
  const [f, setF] = useState<CompInput>(
    comp
      ? { name: comp.name, categoryId: comp.categoryId, levelId: comp.levelId, date: comp.date, endDate: comp.endDate, venue: comp.venue, description: comp.description, classIds: comp.classIds, kind: comp.kind, byHouse: comp.byHouse, inchargeId: comp.inchargeId, clubId: comp.clubId, onCalendar: comp.onCalendar }
      : { name: "", categoryId: null, levelId: null, date: todayIso(), endDate: null, venue: null, description: null, classIds: [], kind: "individual", byHouse: false, inchargeId: null, clubId: null, onCalendar: true }
  );
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof CompInput>(k: K, v: CompInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setError(null);
    try {
      const r = comp ? await cocurricularApi.updateCompetition(comp.id, f) : await cocurricularApi.createCompetition(f);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast(comp ? "Saved" : "Competition added", "success");
      onClose(r.id);
    } catch (e) {
      setError(errorMessage(e));
      setFields(e instanceof ApiError ? e.fieldErrors() : {});
    }
  };
  const o = opts.data;
  return (
    <Modal isOpen onClose={() => onClose()} title={comp ? `Change ${comp.name}` : "Add a competition"} width="max-w-2xl">
      {!o ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {error && <FormAlert>{error}</FormAlert>}
          <Input label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} error={fields.name} placeholder="Inter-house Debate" maxLength={150} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={f.categoryId ?? ""} onChange={(v) => set("categoryId", v || null)} options={[{ value: "", label: "—" }, ...o.categories.map((c) => ({ value: c.id, label: c.name }))]} />
            <Select
              label="Level"
              value={f.levelId ?? ""}
              onChange={(v) => {
                const lv = o.levels.find((l) => l.id === v);
                setF((x) => ({ ...x, levelId: v || null, byHouse: lv ? lv.inSchool && o.housesOn && /house/i.test(lv.name) : x.byHouse }));
              }}
              options={[{ value: "", label: "—" }, ...o.levels.map((l) => ({ value: l.id, label: l.name }))]}
            />
            <Input label="Date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} error={fields.date} />
            <Input label="Ends (if more than a day)" type="date" value={f.endDate ?? ""} min={f.date} onChange={(e) => set("endDate", e.target.value || null)} error={fields.endDate} />
            <Input label="Venue" value={f.venue ?? ""} onChange={(e) => set("venue", e.target.value || null)} maxLength={150} />
            <Select label="Teacher in-charge" value={f.inchargeId ?? ""} onChange={(v) => set("inchargeId", v || null)} options={[{ value: "", label: "—" }, ...o.staff.map((s) => ({ value: s.id, label: s.name }))]} />
          </div>
          <div className="flex gap-2">
            {(["individual", "team"] as const).map((k) => (
              <button key={k} type="button" onClick={() => set("kind", k)} className={cn("flex-1 rounded-xl border px-3 py-2 text-sm font-bold", f.kind === k ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/40 text-on-surface-variant")}>
                {k === "individual" ? "Each student on their own" : "Teams"}
              </button>
            ))}
          </div>
          <MultiSelect label="Classes it is for (none = all)" options={o.classes.map((c) => ({ value: c.id, label: c.name }))} defaultValues={f.classIds} onChange={(v) => set("classIds", v)} />
          {o.housesOn && (
            <Checkbox
              checked={f.byHouse}
              onChange={(v) => set("byHouse", v)}
              label="Results give house points"
              hint={`1st ${o.points.first} · 2nd ${o.points.second} · 3rd ${o.points.third} · taking part ${o.points.takingPart}${f.kind === "team" ? ` (×${o.points.teamTimes} for teams)` : ""} (System Settings → Co-curricular)`}
            />
          )}
          {o.clubs.length > 0 && <Select label="Run by a club (optional)" value={f.clubId ?? ""} onChange={(v) => set("clubId", v || null)} options={[{ value: "", label: "—" }, ...o.clubs.map((c) => ({ value: c.id, label: c.name }))]} />}
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Details and rules</span>
            <textarea value={f.description ?? ""} onChange={(e) => set("description", e.target.value || null)} rows={3} maxLength={3000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <Checkbox checked={f.onCalendar} onChange={(v) => set("onCalendar", v)} label="Show it on the school calendar" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

type Draft = EntryInput & { names: { id: string; name: string; section: string }[] };

function EntriesEditor({ comp, opts, onDone }: { comp: Competition; opts: CompOptions; onDone: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const team = comp.kind === "team";
  const [rows, setRows] = useState<Draft[]>(comp.entries.map((e) => ({ id: e.id, teamName: e.teamName, houseId: e.houseId, studentIds: e.students.map((s) => s.id), names: e.students.map((s) => ({ id: s.id, name: s.name, section: s.section })), position: e.position, award: e.award, points: comp.status === "done" ? e.points : null, remark: e.remark })));
  const [resultsOut, setResultsOut] = useState(comp.resultsOut);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blank = (): Draft => ({ id: null, teamName: null, houseId: null, studentIds: [], names: [], position: null, award: null, points: null, remark: null });
  const upd = (i: number, v: Partial<Draft>) => setRows((x) => x.map((r, k) => (k === i ? { ...r, ...v } : r)));
  const taken = rows.flatMap((r) => r.studentIds);
  const auto = (pos: number | null) => (pos === 1 ? opts.points.first : pos === 2 ? opts.points.second : pos === 3 ? opts.points.third : opts.points.takingPart) * (team ? opts.points.teamTimes : 1);
  const save = async (done: boolean) => {
    setError(null);
    setBusy(true);
    try {
      await cocurricularApi.saveEntries(comp.id, { entries: rows.map(({ names, ...r }) => (void names, r)), done, resultsOut: done ? resultsOut : false });
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast(done ? "Results saved" : "Entries saved", "success");
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 font-bold">Entries and results</p>
        {team && comp.byHouse && opts.houses.length > 0 && (
          <Button variant="tertiary" onClick={() => setRows((x) => [...x, ...opts.houses.filter((h) => !x.some((r) => r.houseId === h.id)).map((h) => ({ ...blank(), teamName: `${h.name} House`, houseId: h.id }))])}>
            + A team for every house
          </Button>
        )}
        <Button variant="tertiary" onClick={() => setRows((x) => [...x, blank()])}>
          + Add {team ? "a team" : "a student"}
        </Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="space-y-2 rounded-xl bg-surface-container-low p-3">
          <div className="flex flex-wrap items-end gap-2">
            {team && <Input label="Team" value={r.teamName ?? ""} onChange={(e) => upd(i, { teamName: e.target.value || null })} placeholder="Red House / VIII-A" className="w-48" />}
            {team && opts.housesOn && (
              <Select className="w-40" label="House" value={r.houseId ?? ""} onChange={(v) => upd(i, { houseId: v || null })} options={[{ value: "", label: "—" }, ...opts.houses.map((h) => ({ value: h.id, label: h.name }))]} />
            )}
            {!team && (
              <div className="min-w-[14rem] flex-1">
                {r.names[0] ? (
                  <p className="py-2 text-sm">
                    <b>{r.names[0].name}</b> <span className="text-on-surface-variant">{r.names[0].section}</span>
                    <button type="button" onClick={() => upd(i, { studentIds: [], names: [] })} className="ml-2 text-xs font-bold text-primary">
                      change
                    </button>
                  </p>
                ) : (
                  <StudentSearch classIds={comp.classIds} exclude={taken} onPick={(s) => upd(i, { studentIds: [s.id], names: [{ id: s.id, name: s.name, section: s.section }] })} />
                )}
              </div>
            )}
            <Select className="w-32" label="Place" value={r.position == null ? "" : String(r.position)} onChange={(v) => upd(i, { position: v ? Number(v) : null })} options={[{ value: "", label: "—" }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${MEDAL[n] ?? ""} ${place(n)}` }))]} />
            <Input label="Award" value={r.award ?? ""} onChange={(e) => upd(i, { award: e.target.value || null })} placeholder="Best speaker" className="w-40" />
            {comp.byHouse && (
              <Input label={`Points (auto ${auto(r.position)})`} type="number" min={0} value={r.points == null ? "" : String(r.points)} onChange={(e) => upd(i, { points: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))) })} className="w-32" />
            )}
            <button type="button" aria-label="Remove entry" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} className="mb-1 h-9 w-9 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-error">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          {team && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {r.names.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs">
                    {s.name} <span className="text-on-surface-variant">{s.section}</span>
                    <button type="button" aria-label={`Remove ${s.name}`} onClick={() => upd(i, { studentIds: r.studentIds.filter((x) => x !== s.id), names: r.names.filter((x) => x.id !== s.id) })}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <StudentSearch classIds={comp.classIds} exclude={taken} placeholder="Add a team member" onPick={(s) => upd(i, { studentIds: [...r.studentIds, s.id], names: [...r.names, { id: s.id, name: s.name, section: s.section }] })} />
            </div>
          )}
        </div>
      ))}
      {!rows.length && <p className="text-sm text-on-surface-variant">No entries yet.</p>}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant/15 pt-3">
        <Checkbox checked={resultsOut} onChange={setResultsOut} label="Show the results to students and parents (they are told)" />
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => save(false)} loading={busy}>
          Save entries
        </Button>
        <Button onClick={() => save(true)} loading={busy} disabled={!rows.length}>
          Save results
        </Button>
      </div>
    </Card>
  );
}

function CompDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["cocurricular", "competition", id], queryFn: () => cocurricularApi.competition(id) });
  const opts = useOptions();
  const [editing, setEditing] = useState(false);
  const [entries, setEntries] = useState(false);
  const [print, setPrint] = useState<"merit" | "participation" | "all" | null>(null);
  if (q.isLoading || !opts.data) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const c = q.data!;
  const cancel = async (on: boolean) => {
    if (on && !(await confirm({ title: `Cancel ${c.name}?`, message: "It stays in the list as cancelled; its house points are removed and the calendar shows it cancelled.", confirmLabel: "Cancel it", danger: true }))) return;
    try {
      await cocurricularApi.updateCompetition(c.id, { name: c.name, categoryId: c.categoryId, levelId: c.levelId, date: c.date, endDate: c.endDate, venue: c.venue, description: c.description, classIds: c.classIds, kind: c.kind, byHouse: c.byHouse, inchargeId: c.inchargeId, clubId: c.clubId, onCalendar: c.onCalendar, status: on ? "cancelled" : "upcoming" });
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${c.name}?`, message: "Its entries, results and house points go too.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await cocurricularApi.deleteCompetition(c.id);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      onBack();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const houses = opts.data.houses;
  const ranked = [...c.entries].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-primary">
        ← All competitions
      </button>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">{c.name}</h2>
            <p className="text-sm text-on-surface-variant">
              {[`${day(c.date)}${c.endDate ? ` – ${day(c.endDate)}` : ""}`, c.venue, c.level, c.category, c.kind === "team" ? "Teams" : "Individual", c.incharge ? `In-charge: ${c.incharge}` : null, c.club].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
              {c.byHouse && <Pill tone="primary">House points</Pill>}
              {c.status === "done" && <Pill tone={c.resultsOut ? "success" : "warning"}>{c.resultsOut ? "Families see the results" : "Results not shown yet"}</Pill>}
              {c.onCalendar && <Pill>On the calendar</Pill>}
            </div>
            {c.description && <p className="mt-2 whitespace-pre-line text-sm">{c.description}</p>}
          </div>
          {c.can.manage && (
            <div className="flex flex-wrap gap-2">
              {c.status !== "cancelled" && <Button onClick={() => setEntries(true)}>{c.status === "done" ? "Change results" : "Entries & results"}</Button>}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Change
              </Button>
              {c.status === "cancelled" ? (
                <Button variant="secondary" onClick={() => cancel(false)}>
                  Restore
                </Button>
              ) : (
                c.status === "upcoming" && (
                  <Button variant="tertiary" onClick={() => cancel(true)}>
                    Cancel it
                  </Button>
                )
              )}
              <Button variant="tertiary" className="text-error" onClick={remove}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </Card>

      {entries ? (
        <EntriesEditor comp={c} opts={opts.data} onDone={() => setEntries(false)} />
      ) : (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 font-bold">{c.status === "done" ? "Results" : `Entries (${c.entries.length})`}</p>
            {c.can.manage && c.entries.some((e) => e.students.length) && (
              <>
                {c.entries.some((e) => e.position) && (
                  <Button variant="secondary" onClick={() => setPrint("merit")}>
                    Merit certificates
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setPrint(c.status === "done" ? "participation" : "all")}>
                  {c.status === "done" ? "Participation certificates" : "Certificates"}
                </Button>
              </>
            )}
          </div>
          {ranked.map((e) => {
            const h = e.house ?? houses.find((x) => x.id === e.students[0]?.houseId);
            return (
              <div key={e.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl px-3 py-2", e.position && e.position <= 3 ? "bg-amber-50" : "bg-surface-container-low")}>
                <span className="w-16 text-sm font-bold">{e.position ? `${MEDAL[e.position] ?? "🏅"} ${place(e.position)}` : "—"}</span>
                <span className="min-w-[12rem] flex-1 text-sm">
                  <b>{e.teamName || e.students.map((s) => s.name).join(", ") || h?.name}</b>
                  {e.teamName && e.students.length > 0 && <span className="block text-xs text-on-surface-variant">{e.students.map((s) => `${s.name} (${s.section})`).join(", ")}</span>}
                  {!e.teamName && e.students[0] && <span className="text-xs text-on-surface-variant"> {e.students[0].section}</span>}
                </span>
                {h && <HouseChip name={h.name} colour={h.colour} />}
                {e.award && <Pill tone="primary">{e.award}</Pill>}
                {c.byHouse && c.status === "done" && <span className="w-16 text-right text-xs font-bold text-green-700">+{e.points} pts</span>}
              </div>
            );
          })}
          {!c.entries.length && <p className="text-sm text-on-surface-variant">No entries yet.</p>}
        </Card>
      )}

      {editing && <CompForm comp={c} onClose={() => setEditing(false)} />}
      {print && <DocumentViewer docKey="competition_certificate" params={{ competition: c.id, which: print }} title={`${c.name}: certificates`} filename="certificates.pdf" onClose={() => setPrint(null)} />}
    </div>
  );
}

function Competitions() {
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("open");
  const opts = useOptions();
  const [f, setF] = useState({ status: "", category: "", level: "", search: "", page: 1 });
  const q = useQuery({ queryKey: ["cocurricular", "competitions", f], queryFn: () => cocurricularApi.competitions(f), enabled: !open });
  const [adding, setAdding] = useState(false);
  if (open) return <CompDetail id={open} onBack={() => router.push("/competitions")} />;
  const d = q.data;
  const pages = Math.max(1, Math.ceil((d?.total ?? 0) / 25));
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="Search" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} icon="search" />
        <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v, page: 1 })} options={[{ value: "", label: "All" }, { value: "upcoming", label: "Coming up" }, { value: "done", label: "Results" }, { value: "cancelled", label: "Cancelled" }]} />
        <Select label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v, page: 1 })} options={[{ value: "", label: "All" }, ...(opts.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="Level" value={f.level} onChange={(v) => setF({ ...f, level: v, page: 1 })} options={[{ value: "", label: "All" }, ...(opts.data?.levels ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
        <div className="flex items-end justify-end">{d?.can.manage && <Button onClick={() => setAdding(true)}>Add a competition</Button>}</div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Competition</th>
                <th className="px-3 py-3">Level</th>
                <th className="px-3 py-3">Entries</th>
                <th className="px-3 py-3">Winner</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {d!.rows.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/competitions?open=${r.id}`)} className="cursor-pointer border-t border-outline-variant/10 hover:bg-surface-container-low/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{day(r.date)}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-on-surface">{r.name}</p>
                    <p className="text-xs text-on-surface-variant">{[r.category, r.venue, r.kind === "team" ? "Teams" : null, r.byHouse ? "House points" : null].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{r.level ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{r.entries}</td>
                  <td className="px-3 py-3 text-xs">{r.winner ? `🥇 ${r.winner}` : "—"}</td>
                  <td className="px-3 py-3">
                    <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                  </td>
                </tr>
              ))}
              {!d!.rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant">
                    No competitions{f.status || f.category || f.level || f.search ? " match" : " yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="secondary" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>
            Previous
          </Button>
          <span>
            {f.page} / {pages}
          </span>
          <Button variant="secondary" disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })}>
            Next
          </Button>
        </div>
      )}
      {adding && <CompForm comp={null} onClose={(id) => { setAdding(false); if (id) router.push(`/competitions?open=${id}`); }} />}
    </div>
  );
}

export default function CompetitionsPage() {
  return (
    <RequirePermission permission={["cocurricular.view", "competition.manage"]}>
      <PageHeader title="Competitions" description="Competitions in the school and outside: entries, results, house points and certificates." />
      <Suspense fallback={<PageLoader />}>
        <Competitions />
      </Suspense>
    </RequirePermission>
  );
}
