"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { examsApi, ScopeKind } from "@/lib/api/exams";
import { CARD_DOC, exams2Api, RECHECK } from "@/lib/api/exams2";

/** A simple line chart (SVG) of the overall % across exams. */
function Trend({ points }: { points: { exam: string; percent: number | null }[] }) {
  const pts = points.filter((p) => p.percent != null);
  if (pts.length < 1) return <p className="text-sm text-on-surface-variant">The graph appears after the first published exam.</p>;
  const w = 520;
  const h = 170;
  const x = (i: number) => 40 + (pts.length === 1 ? (w - 60) / 2 : (i * (w - 60)) / (pts.length - 1));
  const y = (v: number) => h - 30 - (v / 100) * (h - 50);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xl" role="img" aria-label="Overall % in each exam">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={34} x2={w - 10} y1={y(v)} y2={y(v)} stroke="#e5e7eb" />
          <text x={4} y={y(v) + 4} fontSize="10" fill="#6b7280">
            {v}%
          </text>
        </g>
      ))}
      <polyline fill="none" stroke="#1A365D" strokeWidth="2.5" points={pts.map((p, i) => `${x(i)},${y(p.percent!)}`).join(" ")} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.percent!)} r="4" fill="#1A365D" />
          <text x={x(i)} y={y(p.percent!) - 9} fontSize="11" textAnchor="middle" fontWeight="700">
            {p.percent}%
          </text>
          <text x={x(i)} y={h - 10} fontSize="10" textAnchor="middle" fill="#374151">
            {p.exam}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Progress({ studentId }: { studentId: string }) {
  const q = useQuery({ queryKey: ["exams2", "progress", studentId], queryFn: () => exams2Api.progress(studentId) });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">Overall % in each exam</p>
        <Trend points={d.points} />
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1">Subjects (average this session)</p>
          <ul className="space-y-1 text-sm">
            {d.subjects.map((s) => (
              <li key={s.subject} className="flex items-center gap-2">
                <span className="w-36 truncate">{s.subject}</span>
                <span className="flex-1 h-2 rounded-full bg-surface-container">
                  <span className="block h-2 rounded-full bg-primary" style={{ width: `${s.average ?? 0}%` }} />
                </span>
                <span className="w-12 text-right text-xs">{s.average}%</span>
              </li>
            ))}
          </ul>
        </div>
        {d.stronger.length > 0 && (
          <p className="text-sm">
            <b className="text-emerald-700">Doing well:</b> {d.stronger.map((s) => s.subject).join(", ")}
          </p>
        )}
        {d.weaker.length > 0 && (
          <p className="text-sm">
            <b className="text-amber-700">Needs more practice:</b> {d.weaker.map((s) => s.subject).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function AskRecheck({ examId, studentId, title, onClose }: { examId: string; studentId: string; title: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["exams2", "recheck-options", examId, studentId], queryFn: () => exams2Api.recheckOptions(examId, studentId) });
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Modal isOpen onClose={onClose} title={`Ask for a re-check · ${title}`} width="max-w-lg">
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data!.allowed ? (
        <FormAlert tone="info">{q.data!.why}</FormAlert>
      ) : (
        <div className="space-y-3">
          <Select label="Subject" value={subject} onChange={setSubject} options={[{ value: "", label: "Choose…" }, ...q.data!.subjects.map((s) => ({ value: s.examSubjectId, label: `${s.subject}: ${s.marks ?? "—"}/${s.max}${s.asked ? ` (asked: ${RECHECK[s.asked as keyof typeof RECHECK]?.label ?? s.asked})` : ""}` }))]} />
          <Input label="Why (optional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. a question seems not counted" />
          <p className="text-xs text-on-surface-variant">
            Last date: {q.data!.lastDate}.{q.data!.fee ? ` Fee ₹${q.data!.fee} per subject (added to the fees).` : ""} The subject teacher re-checks the answer sheet; you are told the result.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!subject || !!q.data!.subjects.find((s) => s.examSubjectId === subject)?.asked}
              onClick={async () => {
                try {
                  await exams2Api.askRecheck({ examId, studentId, examSubjectId: subject, reason: reason || null });
                  queryClient.invalidateQueries({ queryKey: ["exams2"] });
                  showToast("Asked: the school will tell you the result", "success");
                  onClose();
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Ask for a re-check
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Students and parents: progress, the published results (each opens its report card) and re-checks. */
function Mine() {
  const q = useQuery({ queryKey: ["my-results"], queryFn: examsApi.mine });
  const rechecks = useQuery({ queryKey: ["exams2", "my-rechecks"], queryFn: exams2Api.myRechecks });
  const [open, setOpen] = useState<{ scope: ScopeKind; id: string; student: string; title: string; format?: string } | null>(null);
  const [ask, setAsk] = useState<{ examId: string; studentId: string; title: string } | null>(null);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data) return <PageLoader />;
  return (
    <>
      <PageHeader title="Results" description="Progress across exams, report cards once the school publishes them, and re-check requests." />
      <div className="space-y-6">
        {q.data.map((c) => (
          <Card key={c.student.id} className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">{c.student.name}</h3>
            <Progress studentId={c.student.id} />
            {!c.cards.length && <p className="text-sm text-on-surface-variant/70">No results published yet.</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {c.cards.map((card) => (
                <div key={`${card.scope}-${card.id}`} className="rounded-xl border border-outline-variant/30 px-4 py-3">
                  <button type="button" onClick={() => setOpen({ scope: card.scope, id: card.id, student: c.student.id, title: `${card.label} · ${c.student.name}`, format: card.cardFormat })} className="text-left w-full">
                    <p className="font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">workspace_premium</span>
                      {card.label}
                    </p>
                    <p className="text-xs text-on-surface-variant/70">{card.year} · report card</p>
                  </button>
                  {card.scope === "exam" && (
                    <button type="button" className="mt-1 text-xs font-bold text-primary" onClick={() => setAsk({ examId: card.id, studentId: c.student.id, title: `${card.label} · ${c.student.name}` })}>
                      Ask for a re-check
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
        {(rechecks.data?.length ?? 0) > 0 && (
          <Card>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-2">Re-check requests</h3>
            <ul className="divide-y divide-outline-variant/15 text-sm">
              {rechecks.data!.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">
                    <b>{r.student}</b> · {r.exam} · {r.subject}
                    {r.status === "approved" && <span className="text-xs text-on-surface-variant"> · {r.newTotal !== r.oldTotal ? `marks ${r.oldTotal} → ${r.newTotal}` : "no change in marks"}</span>}
                  </span>
                  <Pill tone={RECHECK[r.status].tone}>{RECHECK[r.status].label}</Pill>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {!q.data.length && <Card className="text-center text-on-surface-variant/70 py-12">No student is linked to your login.</Card>}
      </div>
      {open && <DocumentViewer docKey={CARD_DOC[open.format ?? "standard"] ?? "report_card"} params={{ scope: open.scope, id: open.id, student: open.student }} title={open.title} filename="report-card.pdf" onClose={() => setOpen(null)} />}
      {ask && <AskRecheck examId={ask.examId} studentId={ask.studentId} title={ask.title} onClose={() => setAsk(null)} />}
    </>
  );
}

export default function MyResultsPage() {
  return (
    <RequirePermission permission="exam.mine">
      <Mine />
    </RequirePermission>
  );
}
