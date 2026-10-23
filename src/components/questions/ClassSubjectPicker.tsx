"use client";

import { useEffect } from "react";
import { Select } from "@/components/forms";
import { PickerOptions } from "@/lib/api/questions";

/** Class + subject (only the ones the person works on); picks the first when there is one. */
export function ClassSubjectPicker({ options, classId, subjectId, onChange, allowAll = false }: { options: PickerOptions; classId: string; subjectId: string; onChange: (classId: string, subjectId: string) => void; allowAll?: boolean }) {
  const cls = options.classes.find((c) => c.id === classId);
  useEffect(() => {
    if (!allowAll && !classId && options.classes.length) onChange(options.classes[0].id, options.classes[0].subjects[0]?.id ?? "");
  }, [allowAll, classId, options.classes, onChange]);
  return (
    <>
      <Select label="Class" value={classId} onChange={(c) => onChange(c, allowAll ? "" : (options.classes.find((x) => x.id === c)?.subjects[0]?.id ?? ""))} className="w-full sm:w-44" options={[...(allowAll ? [{ value: "", label: "All" }] : []), ...options.classes.map((c) => ({ value: c.id, label: c.name }))]} />
      <Select label="Subject" value={subjectId} onChange={(s) => onChange(classId, s)} className="w-full sm:w-48" options={[...(allowAll || !cls ? [{ value: "", label: cls ? "All" : "Choose a class" }] : []), ...(cls?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
    </>
  );
}
