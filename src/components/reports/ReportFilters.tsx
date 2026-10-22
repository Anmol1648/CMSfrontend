"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/forms";
import { YearSelect } from "@/components/academic/YearSelect";
import { academicApi } from "@/lib/api/academic";
import { ReportFilter } from "@/lib/api/reports";
import { useCodedList } from "@/components/masters/useCodedList";

function MasterFilter({ label, master, value, onChange }: { label: string; master: string; value: string; onChange: (v: string) => void }) {
  const { options } = useCodedList(master);
  return <Select label={label} value={value} onChange={onChange} options={[{ value: "", label: "All" }, ...options]} />;
}

/** The filters of a report, drawn from its definition (dates, session, class, section, choices). */
export function ReportFilters({ filters, values, onChange }: { filters: ReportFilter[]; values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const hasClass = filters.some((f) => f.type === "class");
  const hasSection = filters.some((f) => f.type === "section");
  const yearKey = filters.find((f) => f.type === "year")?.key;
  const classKey = filters.find((f) => f.type === "class")?.key;
  const sectionKey = filters.find((f) => f.type === "section")?.key;
  const year = yearKey ? values[yearKey] : "";
  const cls = classKey ? values[classKey] : "";

  const classes = useQuery({ queryKey: ["academic-class-options"], queryFn: academicApi.classOptions, enabled: hasClass });
  const sections = useQuery({ queryKey: ["academic-section-options", year, cls], queryFn: () => academicApi.sectionOptions(year!, cls), enabled: hasSection && !!year && !!cls });

  // A section belongs to a class and a session: clear it when either changes.
  useEffect(() => {
    if (sectionKey && values[sectionKey] && sections.data && !sections.data.some((s) => s.id === values[sectionKey])) onChange({ ...values, [sectionKey]: "" });
  }, [sections.data, sectionKey, values, onChange]);

  const set = (key: string, v: string) => onChange({ ...values, [key]: v });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {filters.map((f) => {
        const v = values[f.key] ?? "";
        const label = f.label;
        switch (f.type) {
          case "date":
            return <Input key={f.key} label={label} type="date" value={v} onChange={(e) => set(f.key, e.target.value)} />;
          case "year":
            return <YearSelect key={f.key} label={label} value={v} onChange={(id) => set(f.key, id)} />;
          case "class":
            return <Select key={f.key} label={label} value={v} onChange={(x) => set(f.key, x)} options={[{ value: "", label: "All classes" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />;
          case "section":
            return (
              <Select
                key={f.key}
                label={label}
                value={v}
                disabled={!cls}
                onChange={(x) => set(f.key, x)}
                options={[{ value: "", label: cls ? "All sections" : "Choose a class first" }, ...(sections.data ?? []).map((s) => ({ value: s.id, label: s.label }))]}
              />
            );
          case "master":
            return <MasterFilter key={f.key} label={label} master={f.master ?? ""} value={v} onChange={(x) => set(f.key, x)} />;
          case "select":
            return <Select key={f.key} label={label} value={v} onChange={(x) => set(f.key, x)} options={f.options ?? []} />;
          default:
            return <Input key={f.key} label={label} value={v} onChange={(e) => set(f.key, e.target.value)} />;
        }
      })}
    </div>
  );
}
