"use client";

import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/forms";
import { ptmApi } from "@/lib/api/ptm";

/** A PTM for report filters (empty = the latest one). */
export function PtmPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const q = useQuery({ queryKey: ["ptm", "options"], queryFn: ptmApi.options });
  return <Select label={label} value={value} onChange={onChange} options={[{ value: "", label: "The latest PTM" }, ...(q.data ?? []).map((p) => ({ value: p.id, label: p.label }))]} />;
}
