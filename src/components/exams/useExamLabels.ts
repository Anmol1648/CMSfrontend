"use client";

import { useQuery } from "@tanstack/react-query";
import { EXAM_STATUS, ExamStatus, examsApi } from "@/lib/api/exams";

/** What the school calls exam stages and mark statuses (System Settings → Exams, Masters → Mark statuses). */
export function useExamLabels() {
  const q = useQuery({ queryKey: ["exam-labels"], queryFn: () => examsApi.labels(), staleTime: 5 * 60_000 });
  const l = q.data;
  return {
    stage: (s: ExamStatus) => l?.stages[s] ?? EXAM_STATUS[s].label,
    present: l?.present ?? "Present",
    statuses: l?.statuses ?? [],
    finalName: l?.finalName ?? "Final result",
    kinds: l?.kinds ?? { marks: "By marks %", descriptive: "Grades chosen by the teacher" },
    lockBeforePublish: l?.lockBeforePublish ?? true,
  };
}
