"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { feedbackApi, GiveRound } from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

type Target = { round: GiveRound; studentId: string; childName: string; staffId: string; teacher: string };

function FillForm({ t, scale, onClose }: { t: Target; scale: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [answers, setAnswers] = useState<Record<string, number | boolean | string>>({});
  const [error, setError] = useState<string | null>(null);
  const set = (id: string, v: number | boolean | string) => setAnswers((a) => ({ ...a, [id]: v }));
  const missing = t.round.questions.filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === ""));
  const send = async () => {
    try {
      await feedbackApi.submit({ roundId: t.round.id, staffId: t.staffId, studentId: t.studentId, answers });
      queryClient.invalidateQueries({ queryKey: ["feedback", "give"] });
      showToast("Thank you!", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Feedback on ${t.teacher}`} width="max-w-2xl">
      <div className="space-y-5">
        {t.round.anonymous && <FormAlert tone="info">Anonymous: no one, not even the teacher or the principal, sees who wrote this.</FormAlert>}
        <p className="text-xs text-on-surface-variant">For {t.childName}</p>
        {t.round.questions.map((q, i) => (
          <div key={q.id}>
            <p className="text-sm font-bold">
              {i + 1}. {q.text}
              {q.required ? " *" : ""}
            </p>
            {q.kind === "rating" ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: scale }, (_, k) => k + 1).map((n) => (
                  <button key={n} type="button" onClick={() => set(q.id, n)} className={cn("h-10 min-w-10 rounded-xl border px-3 text-sm font-bold", answers[q.id] === n ? "bg-primary text-white border-primary" : "border-outline-variant/40 hover:bg-surface-container-high")} aria-label={`${n} of ${scale}`}>
                    {scale === 5 ? "★".repeat(n) : n}
                  </button>
                ))}
              </div>
            ) : q.kind === "yesno" ? (
              <div className="mt-2 flex gap-2">
                {[true, false].map((b) => (
                  <button key={String(b)} type="button" onClick={() => set(q.id, b)} className={cn("rounded-xl border px-5 py-2 text-sm font-bold", answers[q.id] === b ? "bg-primary text-white border-primary" : "border-outline-variant/40")}>
                    {b ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            ) : (
              <textarea value={String(answers[q.id] ?? "")} onChange={(e) => set(q.id, e.target.value)} rows={3} maxLength={1000} className="mt-2 w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label={q.text} />
            )}
          </div>
        ))}
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Later
          </Button>
          <Button onClick={send} disabled={missing.length > 0}>
            {missing.length ? `${missing.length} to answer` : "Send"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Give() {
  const q = useQuery({ queryKey: ["feedback", "give"], queryFn: feedbackApi.give });
  const [target, setTarget] = useState<Target | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.rounds.length) return <FormAlert tone="info">No teacher feedback is open right now. You’ll get a notification when it is.</FormAlert>;
  return (
    <div className="space-y-4 max-w-3xl">
      {d.rounds.map((r) => (
        <Card key={r.id}>
          <p className="text-lg font-extrabold">{r.name}</p>
          <p className="text-xs text-on-surface-variant">
            Open until {new Date(`${r.closesOn}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} · {r.anonymous ? "anonymous" : "with your name"}
          </p>
          {r.children.map((c) => {
            const left = c.teachers.filter((t) => !t.done).length;
            return (
              <div key={`${c.studentId}-${c.as}`} className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    {c.as === "parent" ? `${c.name}’s teachers` : "Your teachers"} · {c.section}
                  </p>
                  <Pill tone={left ? "warning" : "success"}>{left ? `${left} left` : "All done ✓"}</Pill>
                </div>
                <ul className="mt-2 space-y-2">
                  {c.teachers.map((t) => (
                    <li key={t.staffId} className="flex items-center gap-3 rounded-xl border border-outline-variant/20 px-4 py-2.5">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-xs text-on-surface-variant/70">{t.role}</p>
                      </div>
                      {t.done ? <Pill tone="success">Done ✓</Pill> : <Button onClick={() => setTarget({ round: r, studentId: c.studentId, childName: c.name, staffId: t.staffId, teacher: t.name })}>Give feedback</Button>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Card>
      ))}
      {target && <FillForm t={target} scale={d.scale} onClose={() => setTarget(null)} />}
    </div>
  );
}

export default function MyFeedbackPage() {
  return (
    <RequirePermission permission="feedback.give">
      <PageHeader title="Teacher Feedback" description="Tell the school how your (or your child’s) teachers are doing. It takes a minute per teacher." />
      <Give />
    </RequirePermission>
  );
}
