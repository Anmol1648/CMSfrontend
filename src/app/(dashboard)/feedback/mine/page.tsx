"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { TeacherDetail } from "@/components/feedback/ResultsView";
import { feedbackApi } from "@/lib/api/feedback";

function Mine() {
  const rounds = useQuery({ queryKey: ["feedback", "my-rounds"], queryFn: feedbackApi.myRounds });
  const [pick, setPick] = useState("");
  const id = pick || rounds.data?.[0]?.id || "";
  const q = useQuery({ queryKey: ["feedback", "my-results", id], queryFn: () => feedbackApi.myResults(id), enabled: !!id });
  if (rounds.isLoading) return <PageLoader />;
  if (rounds.error) return <FormAlert>{errorMessage(rounds.error)}</FormAlert>;
  if (!rounds.data?.length) return <FormAlert tone="info">No feedback results have been released to you yet.</FormAlert>;
  const r = q.data;
  const t = r?.teachers[0];
  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <Select label="Round" value={id} onChange={setPick} options={rounds.data.map((x) => ({ value: x.id, label: x.name }))} />
        <p className="mt-2 text-xs text-on-surface-variant/70">Anonymous: you see the averages and the comments, never who wrote them. The line on each bar is the school average.</p>
      </Card>
      {q.isLoading ? <PageLoader /> : q.error ? <FormAlert>{errorMessage(q.error)}</FormAlert> : r && t ? <Card><TeacherDetail r={r} t={t} /></Card> : <FormAlert tone="info">No feedback about you in this round.</FormAlert>}
    </div>
  );
}

export default function MyFeedbackResultsPage() {
  return (
    <RequirePermission permission="feedback.own">
      <PageHeader title="My Feedback" description="What students and parents said about your teaching, once the school releases a round." />
      <Mine />
    </RequirePermission>
  );
}
