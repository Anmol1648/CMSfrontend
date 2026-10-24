"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { idCardsApi } from "@/lib/api/idcards";
import { PassportCamera } from "@/components/idcards/PassportCamera";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string; sub: string; photo: string | null };

/** A grid of people: take each one's photo with the camera (moves on to the next without a photo) or pick a file. */
function PhotoGrid({ people, upload, onSaved }: { people: Person[]; upload: (id: string, f: File) => Promise<{ photo: string | null }>; onSaved: () => void }) {
  const { showToast } = useToast();
  const [shooting, setShooting] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [done, setDone] = useState<Record<string, string | null>>({});
  const file = useRef<HTMLInputElement>(null);
  const [fileFor, setFileFor] = useState<string | null>(null);
  const photoOf = (p: Person) => (p.id in done ? done[p.id] : p.photo);
  const save = async (p: Person, f: File, next: boolean) => {
    setBusy(true);
    try {
      const r = await upload(p.id, f);
      setDone((d) => ({ ...d, [p.id]: r.photo }));
      showToast(`${p.name}: photo saved`, "success");
      onSaved();
      if (next) {
        const i = people.findIndex((x) => x.id === p.id);
        const n = people.slice(i + 1).find((x) => !photoOf(x) && x.id !== p.id);
        setShooting(n ?? null);
      }
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const missing = people.filter((p) => !photoOf(p)).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm flex-1">
          <b>{people.length - missing}</b> of {people.length} have a photo
        </p>
        <Checkbox checked={onlyMissing} onChange={setOnlyMissing} label="Only those without a photo" />
        <Button onClick={() => setShooting(people.find((p) => !photoOf(p)) ?? people[0] ?? null)} disabled={!people.length}>
          <span className="material-symbols-outlined text-lg">photo_camera</span> {missing ? "Start with the first without a photo" : "Take photos"}
        </Button>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {people
          .filter((p) => !onlyMissing || !photoOf(p))
          .map((p) => (
            <div key={p.id} className={cn("rounded-2xl bg-white border p-2 flex flex-col items-center gap-1 text-center", photoOf(p) ? "border-outline-variant/30" : "border-amber-300")}>
              <AuthedPhoto path={photoOf(p) ?? null} className="w-24 h-32 rounded-xl object-cover" />
              <p className="text-xs font-bold leading-tight">{p.name}</p>
              <p className="text-[10px] text-on-surface-variant">{p.sub}</p>
              <div className="flex gap-2">
                <button type="button" className="text-xs font-bold text-primary" onClick={() => setShooting(p)}>
                  Camera
                </button>
                <button type="button" className="text-xs font-bold text-primary" onClick={() => { setFileFor(p.id); file.current?.click(); }}>
                  File
                </button>
              </div>
            </div>
          ))}
      </div>
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          const p = people.find((x) => x.id === fileFor);
          if (f && p) void save(p, f, false);
        }}
      />
      {shooting && <PassportCamera title={`Photo: ${shooting.name} (${shooting.sub})`} busy={busy} onClose={() => setShooting(null)} onShot={(f) => save(shooting, f, true)} />}
    </div>
  );
}

function Students() {
  const queryClient = useQueryClient();
  const sections = useQuery({ queryKey: ["idcards", "photo-sections"], queryFn: idCardsApi.photoSections });
  const [section, setSection] = useState<string | null>(null);
  const students = useQuery({ queryKey: ["idcards", "photo-section", section], queryFn: () => idCardsApi.sectionPhotos(section!), enabled: !!section });
  if (sections.isLoading) return <PageLoader />;
  if (sections.error) return <FormAlert>{errorMessage(sections.error)}</FormAlert>;
  if (!sections.data!.length) return <FormAlert tone="info">No section to take photos for (class teachers take their own section’s).</FormAlert>;
  const current = sections.data!.find((s) => s.id === section);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sections.data!.map((s) => (
          <button key={s.id} type="button" onClick={() => setSection(s.id)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold border", s.id === section ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
            {s.name} <span className={s.withPhoto < s.students ? "text-amber-600" : ""}>{s.withPhoto}/{s.students}</span>
          </button>
        ))}
      </div>
      {!section ? (
        <FormAlert tone="info">Choose a section.</FormAlert>
      ) : students.isLoading ? (
        <PageLoader />
      ) : students.error ? (
        <FormAlert>{errorMessage(students.error)}</FormAlert>
      ) : (
        <Card>
          <p className="font-extrabold mb-3">{current?.name}</p>
          <PhotoGrid
            people={students.data!.map((s) => ({ id: s.id, name: s.name, sub: `${s.rollNo ? `Roll ${s.rollNo} · ` : ""}${s.admissionNo}`, photo: s.photo }))}
            upload={idCardsApi.takeStudentPhoto}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["idcards", "photo-sections"] })}
          />
        </Card>
      )}
    </div>
  );
}

