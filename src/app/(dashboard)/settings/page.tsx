"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { settingsApi, SettingItem, SettingValue } from "@/lib/api/settings";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { PageLoader } from "@/components/ui/PageLoader";
import { cn } from "@/lib/utils";

/** An icon per area of settings (others get a general one). */
const ICONS: Record<string, string> = {
  Attendance: "how_to_reg",
  Leave: "beach_access",
  Alerts: "notifications_active",
  Exams: "grading",
  "Notices & Events": "campaign",
  Fees: "payments",
  Payment: "account_balance",
  Payments: "account_balance",
  Students: "school",
  Staff: "badge",
  Admissions: "person_add",
  Timetable: "calendar_view_week",
  Passwords: "password",
  Security: "shield_lock",
  Login: "login",
  Accounts: "manage_accounts",
  "Uploads & exports": "upload_file",
  Audit: "history",
  Reports: "summarize",
  Email: "mail",
};
const iconOf = (group: string) => ICONS[group] ?? "tune";

/** A pending edit: a new value, or null = back to default. */
type Pending = Record<string, SettingValue | null>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const display = (s: SettingItem, v: SettingValue) => {
  if (s.type === "boolean") return v ? "On" : "Off";
  if (s.type === "select") return s.options?.find((o) => o.value === v)?.label ?? String(v);
  if (s.type === "multiselect") return (v as string[]).map((x) => s.options?.find((o) => o.value === x)?.label ?? x).join(", ");
  return String(v);
};

function SettingControl({ s, value, onChange, disabled, error }: { s: SettingItem; value: SettingValue; onChange: (v: SettingValue) => void; disabled: boolean; error?: string }) {
  switch (s.type) {
    case "boolean":
      return (
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={value as boolean} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
          <span className="w-11 h-6 rounded-full bg-surface-container-highest peer-checked:bg-primary relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
          <span className="text-sm font-bold text-primary w-8">{value ? "On" : "Off"}</span>
        </label>
      );
    case "number":
      return (
        <div className="w-40">
          <Input
            type="number"
            inputMode="numeric"
            min={s.min ?? undefined}
            max={s.max ?? undefined}
            value={String(value)}
            error={error}
            onChange={(e) => onChange(e.target.value === "" ? ("" as unknown as number) : Number(e.target.value))}
            disabled={disabled}
          />
          {(s.min != null || s.max != null) && (
            <p className="text-[10px] text-on-surface-variant/60 mt-1 ml-1">
              {s.min ?? "…"} to {s.max ?? "…"}
            </p>
          )}
        </div>
      );
    case "text":
      return (
        <div className="w-full sm:w-80">
          <Input value={String(value ?? "")} error={error} onChange={(e) => onChange(e.target.value)} disabled={disabled} maxLength={200} />
        </div>
      );
    case "select":
      return (
        <div className="w-64">
          <Select value={value as string} onChange={onChange} options={s.options ?? []} disabled={disabled} error={error} />
        </div>
      );
    case "multiselect":
      return (
        <div className="flex flex-col gap-2">
          {(s.options ?? []).map((o) => {
            const list = value as string[];
            return (
              <Checkbox
                key={o.value}
                label={o.label}
                checked={list.includes(o.value)}
                disabled={disabled}
                onChange={(on) => onChange(on ? [...list, o.value] : list.filter((x) => x !== o.value))}
              />
            );
          })}
          {error && <span className="text-[10px] font-bold text-error uppercase tracking-wider">{error}</span>}
        </div>
      );
    default:
      return (
        <div className="w-full sm:w-80">
          <Input value={String(value)} onChange={(e) => onChange(e.target.value)} disabled={disabled} error={error} />
        </div>
      );
  }
}

