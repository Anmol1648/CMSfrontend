"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { OneTimePasswordDialog } from "@/components/admin/OneTimePasswordDialog";
import { KIND_LABELS, formatDateTime } from "@/components/admin/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AdminUser, rolesApi, usersApi, UserListQuery } from "@/lib/api/admin";
import type { UserKind } from "@/lib/api/auth";
import { ApiError, downloadFile, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

const PAGE_SIZE = 25;

function NewUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: { user: AdminUser; temporaryPassword: string; emailed: boolean }) => void }) {
  const { can, access } = useAuth();
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: open && can("role.view") });
  const [kind, setKind] = useState<UserKind>("staff");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setKind("staff");
      setDisplayName("");
      setUsername("");
      setEmail("");
      setMobile("");
      setRoleIds([]);
      setError(null);
      setFieldErrors({});
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) return setFieldErrors({ displayName: "Enter the person's name" });
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      onCreated(await usersApi.create({ kind, displayName, username: username || undefined, email: email || undefined, mobile: mobile || undefined, roleIds }));
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  const assignable = (roles.data ?? []).filter((r) => !r.isSystem || access?.isSuperAdmin);

  return (
    <Modal isOpen={open} onClose={onClose} title="New user" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Name" value={displayName} error={fieldErrors.displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus disabled={busy} />
          <Select label="Type" value={kind} onChange={(v) => setKind(v as UserKind)} options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))} disabled={busy} />
          <Input label="Email (optional)" type="email" value={email} error={fieldErrors.email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          <Input label="Mobile (optional)" inputMode="tel" value={mobile} error={fieldErrors.mobile} onChange={(e) => setMobile(e.target.value)} disabled={busy} />
          <Input label="Username (optional)" placeholder="Made from the name if empty" value={username} error={fieldErrors.username} onChange={(e) => setUsername(e.target.value)} disabled={busy} />
        </div>

        {can("role.view") && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Roles</p>
            {roleIds.length === 0 && <p className="text-xs text-on-surface-variant/70">None ticked: the default role for this type of user is given.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignable.map((r) => (
                <Checkbox
                  key={r.id}
                  checked={roleIds.includes(r.id)}
                  onChange={(on) => setRoleIds((ids) => (on ? [...ids, r.id] : ids.filter((x) => x !== r.id)))}
                  label={r.name}
                  hint={r.description ?? undefined}
                  disabled={busy}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <div className="w-44">
            <SubmitButton busy={busy} busyLabel="Creating…" className="gradient-primary py-2.5">
              Create user
            </SubmitButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function UsersList() {
  const { can } = useAuth();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState(params.get("role") ?? "");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ user: AdminUser; temporaryPassword: string; emailed: boolean } | null>(null);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, kind, status, role]);

  const query: UserListQuery = { page, pageSize: PAGE_SIZE, search: debounced, kind, status, role, sort: "displayName" };
  const users = useQuery({ queryKey: ["users", query], queryFn: () => usersApi.list(query), placeholderData: keepPreviousData });
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: can("role.view") });
  const totalPages = users.data ? Math.max(1, Math.ceil(users.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in: their roles, status and sign-in details."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await downloadFile("/users/export", { sort: "displayName", ...(debounced.trim() ? { search: debounced.trim() } : {}), ...(kind ? { "filter[kind]": kind } : {}), ...(status ? { "filter[status]": status } : {}), ...(role ? { "filter[role]": role } : {}) }, "users.xlsx");
                } catch (err) {
                  showToast(errorMessage(err), "error");
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? "Exporting…" : "Export"}
            </Button>
            {can("user.create") && (
              <Link href="/users/import" className="px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all">
                Import
              </Link>
            )}
            {can("user.create") && <Button onClick={() => setCreating(true)}>New user</Button>}
          </div>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-4 p-6 border-b border-outline-variant/20">
          <Input placeholder="Search name, username, email or mobile" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
          <Select value={kind} onChange={setKind} options={[{ value: "", label: "All types" }, ...Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))]} />
          <Select value={status} onChange={setStatus} options={[{ value: "", label: "Any status" }, { value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }]} />
          <Select value={role} onChange={setRole} options={[{ value: "", label: "Any role" }, ...(roles.data ?? []).map((r) => ({ value: r.slug, label: r.name }))]} />
        </div>

        {users.isError && (
          <div className="p-6">
            <FormAlert>{errorMessage(users.error)}</FormAlert>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-6 py-3 font-bold">Name</th>
              <th className="px-6 py-3 font-bold">Username</th>
              <th className="px-6 py-3 font-bold">Type</th>
              <th className="px-6 py-3 font-bold">Roles</th>
              <th className="px-6 py-3 font-bold">Last sign-in</th>
              <th className="px-6 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.items.map((u) => (
              <tr key={u.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/60">
                <td className="px-6 py-4">
                  <Link href={`/users/${u.id}`} className="font-bold text-primary hover:underline">
                    {u.displayName}
                  </Link>
                  <p className="text-xs text-on-surface-variant/60">{u.email ?? u.mobile ?? ""}</p>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{u.username}</td>
                <td className="px-6 py-4">{KIND_LABELS[u.kind]}</td>
                <td className="px-6 py-4">{u.roles.map((r) => r.name).join(", ") || "—"}</td>
                <td className="px-6 py-4 text-on-surface-variant">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                <td className="px-6 py-4 space-x-1">
                  {u.status === "disabled" ? <Pill tone="danger">Disabled</Pill> : <Pill tone="success">Active</Pill>}
                  {u.locked && <Pill tone="warning">Locked</Pill>}
                  {u.mustChangePassword && u.status === "active" && <Pill>New password due</Pill>}
                </td>
              </tr>
            ))}
            {users.data && users.data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant/70">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">{users.data ? `${users.data.total} user${users.data.total === 1 ? "" : "s"}` : users.isLoading ? "Loading…" : ""}</span>
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
        </div>
      </Card>

      <NewUserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(r) => {
          setCreating(false);
          setCreated(r);
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["roles"] });
        }}
      />
      {created && (
        <OneTimePasswordDialog
          open
          onClose={() => setCreated(null)}
          title="User created"
          name={created.user.displayName}
          username={created.user.username}
          password={created.temporaryPassword}
          emailed={created.emailed}
        />
      )}
    </>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission permission="user.view">
      <Suspense>
        <UsersList />
      </Suspense>
    </RequirePermission>
  );
}