function Staff() {
  const q = useQuery({ queryKey: ["idcards", "photo-staff"], queryFn: () => idCardsApi.pick({ type: "staff" }) });
  const [search, setSearch] = useState("");
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const t = search.trim().toLowerCase();
  return (
    <Card>
      <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />
      <PhotoGrid people={q.data!.filter((h) => !t || h.name.toLowerCase().includes(t)).map((h) => ({ id: h.id, name: h.name, sub: h.sub, photo: h.photo }))} upload={idCardsApi.takeStaffPhoto} onSaved={() => undefined} />
    </Card>
  );
}

function Requests() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["idcards", "photo-requests"], queryFn: idCardsApi.photoRequests });
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data!.length) return <FormAlert tone="info">No photo waiting for approval.</FormAlert>;
  const answer = async (id: string, approve: boolean) => {
    try {
      await idCardsApi.answerRequest(id, approve, notes[id]?.trim() || null);
      queryClient.invalidateQueries({ queryKey: ["idcards"] });
      showToast(approve ? "Approved: the photo is now on the student’s record" : "Not accepted: the sender is told", "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {q.data!.map((r) => (
        <Card key={r.id} padding="sm">
          <p className="font-bold">
            {r.student} <span className="font-normal text-on-surface-variant">· {r.section} · {r.admissionNo}</span>
          </p>
          <p className="text-xs text-on-surface-variant mb-3">
            Sent by {r.by || "—"} on {new Date(r.at).toLocaleDateString("en-IN")}
          </p>
          <div className="flex gap-4">
            <div className="text-center">
              <AuthedPhoto path={r.current} className="w-24 h-32 rounded-xl object-cover" />
              <p className="text-[10px] mt-1">Now</p>
            </div>
            <div className="text-center">
              <AuthedPhoto path={r.sent} className="w-24 h-32 rounded-xl object-cover" />
              <p className="text-[10px] mt-1 font-bold">Sent</p>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Input label="Note to the sender (optional)" value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="Plain background please" maxLength={300} />
              <div className="flex gap-2 justify-end mt-auto">
                <Button variant="secondary" onClick={() => answer(r.id, false)}>
                  Not accepted
                </Button>
                <Button onClick={() => answer(r.id, true)}>Approve</Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Photos() {
  const { can } = useAuth();
  const office = can("idcard.print");
  const requests = useQuery({ queryKey: ["idcards", "photo-requests"], queryFn: idCardsApi.photoRequests, enabled: office });
  const [tab, setTab] = useState("students");
  const n = requests.data?.length ?? 0;
  return (
    <div className="space-y-4">
      {office && (
        <Tabs
          tabs={[
            { id: "students", label: "Students" },
            { id: "staff", label: "Staff" },
            { id: "requests", label: `Sent by parents${n ? ` (${n})` : ""}` },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
      )}
      {tab === "students" && <Students />}
      {tab === "staff" && office && <Staff />}
      {tab === "requests" && office && <Requests />}
      {office && n > 0 && tab !== "requests" && (
        <p className="text-xs">
          <Pill tone="warning">{n} photo(s) from parents waiting</Pill>
        </p>
      )}
    </div>
  );
}

export default function IdCardPhotosPage() {
  return (
    <RequirePermission permission={["idcard.photos", "idcard.print"]}>
      <PageHeader title="Photos for Cards" description="Take students’ photos section by section with a phone or laptop camera; the camera moves on to the next student without a photo." />
      <Photos />
    </RequirePermission>
  );
}
