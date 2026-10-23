"use client";

import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/forms";
import { academicApi } from "@/lib/api/academic";
import { examsApi } from "@/lib/api/exams";

/** An exam of a session for report filters ("current" or empty = the current session). */
export function ExamPicker({ label, year, value, onChange }: { label: string; year: string; value: string; onChange: (v: string) => void }) {
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const yearId = year && year !== "current" ? year : (years.data?.find((y) => y.isCurrent)?.id ?? "");
  const exams = useQuery({ queryKey: ["exams", yearId], queryFn: () => examsApi.list(yearId), enabled: !!yearId });
  return <Select label={label} value={value} onChange={onChange} options={[{ value: "", label: exams.data?.length ? "Choose an exam…" : "No exams in this session" }, ...(exams.data ?? []).map((e) => ({ value: e.id, label: e.name }))]} />;
}
