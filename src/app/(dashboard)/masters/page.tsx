"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RecordHistory } from "@/components/admin/RecordHistory";
import { MasterChainSelect } from "@/components/masters/MasterSelect";
import { MoveButtons, OrderHint } from "@/components/ui/MoveButtons";
import { Drop, SortableItem, SortableList, useDropOrder } from "@/components/ui/Sortable";
import type { Move } from "@/lib/order";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { MasterInfo, mastersApi, MasterValue } from "@/lib/api/masters";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";

const PAGE_SIZE = 50;

/** Filter row: one column per parent level, plus search and status (Tailwind needs whole class names). */
const FILTER_COLUMNS = ["md:grid-cols-[2fr_1fr]", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5"];

/** "Uttarakhand › Chamoli" (the country is left out: every state is in it). */
const pathOf = (v: MasterValue) => v.ancestors.filter((a) => a.master !== "country").map((a) => a.name).join(" › ");

function ValueDialog({
  info,
  value,
  startParents,
  onClose,
  onSaved,
}: {
  info: MasterInfo;
  value: MasterValue | null;
  /** For a new option: the parents chosen in the filter. */
  startParents: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const parentChain = info.chain.slice(0, -1);
  const [name, setName] = useState(value?.name ?? "");
  const [code, setCode] = useState(value?.code ?? "");
  const [parents, setParents] = useState<string[]>(value ? value.ancestors.map((a) => a.id) : startParents);
  const [extra, setExtra] = useState<Record<string, unknown>>(value?.extra ?? {});
  const [isActive, setIsActive] = useState(value?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      onSaved(await fn());
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const input = {
        name,
        ...(info.code !== "none" ? { code: code.trim() || null } : {}),
        ...(parentChain.length ? { parentId: parents[parentChain.length - 1] || null } : {}),
        ...(info.fields.length ? { extra } : {}),
        isActive,
      };
      if (value) await mastersApi.update(info.key, value.id, input);
      else await mastersApi.create(info.key, input);
      return value ? `${name.trim()} saved` : `${name.trim()} added`;
    });
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={value ? `Edit ${info.label.toLowerCase()}` : `Add ${info.label.toLowerCase()}`} width="max-w-2xl">
      <form onSubmit={save} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        {parentChain.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MasterChainSelect chain={parentChain} value={parents} onChange={setParents} error={fieldErrors.parentId} disabled={busy} />
          </div>
        )}
        <div className={cn("grid gap-4", info.code !== "none" ? "grid-cols-1 md:grid-cols-[2fr_1fr]" : "grid-cols-1")}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} maxLength={120} disabled={busy} autoFocus />
          {info.code !== "none" && (
            <Input label={info.code === "required" ? "Code" : "Code (optional)"} value={code} onChange={(e) => setCode(e.target.value)} error={fieldErrors.code} maxLength={20} disabled={busy} />
          )}
        </div>
        {info.fields.map((f) =>
          f.type === "boolean" ? (
            <Checkbox key={f.key} label={f.label} hint={f.help} checked={extra[f.key] === true} onChange={(on) => setExtra({ ...extra, [f.key]: on })} disabled={busy} />
          ) : f.type === "select" ? (
            <div key={f.key} className="space-y-1">
              <Select
                label={f.required ? f.label : `${f.label} (optional)`}
                value={extra[f.key] == null ? "" : String(extra[f.key])}
                onChange={(v) => setExtra({ ...extra, [f.key]: v })}
                options={[{ value: "", label: "Choose…" }, ...(f.options ?? [])]}
                error={fieldErrors[`extra.${f.key}`]}
                disabled={busy}
              />
              {f.help && <p className="text-xs text-on-surface-variant/60 ml-1">{f.help}</p>}
            </div>
          ) : (
            <div key={f.key} className="space-y-1">
              <Input
                label={f.required ? f.label : `${f.label} (optional)`}
                type={f.type === "number" ? "number" : "text"}
                value={extra[f.key] === undefined || extra[f.key] === null ? "" : String(extra[f.key])}
                onChange={(e) => setExtra({ ...extra, [f.key]: f.upperCase ? e.target.value.toUpperCase() : e.target.value })}
                error={fieldErrors[`extra.${f.key}`]}
                maxLength={f.max}
                placeholder={f.example}
                disabled={busy}
              />
              {f.help && <p className="text-xs text-on-surface-variant/60 ml-1">{f.help}</p>}
            </div>
          )
        )}
        <Checkbox label="Active" hint="Inactive options stay on existing records but can't be chosen any more." checked={isActive} onChange={setIsActive} disabled={busy} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {value ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-error font-semibold">Delete {value.name}?</span>
                <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => run(async () => (await mastersApi.remove(info.key, value.id), `${value.name} deleted`))}>
                  Yes, delete
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <div className="w-32">
              <SubmitButton busy={busy} busyLabel="Saving…" disabled={!name.trim()} className="py-2.5">
                {value ? "Save" : "Add"}
              </SubmitButton>
            </div>
          </div>
        </div>
      </form>
      {value && (
        <div className="mt-6 -mx-2">
          <RecordHistory entity="master_value" id={value.id} />
        </div>
      )}
    </Modal>
  );
}

