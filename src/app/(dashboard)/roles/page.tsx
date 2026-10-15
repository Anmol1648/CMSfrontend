"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { rolesApi } from "@/lib/api/admin";
import { ApiError, errorMessage } from "@/lib/api/client";

function NewRoleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: open });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setFieldErrors({ name: "Give the role a name" });
    setBusy(true);
    setError(null);
    try {
      const role = await rolesApi.create({ name, description: description || undefined, copyFromRoleId: copyFrom || undefined });
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      router.push(`/roles/${role.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="New role" width="max-w-lg">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <FormAlert>{error}</FormAlert>}
        <Input label="Name" placeholder="e.g. Librarian" value={name} error={fieldErrors.name} onChange={(e) => setName(e.target.value)} autoFocus disabled={busy} />
        <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
        <Select
          label="Start with the permissions of"
          value={copyFrom}
          onChange={setCopyFrom}
          options={[{ value: "", label: "Nothing (empty role)" }, ...(roles.data ?? []).filter((r) => !r.isSystem).map((r) => ({ value: r.id, label: r.name }))]}
          disabled={busy}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <div className="w-40">
            <SubmitButton busy={busy} className="gradient-primary py-2.5">
              Create
            </SubmitButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RolesList() {
  const { can } = useAuth();
  const router = useRouter();
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="A role is a set of permissions. Click a role to choose what it may do; give people roles on the Users screen."
        actions={can("role.manage") && <Button onClick={() => setCreating(true)}>New role</Button>}
      />
      {roles.isError && <FormAlert>{errorMessage(roles.error)}</FormAlert>}
      <Card padding="none" className="overflow-hidden max-w-5xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-6 py-3 font-bold">Role</th>
              <th className="px-6 py-3 font-bold">Permissions</th>
              <th className="px-6 py-3 font-bold">People</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {roles.data?.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/roles/${r.id}`)}
                className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 cursor-pointer"
              >
                <td className="px-6 py-4">
                  <Link href={`/roles/${r.id}`} className="font-bold text-primary hover:underline">
                    {r.name}
                  </Link>
                  {r.isSystem && <span className="ml-2"><Pill tone="primary">Everything</Pill></span>}
                  {r.defaultFor && <span className="ml-2"><Pill>Default for new {r.defaultFor} logins</Pill></span>}
                  {r.description && <p className="text-xs text-on-surface-variant/70 mt-0.5">{r.description}</p>}
                </td>
                <td className="px-6 py-4">{r.permissionCount}</td>
                <td className="px-6 py-4">
                  {r.userCount > 0 ? (
                    <Link href={`/users?role=${r.slug}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                      {r.userCount}
                    </Link>
                  ) : (
                    0
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
                    {r.isSystem || !can("role.manage") ? "View" : "Permissions"}
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {roles.isLoading && <p className="p-6 text-sm text-on-surface-variant">Loading…</p>}
      </Card>
      <NewRoleDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission permission="role.view">
      <RolesList />
    </RequirePermission>
  );
}
