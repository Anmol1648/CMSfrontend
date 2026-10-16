"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/forms";
import { academicApi } from "@/lib/api/academic";

/** Academic year picker; picks the current year when nothing is chosen yet. */
export function YearSelect({ value, onChange, label = "Academic year" }: { value: string; onChange: (id: string) => void; label?: string }) {
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const fallback = years.data?.find((y) => y.isCurrent)?.id ?? years.data?.[0]?.id ?? null;

  useEffect(() => {
    if (!value && fallback) onChange(fallback);
  }, [value, fallback, onChange]);

  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      disabled={!years.data?.length}
      options={
        years.data?.length
          ? years.data.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? " (current)" : ""}${y.status === "closed" ? " · closed" : ""}` }))
          : [{ value: "", label: years.isLoading ? "Loading…" : "No academic years yet" }]
      }
    />
  );
}