function ValuesPanel({ info }: { info: MasterInfo }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const parentChain = info.chain.slice(0, -1);
  const [parents, setParents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MasterValue | "new" | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, status, parents]);

  const parent = parentChain.length ? parents[parentChain.length - 1] || undefined : undefined;
  const query = { page, pageSize: PAGE_SIZE, search: debounced, status, parent };
  const values = useQuery({ queryKey: ["master-values", info.key, query], queryFn: () => mastersApi.values(info.key, query), placeholderData: keepPreviousData });
  const totalPages = Math.max(1, Math.ceil((values.data?.total ?? 0) / PAGE_SIZE));

  // Order by hand within one parent, on the unfiltered list.
  const canMove = info.canManage && info.ordering === "manual" && (!parentChain.length || !!parent) && !debounced.trim() && !status;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["master-values", info.key] });
    await queryClient.invalidateQueries({ queryKey: ["master-options", info.key] });
    await queryClient.invalidateQueries({ queryKey: ["masters"] });
  };

  const move = async (v: MasterValue, how: Move) => {
    setMoving(v.id);
    try {
      await mastersApi.move(info.key, v.id, how);
      await refresh();
      return true;
    } catch (err) {
      showToast(errorMessage(err), "error");
      return false;
    } finally {
      setMoving(null);
    }
  };

  const order = useDropOrder(values.data?.items ?? []);
  const rows = order.rows;
  const drop = async (d: Drop) => {
    order.show(d.ids);
    if (await move(rows.find((r) => r.id === d.id)!, d.place)) showToast("Order saved", "success");
    else order.reset();
  };

  return (
    <div className="space-y-4 min-w-0">
      <Card className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-primary">{info.plural}</h2>
            <p className="text-sm text-on-surface-variant/70">
              {info.description ? `${info.description} ` : ""}
              {info.ordering === "name" ? "Shown in alphabetical order." : ""}
            </p>
            {info.ordering === "manual" && (
              <div className="pt-1">
                <OrderHint>
                  {info.canManage
                    ? "Drag ⋮⋮ (or use ↑ ↓) to set the order these options appear in forms. The number is each option's place. Clear the search and status filter to reorder."
                    : "Forms list these options in this order."}
                </OrderHint>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => mastersApi.export(info.key, { search: debounced, status, parent }).catch((err) => showToast(errorMessage(err), "error"))}>
              Export
            </Button>
            {info.canManage && (
              <Link href={`/masters/${info.key}/import`} className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Import
              </Link>
            )}
            {info.canManage && <Button onClick={() => setEditing("new")}>Add {info.label.toLowerCase()}</Button>}
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className={cn("grid grid-cols-1 gap-4 p-5 border-b border-outline-variant/20", FILTER_COLUMNS[Math.min(parentChain.length, 3)])}>
          {parentChain.length > 0 && (
            <MasterChainSelect chain={parentChain} value={parents} onChange={setParents} placeholder={(l) => `All ${l.plural.toLowerCase()}`} />
          )}
          <Input label={parentChain.length ? "Search" : undefined} placeholder={`Search ${info.plural.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
          <Select
            label={parentChain.length ? "Status" : undefined}
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={[
              { value: "", label: "Active and inactive" },
              { value: "active", label: "Active only" },
              { value: "inactive", label: "Inactive only" },
            ]}
          />
        </div>

        {values.isError && (
          <div className="p-5">
            <FormAlert>{errorMessage(values.error)}</FormAlert>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                {canMove && <th className="pl-5 py-3 w-28 font-bold">Order</th>}
                <th className="px-5 py-3 font-bold">Name</th>
                {info.code !== "none" && <th className="px-5 py-3 font-bold">Code</th>}
                {parentChain.length > 0 && <th className="px-5 py-3 font-bold">Belongs to</th>}
                {info.fields.map((f) => (
                  <th key={f.key} className="px-5 py-3 font-bold">
                    {f.label}
                  </th>
                ))}
                <th className="px-5 py-3 font-bold">Status</th>
                {info.canManage && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              <SortableList ids={rows.map((r) => r.id)} onDrop={drop} disabled={!canMove || !!moving}>
              {rows.map((v, i) => (
                <SortableItem
                  as="tr"
                  key={v.id}
                  id={v.id}
                  // The whole row opens the option (keyboard: Tab to it, Enter).
                  onClick={info.canManage ? () => setEditing(v) : undefined}
                  onKeyDown={info.canManage ? (e) => e.key === "Enter" && e.target === e.currentTarget && setEditing(v) : undefined}
                  tabIndex={info.canManage ? 0 : undefined}
                  className={cn(
                    "border-t border-outline-variant/10 hover:bg-surface-container-low/60",
                    info.canManage && "cursor-pointer focus:outline-none focus-visible:bg-surface-container-low"
                  )}
                >
                  {canMove && (
                    <td className="pl-5 py-2">
                      <MoveButtons
                        label={v.name}
                        position={(page - 1) * PAGE_SIZE + i + 1}
                        first={i === 0 && page === 1}
                        last={i === rows.length - 1 && page === totalPages}
                        disabled={!!moving}
                        onMove={(d) => move(v, d)}
                      />
                    </td>
                  )}
                  <td className="px-5 py-3 font-semibold text-on-surface">{v.name}</td>
                  {info.code !== "none" && <td className="px-5 py-3 font-mono text-xs">{v.code ?? "—"}</td>}
                  {parentChain.length > 0 && <td className="px-5 py-3 text-on-surface-variant">{pathOf(v) || "—"}</td>}
                  {info.fields.map((f) => (
                    <td key={f.key} className="px-5 py-3 font-mono text-xs">
                      {v.extra[f.key] === undefined || v.extra[f.key] === null ? "—" : f.type === "boolean" ? (v.extra[f.key] ? "Yes" : "No") : f.type === "select" ? (f.options?.find((o) => o.value === v.extra[f.key])?.label ?? String(v.extra[f.key])) : String(v.extra[f.key])}
                    </td>
                  ))}
                  <td className="px-5 py-3">{v.isActive ? <Pill tone="success">Active</Pill> : <Pill>Inactive</Pill>}</td>
                  {info.canManage && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(v);
                        }}
                        className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                        Edit
                      </button>
                    </td>
                  )}
                </SortableItem>
              ))}
              </SortableList>
              {values.data && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-on-surface-variant/70">
                    {debounced || status || parent ? "Nothing matches." : `No ${info.plural.toLowerCase()} yet.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">{values.data ? `${values.data.total} ${values.data.total === 1 ? info.label.toLowerCase() : info.plural.toLowerCase()}` : values.isLoading ? "Loading…" : ""}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-on-surface-variant/70">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {editing && (
        <ValueDialog
          info={info}
          value={editing === "new" ? null : editing}
          startParents={parents}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            setEditing(null);
            showToast(message, "success");
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/** An icon per area of lists (others get a general one). */
const ICONS: Record<string, string> = {
  academic: "school",
  admissions: "person_add",
  students: "groups",
  staff: "badge",
  fees: "payments",
  location: "location_on",
  facilities: "meeting_room",
  exams: "grading",
  alerts: "notifications_active",
  attendance: "how_to_reg",
  communication: "campaign",
  homework: "menu_book",
  questions: "quiz",
  transport: "directions_bus",
  library: "local_library",
  ptm: "forum",
  personal: "person",
  visitors: "door_front",
  complaints: "support_agent",
  discipline: "gavel",
  shared: "folder_shared",
  assets: "inventory_2",
  cocurricular: "emoji_events",
  inventory: "inventory",
  payroll: "account_balance_wallet",
  hostel: "bed",
  mess: "restaurant",
  family: "family_restroom",
  finance: "account_balance",
};
const iconOf = (group: string) => ICONS[group] ?? "list_alt";

function Masters() {
  const router = useRouter();
  const params = useSearchParams();
  const catalogue = useQuery({ queryKey: ["masters"], queryFn: mastersApi.catalogue });
  const [search, setSearch] = useState("");
  const groups = catalogue.data ?? [];
  const all = groups.flatMap((g) => g.masters.map((m) => ({ ...m, group: g })));
  // An area (?group=) or a list (?list=, also from links elsewhere: its area opens with it).
  const listKey = params.get("list");
  const group = groups.find((g) => g.key === params.get("group")) ?? all.find((m) => m.key === listKey)?.group ?? null;
  const selected = group ? (group.masters.find((m) => m.key === listKey) ?? group.masters[0]) : null;
  const go = (q: string | null) => router.replace(q ? `/masters?${q}` : "/masters", { scroll: false });
  const t = search.trim().toLowerCase();
  const found = t ? all.filter((m) => m.plural.toLowerCase().includes(t) || m.label.toLowerCase().includes(t) || m.group.label.toLowerCase().includes(t) || (m.description ?? "").toLowerCase().includes(t)) : [];

  return (
    <>
      <PageHeader title="Masters" description="The lists the forms pick from, by module: classes, places, personal details, fee heads, rooms… Open an area to see and change its lists." />
      {catalogue.isError && <FormAlert>{errorMessage(catalogue.error)}</FormAlert>}
      {catalogue.isLoading && <PageLoader />}

      {catalogue.data && !group && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="w-full sm:w-80">
              <Input placeholder="Find a list" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
            </div>
          </div>
          {t ? (
            <Card padding="none" className="overflow-hidden">
              {found.map((m) => (
                <button key={m.key} type="button" onClick={() => go(`list=${m.key}`)} className="flex w-full items-center gap-3 border-b border-outline-variant/10 px-5 py-3 text-left last:border-0 hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-primary">{iconOf(m.group.key)}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">{m.plural}</span>
                    <span className="block text-xs text-on-surface-variant/70">
                      {m.group.label}
                      {m.description ? ` · ${m.description}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-on-surface-variant/60">{m.total}</span>
                </button>
              ))}
              {!found.length && <p className="px-5 py-12 text-center text-sm text-on-surface-variant/70">No list matches that.</p>}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => {
                const values = g.masters.reduce((a, m) => a + m.total, 0);
                const empty = g.masters.filter((m) => !m.total).length;
                return (
                  <button key={g.key} type="button" onClick={() => go(`group=${g.key}`)} className="group text-left">
                    <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary">
                      <div className="flex items-start gap-4">
                        <span className="material-symbols-outlined shrink-0 rounded-2xl bg-primary/10 p-3 text-primary">{iconOf(g.key)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-extrabold text-on-surface">{g.label}</p>
                          <p className="mt-0.5 text-xs text-on-surface-variant/70">
                            {g.masters.length} list{g.masters.length === 1 ? "" : "s"} · {values} option{values === 1 ? "" : "s"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-xs text-on-surface-variant/60">{g.masters.slice(0, 4).map((m) => m.plural).join(" · ")}</p>
                          {empty > 0 && (
                            <div className="mt-2">
                              <Pill tone="warning">{empty} empty</Pill>
                            </div>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary">chevron_right</span>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {group && (
        <div className="space-y-4">
          <button type="button" onClick={() => go(null)} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            All masters
          </button>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_1fr]">
            <Card padding="none" className="overflow-hidden">
              <p className="flex items-center gap-2 px-5 pb-2 pt-4 text-sm font-bold text-primary">
                <span className="material-symbols-outlined text-lg">{iconOf(group.key)}</span>
                {group.label}
              </p>
              <ul className="pb-2">
                {group.masters.map((m) => (
                  <li key={m.key}>
                    <button
                      type="button"
                      onClick={() => go(`group=${group.key}&list=${m.key}`)}
                      className={cn("flex w-full items-center justify-between gap-2 px-5 py-2.5 text-left text-sm hover:bg-surface-container-low", m.key === selected?.key ? "bg-surface-container-high font-bold text-primary" : "text-on-surface")}
                    >
                      <span>{m.plural}</span>
                      <span className="text-xs font-medium text-on-surface-variant/60">{m.total}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            {/* key: a fresh panel (filters, page) for each list */}
            {selected && <ValuesPanel key={selected.key} info={selected} />}
          </div>
        </div>
      )}
    </>
  );
}

export default function MastersPage() {
  return (
    <RequirePermission permission="masters.view">
      <Suspense>
        <Masters />
      </Suspense>
    </RequirePermission>
  );
}
