"use client";

import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/forms";
import { Audience, noticesApi } from "@/lib/api/notices";

/** Who a notice or event is for: everyone, staff (all or some roles), students / parents (all or some classes / sections). */
export function AudiencePicker({ value, onChange }: { value: Audience; onChange: (a: Audience) => void }) {
  const opts = useQuery({ queryKey: ["notice-audience-options"], queryFn: noticesApi.audienceOptions, staleTime: 5 * 60_000 });
  const o = opts.data;
  const set = (patch: Partial<Audience>) => onChange({ ...value, ...patch });
  const toggle = (key: "roleIds" | "classIds" | "sectionIds", id: string, on: boolean) => set({ [key]: on ? [...value[key], id] : value[key].filter((x) => x !== id) });
  const families = value.forEveryone || value.forStudents || value.forParents;
  const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
  return (
    <div className="space-y-4 rounded-xl bg-surface-container-low p-4">
      <span className={label}>Who is it for</span>
      <Checkbox label="Everyone" hint="All staff, students and parents" checked={value.forEveryone} onChange={(c) => set({ forEveryone: c })} />
      {!value.forEveryone && (
        <>
          <div className="space-y-2">
            <Checkbox label="All staff" checked={value.forAllStaff} onChange={(c) => set({ forAllStaff: c, ...(c ? { roleIds: [] } : {}) })} />
            {!value.forAllStaff && !!o?.roles.length && (
              <div className="ml-7 flex flex-wrap gap-x-5 gap-y-2">
                {o.roles.map((r) => (
                  <Checkbox key={r.id} label={r.name} checked={value.roleIds.includes(r.id)} onChange={(c) => toggle("roleIds", r.id, c)} />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Checkbox label="Students" checked={value.forStudents} onChange={(c) => set({ forStudents: c })} />
            <Checkbox label="Parents" checked={value.forParents} onChange={(c) => set({ forParents: c })} />
          </div>
        </>
      )}
      {families && o && (
        <div className="space-y-3">
          <p className="text-xs text-on-surface-variant/70">
            Students / parents of {value.classIds.length || value.sectionIds.length ? "only the classes and sections ticked below" : "the whole school (tick classes or sections to narrow it)"}.
          </p>
          <div>
            <span className={label}>Classes</span>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {o.classes.map((c) => (
                <Checkbox key={c.id} label={c.name} checked={value.classIds.includes(c.id)} onChange={(on) => toggle("classIds", c.id, on)} />
              ))}
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-primary">Or only some sections{value.sectionIds.length ? ` (${value.sectionIds.length})` : ""}</summary>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {o.sections
                .filter((s) => !value.classIds.includes(s.classId))
                .map((s) => (
                  <Checkbox key={s.id} label={s.label} checked={value.sectionIds.includes(s.id)} onChange={(on) => toggle("sectionIds", s.id, on)} />
                ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
