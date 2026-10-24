"use client";

import { ExamPicker } from "./ExamPicker";
import { PtmPicker } from "./PtmPicker";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MoveButtons } from "@/components/ui/MoveButtons";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ReportTable } from "@/components/reports/ReportTable";
import { academicApi } from "@/lib/api/academic";
import { ApiError, errorMessage, saveBlob } from "@/lib/api/client";
import { BuilderPreview, builderApi, DataField, DataSource, Definition, FilterOp } from "@/lib/api/reports";

const EMPTY: Definition = { source: "", params: {}, columns: [], filters: [], sort: [], groupBy: null, totals: [], orientation: "portrait" };
const NO_VALUE: FilterOp[] = ["empty", "notEmpty", "yes", "no"];

const opLabel = (op: FilterOp, type: DataField["type"]) => {
  const date = type === "date";
  return (
    {
      eq: "is",
      neq: "is not",
      contains: "contains",
      notContains: "doesn’t contain",
      starts: "starts with",
      in: "is one of",
      gt: date ? "is after" : "is more than",
      gte: date ? "is on or after" : "is at least",
      lt: date ? "is before" : "is less than",
      lte: date ? "is on or before" : "is at most",
      between: "is between",
      empty: "is empty",
      notEmpty: "is not empty",
      yes: "is yes",
      no: "is no",
    } as Record<FilterOp, string>
  )[op];
};

const DATE_TOKENS = [
  { value: "today", label: "Today" },
  { value: "monthStart", label: "Start of this month" },
  { value: "sessionStart", label: "Start of the session" },
  { value: "yearStart", label: "Start of this year (1 Jan)" },
];

const problem = (err: unknown) => (err instanceof ApiError && err.details.length ? `${err.message} (${err.details.map((d) => d.message).join("; ")})` : errorMessage(err));

/** One input of the data source (session, period): a fixed value or a moving default (today, the current session). */
function ParamInput({ p, value, onChange, year }: { p: DataSource["params"][number]; value: string; onChange: (v: string) => void; year?: string }) {
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions, enabled: p.type === "year" });
  const v = value || p.default || "";
  if (p.type === "year")
    return (
      <Select
        label={p.label}
        value={v}
        onChange={onChange}
        options={[{ value: "current", label: "The current session (moves on by itself)" }, ...(years.data ?? []).map((y) => ({ value: y.id, label: y.name }))]}
      />
    );
  if (p.type === "date") {
    const token = DATE_TOKENS.some((t) => t.value === v);
    return (
      <div className="flex flex-col gap-2">
        <Select label={p.label} value={token ? v : "fixed"} onChange={(x) => onChange(x === "fixed" ? new Date().toISOString().slice(0, 10) : x)} options={[...DATE_TOKENS, { value: "fixed", label: "A fixed date…" }]} />
        {!token && <Input type="date" value={v} onChange={(e) => onChange(e.target.value)} />}
      </div>
    );
  }
  if (p.type === "ptm") return <PtmPicker label={p.label} value={v} onChange={onChange} />;
  if (p.type === "exam") return <ExamPicker label={p.label} year={year ?? ""} value={v} onChange={onChange} />;
  return <Input label={p.label} value={v} onChange={(e) => onChange(e.target.value)} />;
}

