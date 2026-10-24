"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { WidgetPreview } from "@/components/dashboard/Widget";
import type { WidgetData, WidgetSize, WidgetType } from "@/lib/api/dashboard";
import { blankDefinition, DATE_PRESETS, Definition, FN_LABEL, Fn, Op, OP_LABEL, SHOW_AS, Source, SourceField, widgetsApi } from "@/lib/api/widgets";

const NO_VALUE: Op[] = ["empty", "notEmpty", "yes", "no"];
const NUMERIC = (f: SourceField) => f.type === "number" || f.type === "money";
const fieldOpts = (fields: SourceField[], none?: string) => [...(none ? [{ value: "", label: none }] : []), ...fields.map((f) => ({ value: f.key, label: f.group ? `${f.label} (${f.group})` : f.label }))];

/** A date: one of the relative choices (today, 30 days ago…) or a fixed date. */
function DateValue({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const preset = DATE_PRESETS.some((p) => p.value === value);
  const [fixed, setFixed] = useState(!preset && !!value);
  return (
    <div className="flex gap-2">
      <Select
        label={label}
        value={fixed ? "__date" : value}
        onChange={(v) => {
          if (v === "__date") {
            setFixed(true);
            onChange("");
          } else {
            setFixed(false);
            onChange(v);
          }
        }}
        options={[{ value: "", label: "—" }, ...DATE_PRESETS, { value: "__date", label: "A date…" }]}
      />
      {fixed && <Input label={label ? " " : undefined} type="date" value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const copy = params.get("copy");
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { access } = useAuth();
  const sources = useQuery({ queryKey: ["widget-sources"], queryFn: widgetsApi.sources, staleTime: 10 * 60_000 });
  const roles = useQuery({ queryKey: ["custom-widget-roles"], queryFn: widgetsApi.roles });
  const existing = useQuery({ queryKey: ["custom-widget", id ?? copy], queryFn: () => widgetsApi.get((id ?? copy)!), enabled: !!(id ?? copy) });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState<WidgetSize>("sm");
  const [href, setHref] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [d, setD] = useState<Definition>(blankDefinition());
  const [preview, setPreview] = useState<(WidgetData & { type: WidgetType }) | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const w = existing.data;
    if (!w) return;
    setName(copy ? `${w.name} (copy)` : w.name);
    setDescription(w.description);
    setSize(w.size);
    setHref(w.href ?? "");
    setRoleIds(w.roleIds);
    setIsActive(w.isActive);
    setD(w.definition);
  }, [existing.data, copy]);

  const src: Source | undefined = sources.data?.find((s) => s.key === d.source);
  const plain = useMemo(() => (src?.fields ?? []).filter((f) => !f.sensitive), [src]);
  const ds = d.display;
  const setDisplay = (x: Partial<Definition["display"]>) => setD((v) => ({ ...v, display: { ...v.display, ...x } }));

  // The live preview: worked out on your own data, a moment after you stop changing things.
  const key = JSON.stringify(d);
  useEffect(() => {
    if (!d.source) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      widgetsApi
        .preview(d)
        .then((p) => {
          setPreview(p);
          setPreviewError(null);
        })
        .catch((e) => {
          setPreview(null);
          setPreviewError(errorMessage(e));
        });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (sources.isLoading || (existing.isLoading && (id || copy))) return <PageLoader />;
  if (sources.error) return <FormAlert>{errorMessage(sources.error)}</FormAlert>;
  const categories = Array.from(new Set(sources.data!.map((s) => s.category)));
  const groupField = plain.find((f) => f.key === ds.groupBy);
  const pages = (access?.menu ?? []).flatMap((g) => g.items.map((i) => ({ value: i.href, label: `${i.label} (${g.label})` })));
  const measureFields = ds.measure.fn === "count" ? [] : ds.measure.fn === "distinct" ? plain : plain.filter(NUMERIC);

  const save = async () => {
    setSaving(true);
    try {
      await widgetsApi.save(id, { name, description, size, href: href || null, roleIds, isActive, definition: d });
      qc.invalidateQueries({ queryKey: ["custom-widgets"] });
      qc.invalidateQueries({ queryKey: ["my-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dash-my-catalogue"] });
      qc.invalidateQueries({ queryKey: ["widget"] });
      showToast(id ? "Widget saved" : "Widget made: add it from Customise → Add widgets", "success");
      router.push("/dashboard/widgets");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
      <div className="min-w-0 space-y-4">
        <Card className="space-y-3">
          <p className="font-bold">1. Name</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Title on the dashboard" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Overdue fees in senior classes" />
            <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="font-bold">2. Data</p>
          <Select
            label="From"
            value={d.source}
            onChange={(v) => setD({ ...blankDefinition(v), display: { ...blankDefinition(v).display, type: ds.type } })}
            options={[{ value: "", label: "Choose the data…" }, ...categories.flatMap((c) => sources.data!.filter((s) => s.category === c).map((s) => ({ value: s.key, label: `${c} · ${s.label}` })))]}
          />
          {src && <p className="text-xs text-on-surface-variant">{src.description}</p>}
          {src && src.params.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {src.params.map((p) =>
                p.type === "date" ? (
                  <DateValue key={p.key} label={`${p.label} (default: ${p.default ?? "—"})`} value={d.params[p.key] ?? ""} onChange={(v) => setD({ ...d, params: { ...d.params, [p.key]: v } })} />
                ) : p.type === "select" ? (
                  <Select key={p.key} label={p.label} value={d.params[p.key] ?? p.default ?? ""} onChange={(v) => setD({ ...d, params: { ...d.params, [p.key]: v } })} options={p.options ?? []} />
                ) : p.type === "year" ? (
                  <p key={p.key} className="text-xs text-on-surface-variant self-end">
                    {p.label}: the current session
                  </p>
                ) : (
                  <Input key={p.key} label={p.label} value={d.params[p.key] ?? ""} placeholder={p.default ?? ""} onChange={(e) => setD({ ...d, params: { ...d.params, [p.key]: e.target.value } })} />
                )
              )}
            </div>
          )}
        </Card>

        {src && (
          <Card className="space-y-3">
            <p className="font-bold">3. Only the records where… (optional)</p>
            {d.filters.map((x, i) => {
              const f = plain.find((y) => y.key === x.field);
              const set = (v: Partial<Definition["filters"][number]>) => setD({ ...d, filters: d.filters.map((y, j) => (j === i ? { ...y, ...v } : y)) });
              return (
                <div key={i} className="grid items-end gap-2 md:grid-cols-[1fr_10rem_1fr_auto]">
                  <Select value={x.field} onChange={(v) => set({ field: v, op: plain.find((y) => y.key === v)?.ops[0] ?? "eq", value: "", value2: "" })} options={fieldOpts(plain)} />
                  <Select value={x.op} onChange={(v) => set({ op: v as Op })} options={(f?.ops ?? []).map((o) => ({ value: o, label: OP_LABEL[o] }))} />
                  {NO_VALUE.includes(x.op) ? (
                    <span />
                  ) : f?.type === "date" ? (
                    <div className="flex gap-2">
                      <DateValue value={x.value} onChange={(v) => set({ value: v })} />
                      {x.op === "between" && <DateValue value={x.value2} onChange={(v) => set({ value2: v })} />}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input value={x.value} onChange={(e) => set({ value: e.target.value })} type={f && NUMERIC(f) ? "number" : "text"} placeholder={x.op === "in" ? "a, b, c" : ""} />
                      {x.op === "between" && <Input value={x.value2} onChange={(e) => set({ value2: e.target.value })} type={f && NUMERIC(f) ? "number" : "text"} />}
                    </div>
                  )}
                  <button type="button" className="material-symbols-outlined mb-2 text-error" onClick={() => setD({ ...d, filters: d.filters.filter((_, j) => j !== i) })} aria-label="Remove condition">
                    close
                  </button>
                </div>
              );
            })}
            <button type="button" className="text-xs font-bold uppercase tracking-widest text-primary" onClick={() => plain[0] && setD({ ...d, filters: [...d.filters, { field: plain[0].key, op: plain[0].ops[0], value: "", value2: "" }] })}>
              + Add a condition
            </button>
          </Card>
        )}

        {src && (
          <Card className="space-y-4">
            <p className="font-bold">4. Show it as</p>
            <div className="flex flex-wrap gap-2">
              {SHOW_AS.map((s) => (
                <button key={s.value} type="button" onClick={() => setDisplay({ type: s.value })} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold", ds.type === s.value ? "border-primary bg-primary/5 text-primary" : "border-outline-variant/30")}>
                  <span className="material-symbols-outlined text-lg">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
            {!(ds.type === "list" && !ds.groupBy) && (
              <div className="grid gap-3 md:grid-cols-2">
                <Select label="What to work out" value={ds.measure.fn} onChange={(v) => setDisplay({ measure: { fn: v as Fn, field: v === "count" ? null : ds.measure.field } })} options={(Object.keys(FN_LABEL) as Fn[]).map((k) => ({ value: k, label: FN_LABEL[k] }))} />
                {ds.measure.fn !== "count" && <Select label="Of" value={ds.measure.field ?? ""} onChange={(v) => setDisplay({ measure: { ...ds.measure, field: v || null } })} options={fieldOpts(measureFields, "Choose…")} />}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <Select label={ds.type === "stat" ? "Top 3 under the number by (optional)" : ds.type === "list" ? "Group by (optional)" : "Group by"} value={ds.groupBy ?? ""} onChange={(v) => setDisplay({ groupBy: v || null, bucket: plain.find((f) => f.key === v)?.type === "date" ? (ds.bucket ?? "month") : null })} options={fieldOpts(plain, ds.type === "bar" || ds.type === "line" || ds.type === "donut" ? "Choose…" : "— none —")} />
              {groupField?.type === "date" && <Select label="By" value={ds.bucket ?? "day"} onChange={(v) => setDisplay({ bucket: v as "day" | "week" | "month" })} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />}
              {ds.type !== "stat" && <Input label={ds.type === "list" && !ds.groupBy ? "How many lines" : "How many bars / slices / lines"} type="number" min={1} max={50} value={String(ds.limit)} onChange={(e) => setDisplay({ limit: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })} />}
              {ds.groupBy && ds.type !== "stat" && <Select label="Order" value={ds.sort} onChange={(v) => setDisplay({ sort: v as Definition["display"]["sort"] })} options={[{ value: "value_desc", label: "Biggest first" }, { value: "value_asc", label: "Smallest first" }, { value: "label_asc", label: "By name / date (A–Z, oldest first)" }, { value: "label_desc", label: "By name / date (Z–A, newest first)" }]} />}
            </div>
            {ds.type === "list" && !ds.groupBy && (
              <div className="grid gap-3 md:grid-cols-3">
                <Select label="Each line shows" value={ds.list.title ?? ""} onChange={(v) => setDisplay({ list: { ...ds.list, title: v || null } })} options={fieldOpts(src.fields, "Choose…")} />
                <Select label="Under it" value={ds.list.sub ?? ""} onChange={(v) => setDisplay({ list: { ...ds.list, sub: v || null } })} options={fieldOpts(src.fields, "— nothing —")} />
                <Select label="On the right" value={ds.list.meta ?? ""} onChange={(v) => setDisplay({ list: { ...ds.list, meta: v || null } })} options={fieldOpts(src.fields, "— nothing —")} />
                <Select label="Sorted by" value={ds.list.sortBy ?? ""} onChange={(v) => setDisplay({ list: { ...ds.list, sortBy: v || null } })} options={fieldOpts(plain, "— as it comes —")} />
                <Select label="Order" value={ds.list.dir} onChange={(v) => setDisplay({ list: { ...ds.list, dir: v as "asc" | "desc" } })} options={[{ value: "asc", label: "Smallest / A–Z / oldest first" }, { value: "desc", label: "Biggest / Z–A / newest first" }]} />
              </div>
            )}
            {ds.type === "stat" && (
              <div className="grid gap-3 md:grid-cols-3">
                <Select label="Colour the number when it is" value={ds.tones.direction} onChange={(v) => setDisplay({ tones: { ...ds.tones, direction: v as "above" | "below" } })} options={[{ value: "above", label: "At or above…" }, { value: "below", label: "At or below…" }]} />
                <Input label="Amber at" type="number" value={ds.tones.warnAt ?? ""} onChange={(e) => setDisplay({ tones: { ...ds.tones, warnAt: e.target.value === "" ? null : Number(e.target.value) } })} />
                <Input label="Red at" type="number" value={ds.tones.badAt ?? ""} onChange={(e) => setDisplay({ tones: { ...ds.tones, badAt: e.target.value === "" ? null : Number(e.target.value) } })} />
              </div>
            )}
            <Input label="Line under it (optional)" value={ds.caption} onChange={(e) => setDisplay({ caption: e.target.value })} maxLength={120} placeholder="e.g. Classes IX to XII, this session" />
          </Card>
        )}

        {src && (
          <Card className="space-y-3">
            <p className="font-bold">5. Size, link and who gets it</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Select label="Size" value={size} onChange={(v) => setSize(v as WidgetSize)} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium (2 columns)" }, { value: "lg", label: "Wide (full row)" }]} />
              <Select label="Clicking the title opens" value={href} onChange={setHref} options={[{ value: "", label: "— nothing —" }, ...pages]} />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Offer it to these roles (widget makers always have it)</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(roles.data ?? []).map((r) => (
                  <Checkbox key={r.id} checked={roleIds.includes(r.id)} onChange={(v) => setRoleIds(v ? [...roleIds, r.id] : roleIds.filter((x) => x !== r.id))} label={r.name} />
                ))}
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">A role only sees it if its permissions allow this data ({src.label}). Each person sees their own data: a teacher their classes, a parent their children.</p>
            </div>
            <Checkbox checked={isActive} onChange={setIsActive} label="Switched on" />
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={() => router.push("/dashboard/widgets")}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={name.trim().length < 2 || !d.source}>
            {id ? "Save" : "Make widget"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 xl:sticky xl:top-4 h-fit">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Live preview (your data)</p>
        {!d.source && <FormAlert tone="info">Choose the data to see the widget.</FormAlert>}
        {previewError && <FormAlert tone="warning">{previewError}</FormAlert>}
        {preview && (
          <div className="grid grid-cols-1">
            <WidgetPreview label={name} type={preview.type} size="sm" d={preview} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function WidgetEditorPage() {
  return (
    <RequirePermission permission="dashboard.build">
      <PageHeader title="Make a widget" description="Pick the data, keep only the records you want, and choose how it shows. The preview updates as you go." />
      <Suspense>
        <Editor />
      </Suspense>
    </RequirePermission>
  );
}
