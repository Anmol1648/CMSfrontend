"use client";

import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Checkbox, Detail, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { useQuery } from "@tanstack/react-query";
import { mastersApi } from "@/lib/api/masters";
import { formsApi } from "@/lib/api/forms";
import type { CustomField, CustomValues } from "@/lib/api/forms";

/**
 * The school's own fields on a form (Setup → Form Builder), each under its section heading
 * ("Other details" when none), and the same values shown on a profile.
 */

const OTHER = "Other details";
const sections = (fields: CustomField[]) => {
  const out = new Map<string, CustomField[]>();
  for (const f of fields.filter((x) => x.active)) out.set(f.section || OTHER, [...(out.get(f.section || OTHER) ?? []), f]);
  return Array.from(out.entries());
};

function FieldInput({ f, value, onChange, error, disabled }: { f: CustomField; value: unknown; onChange: (v: unknown) => void; error?: string; disabled?: boolean }) {
  const label = `${f.label}${f.required ? " *" : ""}`;
  const str = value === undefined || value === null ? "" : String(value);
  switch (f.type) {
    case "textarea":
      return (
        <label className="flex flex-col gap-2 md:col-span-3">
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</span>
          <textarea value={str} onChange={(e) => onChange(e.target.value)} rows={3} maxLength={2000} disabled={disabled} className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/10" />
          {f.help && <span className="ml-1 text-xs text-on-surface-variant/70">{f.help}</span>}
          {error && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-error">{error}</span>}
        </label>
      );
    case "boolean":
      return (
        <div className="flex items-end pb-2">
          <Checkbox checked={value === true} onChange={(v) => onChange(v)} label={label} hint={f.help ?? undefined} disabled={disabled} />
        </div>
      );
    case "select":
      return <Select label={label} value={str} onChange={onChange} options={[{ value: "", label: "Not given" }, ...f.options.map((o) => ({ value: o, label: o }))]} error={error} />;
    case "multiselect": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-2 md:col-span-3">
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {f.options.map((o) => (
              <Checkbox key={o} checked={list.includes(o)} disabled={disabled} label={o} onChange={(on) => onChange(on ? [...list, o] : list.filter((x) => x !== o))} />
            ))}
          </div>
          {error && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-error">{error}</span>}
        </div>
      );
    }
    case "master":
      return <MasterSelect master={f.master ?? ""} label={label} value={str} onChange={onChange} error={error} disabled={disabled} placeholder="Not given" />;
    default:
      return (
        <Input
          label={label}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          error={error ?? (f.help ? undefined : undefined)}
          disabled={disabled}
          type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
          inputMode={f.type === "phone" ? "tel" : undefined}
          placeholder={f.help ?? undefined}
          maxLength={f.type === "text" ? 200 : undefined}
        />
      );
  }
}

/** The extra fields to fill, as cards like the rest of the form. Errors come as "custom.<key>". */
export function CustomFieldsForm({ fields, values, onChange, errors = {}, disabled }: { fields: CustomField[]; values: CustomValues; onChange: (next: CustomValues) => void; errors?: Record<string, string>; disabled?: boolean }) {
  return (
    <>
      {sections(fields).map(([title, list]) => (
        <Card key={title} className="space-y-5">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {list.map((f) => (
              <FieldInput key={f.key} f={f} value={values[f.key]} error={errors[`custom.${f.key}`]} disabled={disabled} onChange={(v) => onChange({ ...values, [f.key]: v })} />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

/** Master names for the values of "Masters list" fields. */
function useMasterNames(fields: CustomField[], values: CustomValues) {
  const lists = Array.from(new Set(fields.filter((f) => f.type === "master" && f.master && values[f.key]).map((f) => f.master!)));
  const q = useQuery({ queryKey: ["custom-field-masters", lists.join(",")], queryFn: async () => Object.fromEntries(await Promise.all(lists.map(async (l) => [l, await mastersApi.options(l)] as const))), enabled: lists.length > 0, staleTime: 300_000 });
  return (list: string | null, id: string) => (list ? q.data?.[list]?.find((o) => o.id === id)?.name : undefined) ?? "";
}

export const customValueText = (f: CustomField, v: unknown, masterName?: (list: string | null, id: string) => string) => {
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return "—";
  if (f.type === "boolean") return v ? "Yes" : "No";
  if (f.type === "multiselect") return (v as string[]).join(", ");
  if (f.type === "master") return masterName?.(f.master, String(v)) || "—";
  if (f.type === "date") return new Date(`${v}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return String(v);
};

/** The extra fields on a profile, under their section headings. */
export function CustomFieldsView({ fields, values }: { fields: CustomField[]; values: CustomValues }) {
  const name = useMasterNames(fields, values);
  if (!fields.some((f) => f.active)) return null;
  return (
    <>
      {sections(fields).map(([title, list]) => (
        <Card key={title} className="space-y-3">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {list.map((f) => (
              <Detail key={f.key} label={f.label} value={customValueText(f, values[f.key], name)} />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

/** A form's extra fields for the signed-in person (Setup → Form Builder). */
export const useFormExtras = (key: string) => useQuery({ queryKey: ["form-extras", key], queryFn: () => formsApi.extras(key), staleTime: 60_000 });

/** A record's extra fields on one line ("Bus pass no.: BP-12 · Stays as: Day scholar"), for lists. */
export function CustomValuesInline({ formKey, values, className }: { formKey: string; values: CustomValues | undefined; className?: string }) {
  const extras = useFormExtras(formKey);
  const fields = (extras.data?.custom ?? []).filter((f) => values && values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== "");
  const name = useMasterNames(fields, values ?? {});
  if (!fields.length) return null;
  return <p className={className ?? "mt-1 text-xs text-on-surface-variant"}>{fields.map((f) => `${f.label}: ${customValueText(f, values![f.key], name)}`).join(" · ")}</p>;
}
