"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { SCOPE_LABELS } from "@/components/admin/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DataScope, rolesApi } from "@/lib/api/admin";
import { errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

type Grants = Record<string, DataScope>;

function RoleDetail({ id }: { id: string }) {
  const { can, reloadAccess } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useQuery({ queryKey: ["role", id], queryFn: () => rolesApi.get(id) });
  const catalogue = useQuery({ queryKey: ["permission-catalogue"], queryFn: rolesApi.catalogue, staleTime: Infinity });

  const original = useMemo<Grants>(() => Object.fromEntries((role.data?.permissions ?? []).map((p) => [p.key, p.scope])), [role.data]);
  const [grants, setGrants] = useState<Grants>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (role.data) {
      setGrants(original);
      setName(role.data.name);
      setDescription(role.data.description ?? "");
    }
  }, [role.data, original]);

  if (role.isLoading || catalogue.isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (role.isError || !role.data) return <FormAlert>{errorMessage(role.error)}</FormAlert>;
  const r = role.data;
  const editable = can("role.manage") && !r.isSystem;

  const grantsChanged = JSON.stringify(Object.entries(grants).sort()) !== JSON.stringify(Object.entries(original).sort());
  const infoChanged = name.trim() !== r.name || (description.trim() || null) !== (r.description ?? null);

  const toggle = (key: string, on: boolean, scopes: DataScope[]) =>
    setGrants((g) => {
      const next = { ...g };
      if (on) next[key] = scopes[0];
      else delete next[key];
      return next;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (infoChanged) await rolesApi.update(id, { name, description: description.trim() || null });
      if (grantsChanged) await rolesApi.setPermissions(id, Object.entries(grants).map(([key, scope]) => ({ key, scope })));
      await queryClient.invalidateQueries({ queryKey: ["role", id] });
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await reloadAccess();
      showToast("Role saved", "success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await rolesApi.remove(id);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      showToast("Role deleted", "success");
      router.replace("/roles");
    } catch (err) {
      setError(errorMessage(err));
      setConfirmDelete(false);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={r.name}
        description={r.isSystem ? "Has every permission in the system, now and in future modules. It can't be changed." : `${r.userCount} ${r.userCount === 1 ? "person has" : "people have"} this role.`}
        actions={
          <div className="flex items-center gap-4">
            <Link href="/roles" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              All roles
            </Link>
            {editable && (
              <>
                <Button type="button" variant="secondary" disabled={busy || (!grantsChanged && !infoChanged)} onClick={() => { setGrants(original); setName(r.name); setDescription(r.description ?? ""); }}>
                  Discard changes
                </Button>
                <div className="w-36">
                  <SubmitButton busy={busy} busyLabel="Saving…" disabled={!grantsChanged && !infoChanged} className="gradient-primary py-2.5">
                    Save
                  </SubmitButton>
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="space-y-6 max-w-5xl">
        {error && <FormAlert>{error}</FormAlert>}
        {!can("role.manage") && <FormAlert tone="info">You can see this role. Changing roles needs the “Create, edit and delete roles” permission.</FormAlert>}

        {editable && (
          <Card className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
              <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
            </div>
          </Card>
        )}

        {catalogue.data?.map((group) => (
          <Card key={group.module} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">{group.label}</h2>
              {editable && (
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-70"
                  onClick={() => {
                    const allOn = group.permissions.every((p) => grants[p.key]);
                    setGrants((g) => {
                      const next = { ...g };
                      for (const p of group.permissions) {
                        if (allOn) delete next[p.key];
                        else next[p.key] = next[p.key] ?? p.scopes[0];
                      }
                      return next;
                    });
                  }}
                >
                  {group.permissions.every((p) => grants[p.key]) ? "Untick all" : "Tick all"}
                </button>
              )}
            </div>
            <ul className="divide-y divide-outline-variant/15">
              {group.permissions.map((p) => {
                const scope = grants[p.key];
                return (
                  <li key={p.key} className="flex items-center justify-between gap-6 py-3">
                    <Checkbox
                      checked={!!scope}
                      onChange={(on) => toggle(p.key, on, p.scopes)}
                      disabled={!editable || busy}
                      label={
                        <>
                          {p.label} {p.sensitive && <Pill tone="warning">Sensitive</Pill>}
                        </>
                      }
                      hint={p.description ?? undefined}
                    />
                    {scope && p.scopes.length > 1 && (
                      <div className="w-52 shrink-0">
                        <Select
                          value={scope}
                          onChange={(v) => setGrants((g) => ({ ...g, [p.key]: v as DataScope }))}
                          options={p.scopes.map((s) => ({ value: s, label: SCOPE_LABELS[s] }))}
                          disabled={!editable || busy}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}

        {editable && (
          <Card className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-error">Delete role</h2>
              <p className="text-sm text-on-surface-variant/70">Only possible when nobody has it.</p>
            </div>
            <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </Card>
        )}
      </div>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${r.name}?`}>
        <p className="text-sm text-on-surface-variant">The role and its permissions are removed. This can&apos;t be undone.</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="bg-error text-white" onClick={remove} disabled={busy}>
            Delete role
          </Button>
        </div>
      </Modal>
    </form>
  );
}

export default function RolePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission permission="role.view">
      <RoleDetail id={id} />
    </RequirePermission>
  );
}
