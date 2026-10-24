"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { ScoreBar, TeacherDetail } from "@/components/feedback/ResultsView";
import { feedbackApi, TeacherResult } from "@/lib/api/feedback";

function ResultsPage() {
  const params = useSearchParams();
  const rounds = useQuery({ queryKey: ["feedback", "rounds"], queryFn: feedbackApi.rounds });
  const usable = (rounds.data ?? []).filter((r) => r.status !== "draft");
  const [roundId, setRoundId] = useState(params.get("round") ?? "");
  const id = roundId || usable[0]?.id || "";
  const q = useQuery({ queryKey: ["feedback", "results", id], queryFn: () => feedbackApi.results(id), enabled: !!id });
  const [open, setOpen] = useState<TeacherResult | null>(null);
  if (rounds.isLoading) return <PageLoader />;
  if (!usable.length) return <FormAlert tone="info">No feedback round has been opened yet.</FormAlert>;
  const r = q.data;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Round" value={id} onChange={setRoundId} options={usable.map((x) => ({ value: x.id, label: `${x.name} (${x.status})` }))} />
        </div>
        {r && (
          <p className="mt-3 text-sm text-on-surface-variant">
            {r.school.responses} responses · school average <b>{r.school.overall ?? "—"}</b> / {r.scale} · teachers with fewer than {r.minResponses} responses show no score
          </p>
        )}
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        r && (
          <Card padding="none">
            <ul className="divide-y divide-outline-variant/10">
              {r.teachers.map((t, i) => (
                <li key={t.staffId}>
                  <button type="button" onClick={() => setOpen(t)} className="w-full text-left flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-surface-container-low">
                    <span className="w-6 text-sm font-extrabold text-on-surface-variant">{t.overall !== null ? i + 1 : "–"}</span>
                    <span className="w-48 font-bold text-sm">{t.name}</span>
                    <span className="flex-1 min-w-[8rem]">
                      <ScoreBar value={t.overall} school={r.school.overall} scale={r.scale} />
                    </span>
                    <span className="w-16 text-right font-extrabold">{t.overall ?? "—"}</span>
                    <span className="w-28 text-xs text-on-surface-variant">
                      {t.responses} responses
                      {t.comments.some((c) => c.status === "pending") ? " · comments to screen" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}
      {open && r && (
        <Modal isOpen onClose={() => setOpen(null)} title={`${open.name} · ${r.round.name}`} width="max-w-2xl">
          <TeacherDetail r={r} t={open} showStatus />
        </Modal>
      )}
    </div>
  );
}

export default function FeedbackResultsPage() {
  return (
    <RequirePermission permission="feedback.results">
      <PageHeader title="Feedback Results" description="Every teacher’s score in a round against the school average (the line on each bar). Click a teacher for each question, by section, and the comments." />
      <Suspense fallback={<PageLoader />}>
        <ResultsPage />
      </Suspense>
    </RequirePermission>
  );
}
