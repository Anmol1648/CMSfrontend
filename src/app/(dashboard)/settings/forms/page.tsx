"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { DragHandle, SortableItem, SortableList, arrayMove } from "@/components/ui/Sortable";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { BuiltInField, CustomField, FIELD_TYPES, FormSetup, formsApi } from "@/lib/api/forms";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";

/**
 * Setup → Form Builder: for the student and staff forms, hide the built-in fields the school
 * doesn't use, make fields required, rename them, and add the school's own fields.
 */

type Extra = CustomField & { used: number };
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60";
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1")
    .slice(0, 40) || "field";

function FieldEditor({ field, taken, sections, roles, onSave, onClose }: { field: Extra | null; taken: string[]; sections: string[]; roles: FormSetup["roles"]; onSave: (f: Extra) => void; onClose: () => void }) {
  const catalogue = useQuery({ queryKey: ["masters"], queryFn: mastersApi.catalogue });
  const [f, setF] = useState<Extra>(field ?? { key: "", label: "", type: "text", options: [], master: null, required: false, help: null, section: null, active: true, visibleTo: [], used: 0 });
  const [options, setOptions] = useState((field?.options ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Extra>(k: K, v: Extra[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const label = f.label.trim();
    if (!label) return setError("Give the field a name");
    let key = field ? f.key : slug(label);
    for (let n = 2; !field && taken.includes(key); n++) key = `${slug(label).slice(0, 36)}_${n}`;
    const list = options.split("\n").map((o) => o.trim()).filter(Boolean);
    if ((f.type === "select" || f.type === "multiselect") && !list.length) return setError("Give the choices, one on each line");
    if (f.type === "master" && !f.master) return setError("Choose the Masters list it picks from");
    onSave({ ...f, key, label, options: f.type === "select" || f.type === "multiselect" ? list : [], master: f.type === "master" ? f.master : null, help: f.help?.trim() || null, section: f.section?.trim() || null });
  };
  return (
    <Modal isOpen onClose={onClose} title={field ? `Change “${field.label}”` : "Add a field"} width="max-w-xl">
      <div className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <Input label="Name on the form" value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Bus pass no." maxLength={60} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" value={f.type} onChange={(v) => set("type", v as Extra["type"])} options={FIELD_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Section (heading on the form)</span>
            <input list="form-sections" value={f.section ?? ""} onChange={(e) => set("section", e.target.value || null)} placeholder="Other details" maxLength={60} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <datalist id="form-sections">
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        </div>
        {(f.type === "select" || f.type === "multiselect") && (
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Choices (one on each line)</span>
            <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={5} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" placeholder={"Day scholar\nHosteller"} />
          </label>
        )}
        {f.type === "master" && (
          <Select
            label="Masters list"
            value={f.master ?? ""}
            onChange={(v) => set("master", v || null)}
            options={[{ value: "", label: "Choose…" }, ...(catalogue.data ?? []).flatMap((g) => g.masters.map((m) => ({ value: m.key, label: `${m.plural} (${g.label})` })))]}
          />
        )}
        <Input label="Hint under the field (optional)" value={f.help ?? ""} onChange={(e) => set("help", e.target.value || null)} maxLength={200} />
        <MultiSelect label="Who can see and fill it (none chosen = everyone who sees the record)" options={roles.map((r) => ({ value: r.id, label: r.name }))} defaultValues={f.visibleTo} onChange={(v) => set("visibleTo", v)} />
        <Checkbox checked={f.required} onChange={(v) => set("required", v)} label="Required" hint="The form can't be saved without it (only for those who see it)." />
        {field && f.used > 0 && <FormAlert tone="info">{f.used} record{f.used === 1 ? " has" : "s have"} a value in this field. Changing its type may make old values look wrong.</FormAlert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{field ? "Done" : "Add"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function FormEditor({ setup, canEdit }: { setup: FormSetup; canEdit: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [builtIn, setBuiltIn] = useState<BuiltInField[]>(setup.builtIn);
  const [custom, setCustom] = useState<Extra[]>(setup.custom);
  const [editing, setEditing] = useState<Extra | null | "new">(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(builtIn) !== JSON.stringify(setup.builtIn) || JSON.stringify(custom) !== JSON.stringify(setup.custom);
  const upd = (key: string, v: Partial<BuiltInField>) => setBuiltIn((x) => x.map((b) => (b.key === key ? { ...b, ...v } : b)));
  const sections = Array.from(new Set(custom.map((c) => c.section).filter((s): s is string => !!s)));
  const save = async () => {
    setBusy(true);
    try {
      await formsApi.save(setup.key, { builtIn: builtIn.map((b) => ({ key: b.key, label: b.label.trim() && b.label.trim() !== b.defaultLabel ? b.label.trim() : null, hidden: b.hidden, required: b.required })), custom: custom.map(({ used: _u, ...c }) => c) });
      await qc.invalidateQueries({ queryKey: ["form-setup", setup.key] });
      qc.invalidateQueries({ queryKey: [setup.key === "student" ? "student-form-config" : "staff-form-config"] });
      showToast(`${setup.label} form saved: forms show the change straight away`, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (c: Extra) => {
    const used = c.used > 0;
    if (!(await confirm({ title: used ? `Switch off “${c.label}”?` : `Remove “${c.label}”?`, message: used ? `${c.used} record${c.used === 1 ? " has" : "s have"} a value in it. It is hidden from the forms; the values are kept and come back if you switch it on again.` : "It has no values yet, so it is removed.", confirmLabel: used ? "Switch off" : "Remove", danger: !used }))) return;
    setCustom((x) => (used ? x.map((y) => (y.key === c.key ? { ...y, active: false } : y)) : x.filter((y) => y.key !== c.key)));
  };

  return (
    <div className="space-y-5 pb-20">
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="text-lg font-bold text-primary">Built-in fields</h2>
          <p className="text-sm text-on-surface-variant/70">Untick “Used” for fields the school doesn’t collect: they leave the form, the profile and the Excel export (values already saved are kept). Type a new name to rename a field everywhere.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="px-5 py-2">Field</th>
                <th className="px-3 py-2">Name on the form</th>
                <th className="px-3 py-2 text-center">Used</th>
                <th className="px-3 py-2 text-center">Required</th>
              </tr>
            </thead>
            <tbody>
              {builtIn.map((b) => (
                <tr key={b.key} className={cn("border-t border-outline-variant/10", b.hidden && "bg-surface-container-low/60")}>
                  <td className="px-5 py-2">
                    <span className={cn("font-semibold", b.hidden && "text-on-surface-variant line-through")}>{b.defaultLabel}</span>
                    {b.locked && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] text-on-surface-variant" title="The rest of the ERP depends on it: it can be renamed, not hidden">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>always used
                      </span>
                    )}
                    {b.requireOnly && <span className="ml-2 text-[11px] text-on-surface-variant">(a rule, not a field)</span>}
                  </td>
                  <td className="px-3 py-2">
                    {!b.requireOnly && <input value={b.label} onChange={(e) => upd(b.key, { label: e.target.value })} disabled={!canEdit || b.hidden} placeholder={b.defaultLabel} maxLength={60} className="w-full min-w-[12rem] rounded-lg bg-surface-container-low px-3 py-1.5 text-sm outline-none disabled:opacity-50" aria-label={`Name for ${b.defaultLabel}`} />}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" className="h-4 w-4 accent-[#1A365D]" checked={!b.hidden} disabled={!canEdit || b.locked || b.requireOnly} onChange={(e) => upd(b.key, { hidden: !e.target.checked, ...(e.target.checked ? {} : { required: false }) })} aria-label={`Use ${b.defaultLabel}`} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" className="h-4 w-4 accent-[#1A365D]" checked={b.required} disabled={!canEdit || b.fixedRequired || b.hidden} onChange={(e) => upd(b.key, { required: e.target.checked })} aria-label={`${b.defaultLabel} required`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-primary">The school’s own fields</h2>
            <p className="text-sm text-on-surface-variant/70">Extra fields appear on the form under their section, on the profile, in the Excel export and import, in the Report Builder and on ID card designs. In document templates (TC, certificates) use <code>{"{{student.custom.key}}"}</code>. Drag ⋮⋮ to change their order.</p>
          </div>
          {canEdit && <Button onClick={() => setEditing("new")}>Add a field</Button>}
        </div>
        <SortableList ids={custom.map((c) => c.key)} onDrop={(d) => setCustom((x) => arrayMove(x, d.from, d.to))} disabled={!canEdit}>
          {custom.map((c) => (
            <SortableItem key={c.key} id={c.key} className={cn("flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2", !c.active && "opacity-60")}>
              <DragHandle label={c.label} />
              <div className="min-w-[12rem] flex-1">
                <p className="text-sm font-bold">
                  {c.label}
                  {c.required && <span className="text-error"> *</span>}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {FIELD_TYPES.find((t) => t.value === c.type)?.label}
                  {c.options.length ? `: ${c.options.slice(0, 4).join(", ")}${c.options.length > 4 ? "…" : ""}` : ""} · {c.section || "Other details"}
                  {c.used ? ` · ${c.used} with a value` : ""}
                  {" · "}
                  <span className="font-mono" title="Use in document templates as {{student.custom.KEY}}">key: {c.key}</span>
                  {c.visibleTo?.length ? ` · only ${c.visibleTo.map((id) => setup.roles.find((r) => r.id === id)?.name).filter(Boolean).join(", ")}` : ""}
                </p>
              </div>
              {!c.active && <Pill>Switched off</Pill>}
              {canEdit && (
                <div className="flex gap-3">
                  {!c.active && (
                    <button type="button" onClick={() => setCustom((x) => x.map((y) => (y.key === c.key ? { ...y, active: true } : y)))} className="text-xs font-bold uppercase tracking-widest text-primary">
                      Switch on
                    </button>
                  )}
                  <button type="button" onClick={() => setEditing(c)} className="text-xs font-bold uppercase tracking-widest text-primary">
                    Change
                  </button>
                  {c.active && (
                    <button type="button" onClick={() => remove(c)} className="text-xs font-bold uppercase tracking-widest text-error">
                      Remove
                    </button>
                  )}
                </div>
              )}
            </SortableItem>
          ))}
        </SortableList>
        {!custom.length && <p className="text-sm text-on-surface-variant">No extra fields yet.</p>}
      </Card>

      {canEdit && dirty && (
        <div className="fixed bottom-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3 text-white shadow-2xl lg:left-[18rem]">
          <span className="text-sm font-bold">Unsaved changes to the {setup.label.toLowerCase()} form</span>
          <div className="flex items-center gap-3">
            <button type="button" disabled={busy} className="text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white" onClick={() => (setBuiltIn(setup.builtIn), setCustom(setup.custom))}>
              Discard
            </button>
            <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-primary hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <FieldEditor
          field={editing === "new" ? null : editing}
          taken={[...custom.map((c) => c.key), ...builtIn.map((b) => b.key)]}
          sections={sections}
          roles={setup.roles}
          onClose={() => setEditing(null)}
          onSave={(f) => {
            setCustom((x) => (editing === "new" ? [...x, f] : x.map((y) => (y.key === f.key ? f : y))));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Forms() {
  const { can } = useAuth();
  const list = useQuery({ queryKey: ["forms"], queryFn: formsApi.list });
  const [form, setForm] = useState("student");
  const setup = useQuery({ queryKey: ["form-setup", form], queryFn: () => formsApi.get(form) });
  useEffect(() => {
    if (list.data?.length && !list.data.some((f) => f.key === form)) setForm(list.data[0].key);
  }, [list.data, form]);
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap gap-2">
        {(list.data ?? []).map((f) => (
          <button key={f.key} type="button" onClick={() => setForm(f.key)} className={cn("rounded-xl px-4 py-2 text-sm font-bold", form === f.key ? "bg-primary text-white" : "bg-surface-container-low text-primary hover:bg-surface-container-high")}>
            {f.label} form
          </button>
        ))}
      </div>
      {setup.isLoading ? <PageLoader /> : setup.error ? <FormAlert>{errorMessage(setup.error)}</FormAlert> : <FormEditor key={`${form}-${setup.dataUpdatedAt}`} setup={setup.data!} canEdit={can("forms.manage")} />}
    </div>
  );
}

export default function FormBuilderPage() {
  return (
    <RequirePermission permission="forms.manage">
      <PageHeader title="Form Builder" description="Choose which fields the student and staff forms show, what they are called, which are required, and add the school’s own fields." />
      <Forms />
    </RequirePermission>
  );
}
