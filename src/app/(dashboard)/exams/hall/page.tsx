"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { exams2Api, fmtDay, Session } from "@/lib/api/exams2";
import { ExamPicker, useSections } from "@/components/exams/ExamPicker";

type Doc = { key: string; params: Record<string, string>; title: string };

function Admit({ yearId, examId, onDoc }: { yearId: string; examId: string; onDoc: (d: Doc) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sections = useSections(yearId);
  const [section, setSection] = useState("");
  const q = useQuery({ queryKey: ["exams2", "admit", examId, section], queryFn: () => exams2Api.admit(examId, section), enabled: !!section && !!examId });
  const toggle = async (studentId: string, release: boolean) => {
    try {
      await exams2Api.release(examId, studentId, release);
      queryClient.invalidateQueries({ queryKey: ["exams2", "admit"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Select className="max-w-xs" label="Section" value={section} onChange={setSection} options={[{ value: "", label: "Choose…" }, ...(sections.data?.sections ?? []).map((s) => ({ value: s.id, label: s.label }))]} />
          <Button disabled={!q.data || !q.data.students.some((s) => !s.held)} onClick={() => onDoc({ key: "admit_card", params: { exam: examId, section }, title: `Admit cards · ${q.data?.section ?? ""}` })}>
            <span className="material-symbols-outlined text-lg">print</span> Print admit cards
          </Button>
        </div>
        {q.data?.hold && <p className="mt-2 text-xs text-on-surface-variant">Cards are held when overdue fees are more than ₹{q.data.limit} (System Settings → Exams). “Give anyway” prints one regardless.</p>}
      </Card>
      {q.isLoading && section ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : q.data ? (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {q.data.students.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-2">
                <span className="w-10 text-xs text-on-surface-variant">{s.roll ?? ""}</span>
                <span className="flex-1">
                  <b>{s.name}</b> <span className="text-on-surface-variant">· {s.admissionNo}</span>
                </span>
                {!s.photo && <Pill tone="warning">No photo</Pill>}
                {s.held ? <Pill tone="danger">Held: ₹{s.due.toLocaleString("en-IN")} overdue</Pill> : s.released ? <Pill tone="primary">Given despite dues</Pill> : <Pill tone="success">Ready</Pill>}
                {s.held && (
                  <Button variant="tertiary" onClick={() => toggle(s.id, true)}>
                    Give anyway
                  </Button>
                )}
                {s.released && (
                  <Button variant="tertiary" onClick={() => toggle(s.id, false)}>
                    Hold again
                  </Button>
                )}
                {!s.held && (
                  <Button variant="tertiary" onClick={() => onDoc({ key: "admit_card", params: { exam: examId, section, student: s.id }, title: `Admit card · ${s.name}` })}>
                    Print
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function SessionPlan({ examId, s, onDoc }: { examId: string; s: Session; onDoc: (d: Doc) => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const rooms = useQuery({ queryKey: ["exams2", "rooms"], queryFn: exams2Api.rooms });
  const teachers = useQuery({ queryKey: ["exams2", "teachers"], queryFn: exams2Api.teachers, enabled: can("exam.seating") });
  const plan = useQuery({ queryKey: ["exams2", "seating", examId, s.date, s.startTime], queryFn: () => exams2Api.seating(examId, s.date, s.startTime) });
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [duties, setDuties] = useState(true);
  useEffect(() => {
    if (plan.data && plan.data.rooms.length && !chosen.size) setChosen(new Set(plan.data.rooms.map((r) => r.roomId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.data]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["exams2"] });
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      refresh();
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const seats = (rooms.data ?? []).filter((r) => chosen.has(r.id)).reduce((a, r) => a + r.capacity, 0);
  const writers = s.papers.length;
  const docParams = { exam: examId, date: s.date, time: s.startTime };
  return (
    <div className="space-y-4">
      <Card>
        <p className="font-bold">
          {fmtDay(s.date)} · {s.startTime}
          {s.endTime ? `–${s.endTime}` : ""}
        </p>
        <p className="text-xs text-on-surface-variant mb-3">{s.papers.map((p) => `${p.className} ${p.subject}`).join(" · ")}</p>
        {can("exam.seating") && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">Rooms to use (in order) · {seats} seats chosen</p>
            <div className="flex flex-wrap gap-2">
              {(rooms.data ?? []).map((r) => (
                <button key={r.id} type="button" onClick={() => setChosen((c) => { const n = new Set(c); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} className={`rounded-full px-3 py-1 text-xs font-bold border ${chosen.has(r.id) ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant"}`}>
                  {r.name} · {r.capacity}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Checkbox checked={duties} onChange={setDuties} label="Also give invigilation duties" hint="Teachers whose subject is not written then, not on leave, fewest duties first." />
              <span className="flex-1" />
              {plan.data?.rooms.length ? (
                <Button variant="tertiary" onClick={async () => (await confirm({ title: "Clear this seating plan?", message: "Seats and duties of this paper are removed.", confirmLabel: "Clear", danger: true })) && act(() => exams2Api.clearSeating(examId, s.date, s.startTime), "Cleared")}>
                  Clear
                </Button>
              ) : null}
              <Button disabled={!chosen.size} onClick={() => act(() => exams2Api.makeSeating(examId, { date: s.date, startTime: s.startTime, roomIds: (rooms.data ?? []).filter((r) => chosen.has(r.id)).map((r) => r.id), duties }), "Seating plan made")}>
                {plan.data?.rooms.length ? "Make again" : "Make seating plan"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">Rooms and their seats are in Masters → Rooms & labs. Students of the {writers} paper(s) are spread over the rooms{" "}with classes mixed (System Settings → Exams).</p>
          </>
        )}
      </Card>
      {plan.isLoading ? (
        <PageLoader />
      ) : plan.data && plan.data.rooms.length ? (
        <>
          <div className="flex flex-wrap gap-2 justify-end">
            {can("exam.seating") && (
              <Button variant="secondary" onClick={() => act(() => exams2Api.autoDuties(examId, s.date, s.startTime), "Duties given again")}>
                Give duties again
              </Button>
            )}
            <Button variant="secondary" onClick={() => onDoc({ key: "exam_room_list", params: docParams, title: "Door lists" })}>
              <span className="material-symbols-outlined text-lg">print</span> Door lists
            </Button>
            <Button variant="secondary" onClick={() => onDoc({ key: "exam_desk_slips", params: docParams, title: "Desk slips" })}>
              <span className="material-symbols-outlined text-lg">print</span> Desk slips
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.data.rooms.map((r) => (
              <Card key={r.roomId} padding="sm">
                <div className="flex items-center gap-2 mb-2">
                  <p className="flex-1 font-bold">{r.room}</p>
                  <Pill>{r.seats.length} students</Pill>
                </div>
                {can("exam.seating") ? (
                  <Select
                    label="Invigilator"
                    value={r.invigilators[0]?.staffId ?? ""}
                    onChange={(v) => act(() => exams2Api.setDuty(examId, { date: s.date, startTime: s.startTime, roomId: r.roomId, staffIds: [v, ...r.invigilators.slice(1).map((i) => i.staffId)].filter(Boolean) }), "Saved")}
                    options={[{ value: "", label: "—" }, ...(teachers.data ?? []).map((t) => ({ value: t.id, label: t.name }))]}
                  />
                ) : (
                  <p className="text-xs">Invigilators: {r.invigilators.map((i) => i.name).join(", ") || "—"}</p>
                )}
                {r.invigilators.length > 1 && <p className="text-xs mt-1">Also: {r.invigilators.slice(1).map((i) => i.name).join(", ")}</p>}
                <p className="mt-2 text-xs text-on-surface-variant">
                  Seats 1–{r.seats.length}: {Object.entries(r.seats.reduce<Record<string, number>>((a, x) => ({ ...a, [x.section]: (a[x.section] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(" · ")}
                </p>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <FormAlert tone="info">No seating plan for this paper yet.</FormAlert>
      )}
    </div>
  );
}

function Seating({ examId, onDoc }: { examId: string; onDoc: (d: Doc) => void }) {
  const q = useQuery({ queryKey: ["exams2", "sessions", examId], queryFn: () => exams2Api.sessions(examId), enabled: !!examId });
  const [pick, setPick] = useState<string | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const sessions = q.data?.sessions ?? [];
  if (!sessions.length) return <FormAlert tone="info">This exam has no dates yet: set the date sheet on Exams & Date Sheets.</FormAlert>;
  const current = sessions.find((s) => `${s.date}|${s.startTime}` === pick) ?? sessions[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sessions.map((s) => {
          const k = `${s.date}|${s.startTime}`;
          const on = k === `${current.date}|${current.startTime}`;
          return (
            <button key={k} type="button" onClick={() => setPick(k)} className={`rounded-xl px-3 py-2 text-left text-xs border ${on ? "bg-primary text-white border-primary" : "border-outline-variant/40"}`}>
              <b>{fmtDay(s.date)}</b> {s.startTime}
              <span className="block opacity-80">{s.seated ? `${s.seated} seated · ${s.duties} duties` : "No plan yet"}</span>
            </button>
          );
        })}
      </div>
      <SessionPlan key={`${current.date}|${current.startTime}`} examId={examId} s={current} onDoc={onDoc} />
    </div>
  );
}

function Hall() {
  const { can } = useAuth();
  const [yearId, setYearId] = useState("");
  const [examId, setExamId] = useState("");
  const tabs = [...(can("exam.admit") ? [{ id: "admit", label: "Admit cards" }] : []), { id: "seating", label: "Seating & invigilation" }];
  const [tab, setTab] = useState(tabs[0].id);
  const [doc, setDoc] = useState<Doc | null>(null);
  return (
    <div className="space-y-4">
      <Card>
        <ExamPicker yearId={yearId} setYearId={setYearId} examId={examId} setExamId={setExamId} />
      </Card>
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {examId && tab === "admit" && <Admit yearId={yearId} examId={examId} onDoc={setDoc} />}
      {examId && tab === "seating" && <Seating examId={examId} onDoc={setDoc} />}
      {doc && <DocumentViewer docKey={doc.key} params={doc.params} title={doc.title} filename={`${doc.key}.pdf`} onClose={() => setDoc(null)} />}
    </div>
  );
}

export default function ExamHallPage() {
  return (
    <RequirePermission permission={["exam.admit", "exam.seating"]}>
      <PageHeader title="Admit Cards & Seating" description="Admit cards for each section (held for overdue fees if the school wants), the seating plan of each paper with classes mixed, and invigilation duties." />
      <Hall />
    </RequirePermission>
  );
}
