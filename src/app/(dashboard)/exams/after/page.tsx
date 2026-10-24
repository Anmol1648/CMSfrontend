"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { exams2Api, Recheck, RECHECK } from "@/lib/api/exams2";

function RecheckCard({ r }: { r: Recheck }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(r.parts.map((p) => [p.key, String((r.newMarks ?? r.oldMarks)[p.key] ?? "")])));
  const [note, setNote] = useState(r.reviewNote ?? "");
  const open = r.status === "pending" || r.status === "reviewed";
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["exams2", "rechecks"] });
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <Card padding="sm">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-bold">
            {r.student} <span className="font-normal text-on-surface-variant">· {r.admissionNo}</span>
          </p>
          <p className="text-sm">
            {r.exam} · <b>{r.subject}</b> · marks {r.oldTotal ?? "—"}
            {r.newTotal != null && r.newTotal !== r.oldTotal ? ` → ${r.newTotal}` : ""}
          </p>
          <p className="text-xs text-on-surface-variant">
            Asked by {r.askedBy || "parent"} on {new Date(r.createdAt).toLocaleDateString("en-IN")}
            {r.fee ? ` · fee ₹${r.fee}` : ""}
            {r.reviewedBy ? ` · reviewed by ${r.reviewedBy}` : ""}
            {r.decidedBy ? ` · decided by ${r.decidedBy}` : ""}
          </p>
          {r.reason && <p className="text-sm mt-1">“{r.reason}”</p>}
        </div>
        <Pill tone={RECHECK[r.status].tone}>{RECHECK[r.status].label}</Pill>
      </div>
      {open && (
        <div className="mt-3 space-y-2 rounded-xl bg-surface-container-low p-3">
          <p className="text-xs font-bold">After re-checking the answer sheet</p>
          <div className="flex flex-wrap gap-2">
            {r.parts.map((p) => (
              <Input key={p.key} label={`${p.label} (max ${p.max}, was ${r.oldMarks[p.key] ?? "—"})`} type="number" min={0} max={p.max} step="0.5" value={marks[p.key] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [p.key]: e.target.value }))} className="max-w-[12rem]" />
            ))}
          </div>
          <Input label="Note (what was found)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => act(() => exams2Api.reviewRecheck(r.id, Object.fromEntries(Object.entries(marks).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])), note || null), "Reviewed: waiting for the decision")}>
              Save review
            </Button>
            {can("exam.recheck") && (
              <>
                <Button variant="tertiary" onClick={async () => (await confirm({ title: "Refuse this re-check?", message: "The marks stay as they are; the parent is told.", confirmLabel: "Refuse" })) && act(() => exams2Api.decideRecheck(r.id, false), "Refused")}>
                  Refuse
                </Button>
                <Button disabled={r.status !== "reviewed"} onClick={async () => (await confirm({ title: "Approve the re-check?", message: r.newTotal !== r.oldTotal ? `The marks change from ${r.oldTotal} to ${r.newTotal}; the change is recorded.` : "No change in marks; the parent is told.", confirmLabel: "Approve" })) && act(() => exams2Api.decideRecheck(r.id, true), "Done: the parent is told")}>
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Rechecks() {
  const [show, setShow] = useState("open");
  const q = useQuery({ queryKey: ["exams2", "rechecks", show], queryFn: () => exams2Api.rechecks(show) });
  return (
    <div className="space-y-3">
      <Select className="max-w-xs" value={show} onChange={setShow} options={[{ value: "open", label: "Open" }, { value: "done", label: "Done" }, { value: "all", label: "All" }]} />
      {q.isLoading ? <PageLoader /> : q.error ? <FormAlert>{errorMessage(q.error)}</FormAlert> : !q.data!.length ? <FormAlert tone="info">No re-check requests here.</FormAlert> : <div className="grid gap-3 lg:grid-cols-2">{q.data!.map((r) => <RecheckCard key={r.id} r={r} />)}</div>}
      <p className="text-xs text-on-surface-variant">The subject teacher re-checks the answer sheet and saves a review; the principal (exam.recheck) approves (marks change) or refuses. Parents ask from My Results; on/off, fee and last date are in System Settings → Exams.</p>
    </div>
  );
}

function Supplementary() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [yearId, setYearId] = useState("");
  const [name, setName] = useState("Supplementary Exam");
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const q = useQuery({ queryKey: ["exams2", "supplementary", yearId], queryFn: () => exams2Api.candidates(yearId), enabled: !!yearId });
  const all = q.data?.sections.flatMap((s) => s.students) ?? [];
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] items-end">
          <YearSelect value={yearId} onChange={setYearId} />
          <Input label="Name of the exam" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Button
            disabled={!Object.keys(picked).length}
            onClick={async () => {
              try {
                const r = await exams2Api.createSupplementary(yearId, { name, candidates: picked });
                queryClient.invalidateQueries({ queryKey: ["exams2", "supplementary"] });
                setPicked({});
                showToast(`${name}: ${r.students} students, ${r.papers} papers. Set its dates on Exams & Date Sheets; marks go in Enter Marks.`, "success");
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Make the supplementary exam ({Object.keys(picked).length})
          </Button>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">Students who failed in up to {q.data?.limit ?? "N"} subject(s) of the session’s result (System Settings → Exams). Their supplementary marks replace those subjects in the final result (shown on the report card).</p>
      </Card>
      {q.data?.existing.length ? (
        <div className="flex flex-wrap gap-2">
          {q.data.existing.map((e) => (
            <Pill key={e.id} tone="primary">
              {e.name}: {e.students} students ({e.status})
            </Pill>
          ))}
        </div>
      ) : null}
      {q.isLoading && yearId ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : q.data ? (
        !all.length ? (
          <FormAlert tone="info">No student needs a supplementary exam.</FormAlert>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {q.data.sections.map((s) => (
              <Card key={s.sectionId} padding="sm">
                <p className="font-bold mb-2">{s.section}</p>
                <ul className="space-y-1.5 text-sm">
                  {s.students.map((st) => (
                    <li key={st.studentId}>
                      <Checkbox
                        checked={!!picked[st.studentId]}
                        onChange={(c) => setPicked((p) => { const n = { ...p }; if (c) n[st.studentId] = st.subjects.map((x) => x.subjectId); else delete n[st.studentId]; return n; })}
                        label={`${st.name} (${st.admissionNo})`}
                        hint={st.subjects.map((x) => `${x.subject} ${x.percent ?? "—"}%`).join(" · ")}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function After() {
  const { can } = useAuth();
  const tabs = [{ id: "rechecks", label: "Re-checks" }, ...(can("exam.setup") ? [{ id: "supp", label: "Supplementary exam" }] : [])];
  const [tab, setTab] = useState("rechecks");
  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab === "rechecks" ? <Rechecks /> : <Supplementary />}
    </div>
  );
}

export default function ExamAfterPage() {
  return (
    <RequirePermission permission={["exam.recheck", "exam.setup", "exam.marks"]}>
      <PageHeader title="Re-checks & Supplementary" description="Parents’ re-check requests (teacher reviews, principal decides) and the supplementary exam for students who failed in a few subjects." />
      <After />
    </RequirePermission>
  );
}