export function ReportBuilder({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const sources = useQuery({ queryKey: ["builder-sources"], queryFn: builderApi.sources });
  const roles = useQuery({ queryKey: ["builder-roles"], queryFn: builderApi.roles });
  const existing = useQuery({ queryKey: ["custom-report", id], queryFn: () => builderApi.get(id!), enabled: !!id });

  const [def, setDef] = useState<Definition>(EMPTY);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("My reports");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<BuilderPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!existing.data || loaded.current) return;
    loaded.current = true;
    const r = existing.data;
    setDef(r.definition);
    setName(r.name);
    setDescription(r.description);
    setCategory(r.category);
    setRoleIds(r.roleIds);
  }, [existing.data]);

  const source = sources.data?.find((s) => s.key === def.source);
  const fieldOf = useMemo(() => new Map((source?.fields ?? []).map((f) => [f.key, f])), [source]);
  const set = (patch: Partial<Definition>) => setDef((d) => ({ ...d, ...patch }));

  // A fresh preview a moment after each change.
  const defKey = JSON.stringify(def);
  useEffect(() => {
    if (!def.source || !def.columns.length) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        setPreview(await builderApi.preview(def));
        setPreviewError(null);
      } catch (err) {
        setPreviewError(problem(err));
      } finally {
        setPreviewing(false);
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defKey]);

  if (sources.isError) return <FormAlert>{errorMessage(sources.error)}</FormAlert>;
  if (!sources.data || (id && !existing.data)) return existing.isError ? <FormAlert>{errorMessage(existing.error)}</FormAlert> : <PageLoader />;

  // ─── Step 1: the data ──────────────────────────────────────────────────────
  if (!source) {
    return (
      <>
        <PageHeader
          title="New report"
          description="Choose the data the report is about. You then pick the columns, filters, sorting and grouping, and see the result as you go."
          actions={
            <Link href="/reports" className="px-4 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Report Center
            </Link>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sources.data.map((s) => (
            <button
              key={s.key}
              type="button"
              className="text-left"
              onClick={() => {
                setDef({ ...EMPTY, source: s.key });
                setCategory(s.category);
              }}
            >
              <Card className="h-full hover:shadow-md hover:ring-2 hover:ring-primary/10 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <h3 className="font-black text-primary">{s.label}</h3>
                  <Pill>{s.fields.length} fields</Pill>
                </div>
                <p className="text-sm text-on-surface-variant">{s.description}</p>
              </Card>
            </button>
          ))}
        </div>
        {!sources.data.length && <Card>There is no data you can make reports on.</Card>}
      </>
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const chosen = new Set(def.columns.map((c) => c.field));
  const toggleColumn = (f: DataField) => {
    if (chosen.has(f.key)) set({ columns: def.columns.filter((c) => c.field !== f.key), totals: def.totals.filter((t) => t !== f.key) });
    else set({ columns: [...def.columns, { field: f.key }], totals: f.type === "money" && !def.totals.includes(f.key) ? [...def.totals, f.key] : def.totals });
  };
  const move = (i: number, dir: "up" | "down") => {
    const cols = [...def.columns];
    const j = dir === "up" ? i - 1 : i + 1;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    set({ columns: cols });
  };
  const filterable = source.fields.filter((f) => f.ops.length);
  const groups = new Map<string, DataField[]>();
  for (const f of source.fields) {
    if (search && !f.label.toLowerCase().includes(search.toLowerCase())) continue;
    const g = f.group ?? "Main";
    groups.set(g, [...(groups.get(g) ?? []), f]);
  }
  const setFilter = (i: number, patch: Partial<Definition["filters"][number]>) => set({ filters: def.filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  const save = async () => {
    setSaveError(null);
    const input = { name: name.trim(), description: description.trim(), category: category.trim() || "My reports", roleIds, definition: def };
    try {
      const r = id ? await builderApi.update(id, input) : await builderApi.create(input);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.removeQueries({ queryKey: ["report", r.key] });
      showToast(id ? "Report saved" : "Report saved: it is in the Report Center now", "success");
      router.push(`/reports/${r.key}`);
    } catch (err) {
      setSaveError(problem(err));
    }
  };
  const remove = async () => {
    if (!id || !(await confirm({ title: `Delete “${name}”?`, message: "The report and its Jasper designs are removed for everyone. This can’t be undone.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await builderApi.remove(id);
      showToast("Report deleted", "success");
      router.push("/reports");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  const numericColumns = def.columns.map((c) => fieldOf.get(c.field)).filter((f): f is DataField => !!f && (f.type === "money" || f.type === "number"));

  return (
    <>
      <PageHeader
        title={id ? `Edit: ${existing.data?.name ?? ""}` : "New report"}
        description={`From ${source.label}: ${source.description}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={id && existing.data ? `/reports/${existing.data.key}` : "/reports"} className="px-4 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              Cancel
            </Link>
            {id && (
              <Button variant="secondary" onClick={remove}>
                Delete
              </Button>
            )}
            {!id && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (def.columns.length && !(await confirm({ title: "Choose other data?", message: "The columns and filters chosen so far are cleared.", confirmLabel: "Choose other data" }))) return;
                  setDef(EMPTY);
                }}
              >
                Other data
              </Button>
            )}
            <Button onClick={save} disabled={name.trim().length < 2 || !def.columns.length}>
              Save report
            </Button>
          </div>
        }
      />
      {saveError && (
        <div className="mb-4">
          <FormAlert>{saveError}</FormAlert>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Name and sharing */}
          <Card>
            <h3 className="font-black text-primary mb-4">1 · Name and who can run it</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Report name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. OBC students of class 8" />
              <Input label="Section in the library" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="My reports" />
            </div>
            <div className="mt-4">
              <Input label="What it shows (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1 mb-2">Also for these roles (people who make reports always see it)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(roles.data ?? []).map((r) => (
                  <Checkbox key={r.id} label={r.name} checked={roleIds.includes(r.id)} onChange={(v) => setRoleIds(v ? [...roleIds, r.id] : roleIds.filter((x) => x !== r.id))} />
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/70 mt-2">They still see only the data their own permissions allow (a class teacher, their sections; private details only if they may see them).</p>
            </div>
          </Card>

          {/* Inputs of the source */}
          {source.params.length > 0 && (
            <Card>
              <h3 className="font-black text-primary mb-1">2 · {source.params.length === 1 ? "Session / period" : "Session and period"}</h3>
              <p className="text-xs text-on-surface-variant mb-4">These are asked every time the report is run; this is what they start with.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {source.params.map((p) => (
                  <ParamInput key={p.key} p={p} year={def.params.year ?? "current"} value={def.params[p.key] ?? ""} onChange={(v) => set({ params: { ...def.params, [p.key]: v } })} />
                ))}
              </div>
            </Card>
          )}

          {/* Columns */}
          <Card>
            <h3 className="font-black text-primary mb-1">3 · Columns</h3>
            <p className="text-xs text-on-surface-variant mb-4">Tick what to show. Change the order and headings on the right.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input placeholder="Find a field" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
                <div className="mt-3 max-h-[420px] overflow-y-auto pr-1 space-y-4">
                  {Array.from(groups.entries()).map(([g, fields]) => (
                    <div key={g}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1.5">{g}</p>
                      <div className="space-y-1.5">
                        {fields.map((f) => (
                          <Checkbox key={f.key} checked={chosen.has(f.key)} onChange={() => toggleColumn(f)} label={<span>{f.label}{f.sensitive && <span className="ml-2 text-[10px] font-bold uppercase text-amber-700">private</span>}</span>} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                {!def.columns.length && <p className="text-sm text-on-surface-variant/70 mt-2">No columns yet: tick some on the left.</p>}
                <div className="space-y-2">
                  {def.columns.map((c, i) => {
                    const f = fieldOf.get(c.field);
                    if (!f) return null;
                    return (
                      <div key={c.field} className="flex items-center gap-2 rounded-xl bg-surface-container-low px-2 py-1.5">
                        <MoveButtons label={f.label} position={i + 1} first={i === 0} last={i === def.columns.length - 1} onMove={(d) => move(i, d)} />
                        <input
                          value={c.label ?? ""}
                          placeholder={f.label}
                          onChange={(e) => set({ columns: def.columns.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } : x)) })}
                          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-primary outline-none placeholder:text-on-surface-variant/70"
                          aria-label={`Heading for ${f.label}`}
                        />
                        <button type="button" aria-label={`Remove ${f.label}`} onClick={() => toggleColumn(f)} className="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {numericColumns.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1 mb-2">Add up (subtotals and grand total)</p>
                    <div className="space-y-1.5">
                      {numericColumns.map((f) => (
                        <Checkbox key={f.key} label={f.label} checked={def.totals.includes(f.key)} onChange={(v) => set({ totals: v ? [...def.totals, f.key] : def.totals.filter((t) => t !== f.key) })} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card>
            <h3 className="font-black text-primary mb-1">4 · Filters</h3>
            <p className="text-xs text-on-surface-variant mb-4">Only rows that match every filter are shown. Tick “Ask when running” to choose the value each time (e.g. the class).</p>
            <div className="space-y-3">
              {def.filters.map((x, i) => {
                const f = fieldOf.get(x.field) ?? filterable[0];
                const needs = !NO_VALUE.includes(x.op);
                const input = (v: string, onChange: (v: string) => void, placeholder?: string) => (
                  <Input type={f.type === "date" ? "date" : f.type === "number" || f.type === "money" ? "number" : "text"} value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
                );
                return (
                  <div key={i} className="rounded-xl border border-outline-variant/20 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-2 items-end">
                      <Select value={x.field} onChange={(v) => setFilter(i, { field: v, op: fieldOf.get(v)!.ops[0], value: "", value2: "" })} options={filterable.map((ff) => ({ value: ff.key, label: ff.label }))} />
                      <Select value={x.op} onChange={(v) => setFilter(i, { op: v as FilterOp })} options={f.ops.map((op) => ({ value: op, label: opLabel(op, f.type) }))} />
                      <button type="button" aria-label="Remove this filter" onClick={() => set({ filters: def.filters.filter((_, j) => j !== i) })} className="h-11 w-11 rounded-xl text-on-surface-variant hover:bg-surface-container-high">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    {needs && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 items-center">
                        {x.op === "between" ? (
                          <div className="grid grid-cols-2 gap-2 md:col-span-2">
                            {input(x.value, (v) => setFilter(i, { value: v }), "from")}
                            {input(x.value2, (v) => setFilter(i, { value2: v }), "to")}
                          </div>
                        ) : (
                          input(x.value, (v) => setFilter(i, { value: v }), x.op === "in" ? "e.g. Class 8, Class 9" : x.ask ? "the starting value (optional)" : "value")
                        )}
                        <Checkbox label="Ask when running" checked={x.ask} onChange={(v) => setFilter(i, { ask: v })} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={!filterable.length || def.filters.length >= 20}
              onClick={() => set({ filters: [...def.filters, { field: filterable[0].key, op: filterable[0].ops[0], value: "", value2: "", ask: false }] })}
            >
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Add a filter
            </Button>
          </Card>

          {/* Sorting, grouping, page */}
          <Card>
            <h3 className="font-black text-primary mb-4">5 · Sorting, grouping and page</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Group by (headings and subtotals)"
                value={def.groupBy ?? ""}
                onChange={(v) => set({ groupBy: v || null })}
                options={[{ value: "", label: "No grouping" }, ...filterable.filter((f) => f.type !== "boolean").map((f) => ({ value: f.key, label: f.label }))]}
              />
              <Select label="Page" value={def.orientation} onChange={(v) => set({ orientation: v as Definition["orientation"] })} options={[{ value: "portrait", label: "Portrait (A4 upright)" }, { value: "landscape", label: "Landscape (A4 sideways, for many columns)" }]} />
            </div>
            <div className="mt-4 space-y-2">
              {def.sort.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <Select label={i === 0 ? "Sort by" : "then by"} value={s.field} onChange={(v) => set({ sort: def.sort.map((x, j) => (j === i ? { ...x, field: v } : x)) })} options={filterable.map((f) => ({ value: f.key, label: f.label }))} />
                  <Select value={s.dir} onChange={(v) => set({ sort: def.sort.map((x, j) => (j === i ? { ...x, dir: v as "asc" | "desc" } : x)) })} options={[{ value: "asc", label: "A → Z / low → high" }, { value: "desc", label: "Z → A / high → low" }]} />
                  <button type="button" aria-label="Remove this sort" onClick={() => set({ sort: def.sort.filter((_, j) => j !== i) })} className="h-11 w-11 rounded-xl text-on-surface-variant hover:bg-surface-container-high">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
              {def.sort.length < 3 && (
                <Button variant="secondary" disabled={!filterable.length} onClick={() => set({ sort: [...def.sort, { field: filterable[0].key, dir: "asc" }] })}>
                  <span className="material-symbols-outlined text-lg align-middle mr-1">sort</span>
                  {def.sort.length ? "Then sort by…" : "Sort by…"}
                </Button>
              )}
              {!def.sort.length && <p className="text-xs text-on-surface-variant/70">Without sorting, rows come in the data’s own order (class, roll, name for students).</p>}
            </div>
          </Card>
        </div>

        {/* Preview */}
        <Card padding="none" className="overflow-hidden xl:sticky xl:top-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-outline-variant/20">
            <div>
              <h3 className="font-black text-primary">Preview</h3>
              {preview && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {preview.subtitle && `${preview.subtitle} · `}
                  {preview.count.toLocaleString("en-IN")} {preview.count === 1 ? "row" : "rows"}
                  {preview.truncated ? " (first 100 shown)" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {previewing && <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
              {id && existing.data && (
                <button
                  type="button"
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70"
                  onClick={async () => {
                    try {
                      const f = await builderApi.generatedDesign(existing.data!.key);
                      saveBlob(f.blob, f.filename);
                    } catch (err) {
                      showToast(errorMessage(err), "error");
                    }
                  }}
                >
                  Make Jasper design
                </button>
              )}
            </div>
          </div>
          {preview && preview.asks.length > 0 && (
            <div className="px-5 py-3 border-b border-outline-variant/20 text-xs text-on-surface-variant">
              Asked when running: <span className="font-semibold text-primary">{preview.asks.map((a) => a.label).join(", ")}</span>
            </div>
          )}
          {previewError && (
            <div className="p-5">
              <FormAlert>{previewError}</FormAlert>
            </div>
          )}
          {!def.columns.length ? (
            <p className="px-5 py-12 text-center text-sm text-on-surface-variant/70">Choose columns to see the report.</p>
          ) : preview ? (
            <div className="max-h-[75vh] overflow-y-auto">
              <ReportTable run={preview} />
            </div>
          ) : (
            !previewError && <PageLoader label="Making the preview…" />
          )}
        </Card>
      </div>
    </>
  );
}
