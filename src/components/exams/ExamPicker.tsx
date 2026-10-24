"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/forms";
import { YearSelect } from "@/components/academic/YearSelect";
import { examsApi } from "@/lib/api/exams";

/** The session and an exam of it (the newest is chosen first). */
export function ExamPicker({ yearId, setYearId, examId, setExamId }: { yearId: string; setYearId: (y: string) => void; examId: string; setExamId: (e: string) => void }) {
  const exams = useQuery({ queryKey: ["exams", "list", yearId], queryFn: () => examsApi.list(yearId), enabled: !!yearId });
  useEffect(() => {
    if (exams.data && !exams.data.some((e) => e.id === examId)) setExamId(exams.data[exams.data.length - 1]?.id ?? "");
  }, [exams.data, examId, setExamId]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <YearSelect
        value={yearId}
        onChange={(y) => {
          setYearId(y);
          setExamId("");
        }}
      />
      <Select label="Exam" value={examId} onChange={setExamId} options={(exams.data ?? []).map((e) => ({ value: e.id, label: e.name }))} />
    </div>
  );
}

/** Sections of the session (for the section pickers). */
export const useSections = (yearId: string) => useQuery({ queryKey: ["exams", "sections", yearId], queryFn: () => examsApi.choices(yearId), enabled: !!yearId });
