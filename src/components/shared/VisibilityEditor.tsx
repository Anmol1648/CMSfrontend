"use client";

import { useQuery } from "@tanstack/react-query";
import { Checkbox, Select } from "@/components/forms";
import { academicApi } from "@/lib/api/academic";
import { Audience, Rule } from "@/lib/api/shared";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

/**
 * Who can see a folder or a file: the same as its folder (inherit), everyone, all staff, or chosen
 * roles / sections (and their parents). Teachers (onlySections) choose only among their own sections.
 */
export function VisibilityEditor({ value, onChange, roles, inheritLabel = "Same as the folder it is in", onlySections }: { value: Rule; onChange: (r: Rule) => void; roles: { slug: string; name: string }[]; inheritLabel?: string; onlySections?: string[] }) {
  const years = useQuery({ queryKey: ["academic", "years"], queryFn: academicApi.years });
  const yearId = years.data?.find((y) => y.isCurrent)?.id;
  const sections = useQuery({ queryKey: ["academic", "section-options", yearId], queryFn: () => academicApi.sectionOptions(yearId!), enabled: !!yearId });
  const set = (p: Partial<Rule>) => onChange({ ...value, ...p });
  const mode = onlySections ? "custom" : value.inherit ? "inherit" : value.audience;
  const list = (sections.data ?? []).filter((s) => !onlySections || onlySections.includes(s.id));
  const toggle = (key: "roleSlugs" | "sectionIds", id: string) => set({ [key]: value[key].includes(id) ? value[key].filter((x) => x !== id) : [...value[key], id] } as Partial<Rule>);
  return (
    <div className="space-y-3 rounded-xl bg-surface-container-low p-3">
      {!onlySections && (
        <Select
          label="Who can see it"
          value={mode}
          onChange={(m) => (m === "inherit" ? set({ inherit: true }) : set({ inherit: false, audience: m as Audience }))}
          options={[
            { value: "inherit", label: inheritLabel },
            { value: "everyone", label: "Everyone (students, parents, staff)" },
            { value: "staff", label: "All staff" },
            { value: "custom", label: "Chosen roles / classes" },
          ]}
        />
      )}
      {mode === "custom" && (
        <>
          {!onlySections && (
            <div>
              <p className={label}>Roles</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <button key={r.slug} type="button" onClick={() => toggle("roleSlugs", r.slug)} className={cn("rounded-full px-3 py-1 text-xs font-bold border", value.roleSlugs.includes(r.slug) ? "bg-primary text-white border-primary" : "border-outline-variant/30 text-on-surface-variant bg-white")}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className={label}>{onlySections ? "Your sections that can see it" : "Sections (their students and teachers)"}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {list.map((s) => (
                <button key={s.id} type="button" onClick={() => toggle("sectionIds", s.id)} className={cn("rounded-full px-3 py-1 text-xs font-bold border", value.sectionIds.includes(s.id) ? "bg-primary text-white border-primary" : "border-outline-variant/30 text-on-surface-variant bg-white")}>
                  {s.label}
                </button>
              ))}
              {!list.length && <span className="text-xs text-on-surface-variant">No sections.</span>}
            </div>
          </div>
          <Checkbox checked={value.withParents} onChange={(w) => set({ withParents: w })} label="Their parents can see it too" />
        </>
      )}
    </div>
  );
}
