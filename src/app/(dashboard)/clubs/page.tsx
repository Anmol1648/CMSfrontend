"use client";

import Link from "next/link";
import { Suspense, useRef, useState } from "react";
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
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { Club, ClubInput, cocurricularApi, day, StudentHit, todayIso } from "@/lib/api/cocurricular";
import { LABEL, ServerImage, StudentSearch } from "@/components/cocurricular/Parts";
import { cn } from "@/lib/utils";

function ClubForm({ club, onClose }: { club: Club | null; onClose: (id?: string) => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const opts = useQuery({ queryKey: ["cocurricular", "club-options"], queryFn: cocurricularApi.clubOptions });
  const [f, setF] = useState<ClubInput>(club ? { name: club.name, description: club.description, categoryId: club.categoryId, inchargeIds: club.inchargeIds, classIds: club.classIds, maxMembers: club.maxMembers, meets: club.meets, openToRequests: club.openToRequests, isActive: club.isActive } : { name: "", description: null, categoryId: null, inchargeIds: [], classIds: [], maxMembers: null, meets: null, openToRequests: true, isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof ClubInput>(k: K, v: ClubInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setError(null);
    try {
      const r = club ? await cocurricularApi.updateClub(club.id, f) : await cocurricularApi.createClub(f);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast(club ? "Saved" : "Club added", "success");
      onClose(r.id);
    } catch (e) {
      setError(errorMessage(e));
      setFields(e instanceof ApiError ? e.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={() => onClose()} title={club ? `Change ${club.name}` : "Add a club"} width="max-w-2xl">
      {!opts.data ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {error && <FormAlert>{error}</FormAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} error={fields.name} placeholder="Eco Club" maxLength={80} />
            <Select label="Category" value={f.categoryId ?? ""} onChange={(v) => set("categoryId", v || null)} options={[{ value: "", label: "—" }, ...opts.data.categories.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          <label className="flex flex-col gap-2">
            <span className={LABEL}>What it does</span>
            <textarea value={f.description ?? ""} onChange={(e) => set("description", e.target.value || null)} rows={2} maxLength={1000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <MultiSelect label="Teachers in-charge" options={opts.data.staff.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))} defaultValues={f.inchargeIds} onChange={(v) => set("inchargeIds", v)} />
          <MultiSelect label="Classes that may join (none = all)" options={opts.data.classes.map((c) => ({ value: c.id, label: c.name }))} defaultValues={f.classIds} onChange={(v) => set("classIds", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Most members (empty = no limit)" type="number" min={1} value={f.maxMembers == null ? "" : String(f.maxMembers)} onChange={(e) => set("maxMembers", e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null)} />
            <Input label="Meets" value={f.meets ?? ""} onChange={(e) => set("meets", e.target.value || null)} placeholder="Saturdays, 7th period" maxLength={120} />
          </div>
          <Checkbox checked={f.openToRequests} onChange={(v) => set("openToRequests", v)} label="Students and parents can ask to join" hint="The teacher in-charge accepts or refuses each request." />
          <Checkbox checked={f.isActive} onChange={(v) => set("isActive", v)} label="Running this session" />
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

type Meeting = Club["meetings"][number];

function MeetingForm({ club, meeting, onClose }: { club: Club; meeting: Meeting | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [date, setDate] = useState(meeting?.date ?? todayIso());
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [present, setPresent] = useState<Set<string>>(new Set(meeting?.presentIds ?? club.members.map((m) => m.studentId)));
  const [photos, setPhotos] = useState<{ id: string; name: string }[]>((meeting?.photoIds ?? []).map((id) => ({ id, name: "Photo" })));
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const save = async () => {
    setError(null);
    try {
      const input = { date, title: title.trim(), notes: notes.trim() || null, presentIds: Array.from(present), photoIds: photos.map((p) => p.id) };
      if (meeting) await cocurricularApi.updateMeeting(meeting.id, input);
      else await cocurricularApi.addMeeting(club.id, input);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast("Saved", "success");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const upload = async (f: File) => {
    try {
      setPhotos((x) => [...x, { id: "", name: f.name }]);
      const r = await cocurricularApi.upload(f);
      setPhotos((x) => [...x.filter((p) => p.id), r]);
    } catch (e) {
      setPhotos((x) => x.filter((p) => p.id));
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={meeting ? "Change the meeting" : "Record a meeting or activity"} width="max-w-2xl">
      <div className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Input label="Date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          <Input label="What was done" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plantation near the gate" maxLength={150} />
        </div>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={3000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
        </label>
        <div>
          <div className="flex items-center justify-between">
            <p className={LABEL}>
              Who came ({present.size} of {club.members.length})
            </p>
            <div className="flex gap-3 text-xs font-bold text-primary">
              <button type="button" onClick={() => setPresent(new Set(club.members.map((m) => m.studentId)))}>
                All
              </button>
              <button type="button" onClick={() => setPresent(new Set())}>
                None
              </button>
            </div>
          </div>
          <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
            {club.members.map((m) => (
              <label key={m.studentId} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm", present.has(m.studentId) ? "bg-green-50" : "bg-surface-container-low")}>
                <input type="checkbox" checked={present.has(m.studentId)} onChange={(e) => setPresent((s) => { const n = new Set(s); if (e.target.checked) n.add(m.studentId); else n.delete(m.studentId); return n; })} className="accent-[#1A365D]" />
                <span className="flex-1">{m.name}</span>
                <span className="text-xs text-on-surface-variant">{m.section}</span>
              </label>
            ))}
            {!club.members.length && <p className="text-sm text-on-surface-variant">No members yet.</p>}
          </div>
        </div>
        <div>
          <p className={LABEL}>Photos</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {photos.map((p, i) => (
              <span key={`${p.id}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {p.id ? p.name : "Uploading…"}
                {p.id && (
                  <button type="button" aria-label="Remove photo" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))}>
                    ×
                  </button>
                )}
              </span>
            ))}
            {photos.length < 10 && (
              <Button variant="tertiary" onClick={() => file.current?.click()}>
                + Add photo
              </Button>
            )}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={title.trim().length < 2 || photos.some((p) => !p.id)}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ClubDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["cocurricular", "club", id], queryFn: () => cocurricularApi.club(id) });
  const opts = useQuery({ queryKey: ["cocurricular", "club-options"], queryFn: cocurricularApi.clubOptions });
  const [tab, setTab] = useState<"members" | "requests" | "meetings">("members");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<StudentHit[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null | "new">(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const c = q.data!;
  const set = (x: Club) => qc.setQueryData(["cocurricular", "club", id], x);
  const act = async (fn: () => Promise<Club>, done?: string) => {
    try {
      set(await fn());
      qc.invalidateQueries({ queryKey: ["cocurricular", "clubs"] });
      if (done) showToast(done, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${c.name}?`, message: "Only a club that never had members can be deleted; otherwise make it inactive.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await cocurricularApi.deleteClub(c.id);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      onBack();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-primary">
        ← All clubs
      </button>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">
              {c.name} {!c.isActive && <Pill>Not running</Pill>}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {[c.category, c.incharges.length ? `In-charge: ${c.incharges.join(", ")}` : "No teacher in-charge yet", c.meets].filter(Boolean).join(" · ")}
            </p>
            {c.description && <p className="mt-1 text-sm">{c.description}</p>}
          </div>
          {c.can.manage && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Change
              </Button>
              <Button variant="tertiary" className="text-error" onClick={remove}>
                Delete
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-on-surface-variant">
          {c.members.length}
          {c.maxMembers ? ` of ${c.maxMembers}` : ""} members · {c.meetings.length} meetings this session
          {opts.data && c.classIds.length ? ` · for ${c.classIds.map((x) => opts.data!.classes.find((k) => k.id === x)?.name).filter(Boolean).join(", ")}` : ""}
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(["members", "requests", "meetings"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-xl px-4 py-2 text-sm font-bold", tab === t ? "bg-primary text-white" : "bg-surface-container-low text-primary hover:bg-surface-container-high")}>
            {t === "members" ? `Members (${c.members.length})` : t === "requests" ? `Requests${c.requests.length ? ` (${c.requests.length})` : ""}` : `Meetings & activities (${c.meetings.length})`}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <Card className="space-y-3">
          {c.can.run && (
            <div className="space-y-2">
              <StudentSearch classIds={c.classIds} exclude={[...c.members.map((m) => m.studentId), ...adding.map((a) => a.id)]} onPick={(s) => setAdding((x) => [...x, s])} />
              {adding.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {adding.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {a.name} · {a.section}
                      <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAdding((x) => x.filter((y) => y.id !== a.id))}>
                        ×
                      </button>
                    </span>
                  ))}
                  <Button onClick={() => act(() => cocurricularApi.addMembers(c.id, adding.map((a) => a.id)), `${adding.length} added`).then(() => setAdding([]))}>Add {adding.length}</Button>
                </div>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                  <th className="py-2 pr-3">Student</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Came</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Remark</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {c.members.map((m) => (
                  <tr key={m.id} className="border-t border-outline-variant/10">
                    <td className="py-2 pr-3">
                      <Link href={`/students/${m.studentId}`} className="font-semibold hover:text-primary">
                        {m.name}
                      </Link>
                      <span className="block text-xs text-on-surface-variant">{m.section}</span>
                    </td>
                    <td className="px-3 py-2">
                      {c.can.run ? (
                        <select value={m.role} onChange={(e) => act(() => cocurricularApi.updateMember(m.id, { role: e.target.value }))} className="rounded-lg bg-surface-container-low px-2 py-1 text-xs" aria-label={`Role of ${m.name}`}>
                          {(opts.data?.roles ?? [{ value: m.role, label: m.roleLabel }]).map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        m.roleLabel
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {m.attended}/{c.meetings.length}
                    </td>
                    <td className="px-3 py-2">{c.can.run ? <input defaultValue={m.grade ?? ""} maxLength={10} onBlur={(e) => e.target.value !== (m.grade ?? "") && act(() => cocurricularApi.updateMember(m.id, { grade: e.target.value || null }))} className="w-14 rounded-lg bg-surface-container-low px-2 py-1 text-center text-xs" aria-label={`Grade of ${m.name}`} /> : m.grade}</td>
                    <td className="px-3 py-2">{c.can.run ? <input defaultValue={m.remark ?? ""} maxLength={300} onBlur={(e) => e.target.value !== (m.remark ?? "") && act(() => cocurricularApi.updateMember(m.id, { remark: e.target.value || null }))} placeholder="Takes part keenly" className="w-full min-w-[10rem] rounded-lg bg-surface-container-low px-2 py-1 text-xs" aria-label={`Remark for ${m.name}`} /> : m.remark}</td>
                    <td className="px-1 py-2 text-right">
                      {c.can.run && (
                        <button type="button" onClick={async () => (await confirm({ title: `Remove ${m.name} from ${c.name}?`, message: "Their meetings and grade stay in the record.", confirmLabel: "Remove" })) && act(() => cocurricularApi.updateMember(m.id, { status: "left" }), "Removed")} className="text-xs font-bold text-error hover:opacity-70">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!c.members.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {c.can.run && <p className="text-xs text-on-surface-variant">Grades and remarks are the in-charge’s for the session (co-scholastic); they show on the student’s profile and report card.</p>}
        </Card>
      )}

      {tab === "requests" && (
        <Card className="space-y-2">
          {c.requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 py-2 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {r.name} <span className="font-normal text-on-surface-variant">{r.section}</span>
                </p>
                {r.requestNote && <p className="text-sm">“{r.requestNote}”</p>}
                <p className="text-xs text-on-surface-variant">{r.requestedBy ? `Asked by ${r.requestedBy}` : "Asked"}</p>
              </div>
              {c.can.run && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => act(() => cocurricularApi.updateMember(r.id, { status: "refused" }), "Refused")}>
                    Refuse
                  </Button>
                  <Button onClick={() => act(() => cocurricularApi.updateMember(r.id, { status: "active" }), "Accepted")}>Accept</Button>
                </div>
              )}
            </div>
          ))}
          {!c.requests.length && <p className="text-sm text-on-surface-variant">No requests waiting.</p>}
        </Card>
      )}

      {tab === "meetings" && (
        <div className="space-y-3">
          {c.can.run && <Button onClick={() => setMeeting("new")}>Record a meeting or activity</Button>}
          {c.meetings.map((m) => (
            <Card key={m.id} className="space-y-2">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <p className="font-bold">{m.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {day(m.date)} · {m.present} of {c.members.length} came
                  </p>
                  {m.notes && <p className="mt-1 text-sm">{m.notes}</p>}
                </div>
                {c.can.run && (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setMeeting(m)} className="text-xs font-bold uppercase tracking-widest text-primary">
                      Change
                    </button>
                    <button type="button" onClick={async () => (await confirm({ title: "Delete this meeting?", message: m.title, confirmLabel: "Delete", danger: true })) && act(() => cocurricularApi.deleteMeeting(m.id), "Deleted")} className="text-xs font-bold uppercase tracking-widest text-error">
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {m.photoIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {m.photoIds.map((p) => (
                    <ServerImage key={p} path={cocurricularApi.photoPath(m.id, p)} alt={m.title} className="h-24 w-32" />
                  ))}
                </div>
              )}
            </Card>
          ))}
          {!c.meetings.length && <FormAlert tone="info">No meetings recorded this session.</FormAlert>}
        </div>
      )}

      {editing && <ClubForm club={c} onClose={() => setEditing(false)} />}
      {meeting && <MeetingForm club={c} meeting={meeting === "new" ? null : meeting} onClose={() => setMeeting(null)} />}
    </div>
  );
}

function Clubs() {
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("open");
  const q = useQuery({ queryKey: ["cocurricular", "clubs"], queryFn: cocurricularApi.clubs, enabled: !open });
  const [adding, setAdding] = useState(false);
  const [mine, setMine] = useState(false);
  if (open) return <ClubDetail id={open} onBack={() => router.push("/clubs")} />;
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  const shown = d.clubs.filter((c) => !mine || c.mine);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {d.clubs.some((c) => c.mine) && <Checkbox checked={mine} onChange={setMine} label="Only the clubs I run" />}
        <span className="flex-1" />
        {d.can.manage && <Button onClick={() => setAdding(true)}>Add a club</Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <button key={c.id} type="button" onClick={() => router.push(`/clubs?open=${c.id}`)} className={cn("rounded-2xl bg-surface-lowest p-5 text-left shadow-sm ring-1 ring-outline-variant/15 transition hover:ring-primary/40", !c.isActive && "opacity-60")}>
            <div className="flex items-start gap-2">
              <p className="flex-1 text-lg font-extrabold text-primary">{c.name}</p>
              {c.requests > 0 && c.canRun && <Pill tone="warning">{c.requests} waiting</Pill>}
              {!c.isActive && <Pill>Not running</Pill>}
            </div>
            <p className="text-xs text-on-surface-variant">{[c.category, c.classes].filter(Boolean).join(" · ")}</p>
            {c.description && <p className="mt-2 line-clamp-2 text-sm">{c.description}</p>}
            <p className="mt-3 text-xs">
              <b>
                {c.members}
                {c.maxMembers ? ` / ${c.maxMembers}` : ""}
              </b>{" "}
              members · {c.incharges.join(", ") || "no in-charge"}
            </p>
            {c.meets && <p className="text-xs text-on-surface-variant">{c.meets}</p>}
          </button>
        ))}
      </div>
      {!shown.length && <FormAlert tone="info">No clubs yet.{d.can.manage ? " Add the school’s clubs and societies." : ""}</FormAlert>}
      {adding && <ClubForm club={null} onClose={(id) => { setAdding(false); if (id) router.push(`/clubs?open=${id}`); }} />}
    </div>
  );
}

export default function ClubsPage() {
  return (
    <RequirePermission permission={["cocurricular.view", "club.manage", "club.run"]}>
      <PageHeader title="Clubs" description="Clubs and societies: members, requests to join, meetings and activities with attendance and photos." />
      <Suspense fallback={<PageLoader />}>
        <Clubs />
      </Suspense>
    </RequirePermission>
  );
}