function SettingsScreen() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: settingsApi.list });
  const [pending, setPending] = useState<Pending>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const canEdit = can("settings.update");

  // Which area is open: none = the cards. Kept in the address (#Attendance) so a reload stays there.
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    if (fromHash) setOpen(fromHash);
  }, []);
  const go = (group: string | null) => {
    setOpen(group);
    setSearch("");
    window.history.replaceState(null, "", group ? `#${encodeURIComponent(group)}` : window.location.pathname);
    window.scrollTo({ top: 0 });
  };

  const items = useMemo(() => new Map((settings.data ?? []).flatMap((g) => g.settings).map((s) => [s.key, s])), [settings.data]);
  // Drop pending edits that match the saved value again.
  const changes = useMemo(() => {
    const out: Pending = {};
    for (const [k, v] of Object.entries(pending)) {
      const s = items.get(k);
      if (!s) continue;
      if (v === null ? !s.isDefault : !same(v, s.value)) out[k] = v;
    }
    return out;
  }, [pending, items]);
  const count = Object.keys(changes).length;
  const groups = useMemo(() => settings.data ?? [], [settings.data]);
  // The open area, or every setting matching the search (in any area).
  const shown = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length)
      return groups
        .map((g) => ({ ...g, settings: g.settings.filter((x) => words.every((w) => `${g.group} ${x.label} ${x.help ?? ""}`.toLowerCase().includes(w))) }))
        .filter((g) => g.settings.length);
    return groups.filter((g) => g.group === open);
  }, [groups, open, search]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (count) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [count]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!count) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const fresh = await settingsApi.save(changes);
      queryClient.setQueryData(["settings"], fresh);
      setPending({});
      showToast(`${count} setting${count === 1 ? "" : "s"} saved`, "success");
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  if (settings.isLoading) return <PageLoader />;
  if (settings.isError) return <FormAlert>{errorMessage(settings.error)}</FormAlert>;

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="System Settings"
        description="How the system behaves for your school. Every change is recorded with the old and new value."
        actions={
          canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              {count > 0 && <span className="text-sm font-bold text-primary">{count} unsaved</span>}
              <Button type="button" variant="secondary" disabled={!count || busy} onClick={() => { setPending({}); setFieldErrors({}); setError(null); }}>
                Discard
              </Button>
              <div className="w-36">
                <SubmitButton busy={busy} busyLabel="Saving…" disabled={!count} className="gradient-primary py-2.5">
                  Save
                </SubmitButton>
              </div>
            </div>
          )
        }
      />

      <div className="space-y-6 max-w-5xl">
        {error && <FormAlert>{error}</FormAlert>}
        {!canEdit && <FormAlert tone="info">You can see the settings. Changing them needs the “Change system settings” permission.</FormAlert>}

        <div className="flex flex-wrap items-center gap-3">
          {open && !search && (
            <button type="button" onClick={() => go(null)} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              All settings
            </button>
          )}
          <div className="w-full sm:w-80 sm:ml-auto">
            <Input placeholder="Find a setting" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
          </div>
        </div>

        {!open && !search ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g) => {
              const changed = g.settings.filter((x) => !x.isDefault).length;
              const unsaved = g.settings.filter((x) => x.key in changes).length;
              return (
                <button key={g.group} type="button" onClick={() => go(g.group)} className="text-left group">
                  <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined shrink-0 rounded-2xl bg-primary/10 p-3 text-primary">{iconOf(g.group)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-extrabold text-on-surface">{g.group}</p>
                        <p className="text-xs text-on-surface-variant/70 mt-0.5">
                          {g.settings.length} setting{g.settings.length === 1 ? "" : "s"}
                          {changed > 0 && ` · ${changed} changed from the default`}
                        </p>
                        <p className="text-xs text-on-surface-variant/60 mt-2 line-clamp-2">{g.settings.slice(0, 3).map((x) => x.label).join(" · ")}</p>
                        {unsaved > 0 && (
                          <div className="mt-2">
                            <Pill tone="warning">{unsaved} unsaved</Pill>
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
        ) : (
          shown.map((g) => (
            <Card key={g.group} className="space-y-1">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">{iconOf(g.group)}</span>
                {g.group}
              </h2>
              <ul className="divide-y divide-outline-variant/15">
                {g.settings.map((s) => {
                  const edited = s.key in pending;
                  const value = edited ? (pending[s.key] === null ? s.default : (pending[s.key] as SettingValue)) : s.value;
                  const showsDefault = edited ? pending[s.key] === null || same(pending[s.key], s.default) : s.isDefault;
                  return (
                    <li key={s.key} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 py-5">
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {s.label} {!showsDefault && <Pill tone="primary">Changed</Pill>} {s.key in changes && <Pill tone="warning">Unsaved</Pill>}
                        </p>
                        {s.help && <p className="text-xs text-on-surface-variant/70 mt-1 max-w-xl">{s.help}</p>}
                        {!showsDefault && (
                          <p className="text-xs text-on-surface-variant/60 mt-1">
                            Default: {display(s, s.default)}
                            {canEdit && (
                              <>
                                {" · "}
                                <button type="button" className="font-bold text-primary hover:underline" onClick={() => setPending((p) => ({ ...p, [s.key]: null }))}>
                                  Reset to default
                                </button>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      <SettingControl s={s} value={value} disabled={!canEdit || busy} error={fieldErrors[s.key]} onChange={(v) => setPending((p) => ({ ...p, [s.key]: v }))} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))
        )}
        {(open || search) && !shown.length && <Card className="text-center text-on-surface-variant/70 py-12">{search ? "No setting matches that." : "This area has no settings."}</Card>}
      </div>

      {/* Unsaved changes: a bar at the bottom of the screen, wherever you are on the page. */}
      {canEdit && count > 0 && (
        <div className={cn("fixed bottom-4 left-4 right-4 lg:left-[18rem] z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3 text-white shadow-2xl")}>
          <span className="text-sm font-bold">
            {count} unsaved change{count === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-3">
            <button type="button" disabled={busy} className="text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white" onClick={() => { setPending({}); setFieldErrors({}); setError(null); }}>
              Discard
            </button>
            <button type="submit" disabled={busy} className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-primary hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default function SettingsPage() {
  return (
    <RequirePermission permission="settings.view">
      <SettingsScreen />
    </RequirePermission>
  );
}
