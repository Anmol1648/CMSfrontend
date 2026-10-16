"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, Detail, FormAlert, Pill, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { OneTimePasswordDialog } from "@/components/admin/OneTimePasswordDialog";
import { KIND_LABELS, formatDateTime } from "@/components/admin/labels";
import { RecordHistory } from "@/components/admin/RecordHistory";
import { PhotoEditor } from "@/components/account/UserPhoto";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AdminUser, rolesApi, usersApi } from "@/lib/api/admin";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

type Confirm = { title: string; body: string; action: string; danger?: boolean; run: () => Promise<void> };

function UserDetail({ id }: { id: string }) {
  const { can, access, me, reloadAccess, reloadMe } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const user = useQuery({ queryKey: ["user", id], queryFn: () => usersApi.get(id) });
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: can("role.view") });

  const [form, setForm] = useState({ displayName: "", email: "", mobile: "" });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  useEffect(() => {
    if (user.data) {
      setForm({ displayName: user.data.displayName, email: user.data.email ?? "", mobile: user.data.mobile ?? "" });
      setRoleIds(user.data.roles.map((r) => r.id));
    }
  }, [user.data]);

  if (user.isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (user.isError || !user.data) return <FormAlert>{errorMessage(user.error)}</FormAlert>;
  const u = user.data;

  const isMe = me?.user.id === u.id;
  // Only a Super Admin may change a Super Admin's account (the server enforces this too).
  const protectedTarget = u.isSuperAdmin && !access?.isSuperAdmin;
  const canEdit = can("user.update") && !protectedTarget;
  const canReset = can("user.reset_password") && !protectedTarget;

  const afterPhoto = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user", id] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    if (isMe) await reloadMe();
  };

  const refresh = async (updated?: AdminUser) => {
    if (updated) queryClient.setQueryData(["user", id], updated);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await queryClient.invalidateQueries({ queryKey: ["roles"] });
    if (isMe) await reloadAccess();
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const original = { displayName: u.displayName, email: u.email ?? "", mobile: u.mobile ?? "" };
  const detailsChanged = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== original[k]);
  const rolesChanged = [...roleIds].sort().join() !== u.roles.map((r) => r.id).sort().join();
  const assignable = (roles.data ?? []).filter((r) => !r.isSystem || access?.isSuperAdmin);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    act(async () => {
      const changes: Record<string, unknown> = {};
      for (const k of Object.keys(form) as (keyof typeof form)[]) if (form[k] !== original[k]) changes[k] = form[k];
      if (rolesChanged) changes.roleIds = roleIds;
      const updated = await usersApi.update(id, changes);
      await refresh(updated);
      showToast("User saved", "success");
    });
  };

  const setStatus = (status: "active" | "disabled") =>
    setConfirm({
      title: status === "disabled" ? `Disable ${u.displayName}?` : `Enable ${u.displayName}?`,
      body:
        status === "disabled"
          ? "They are signed out on every device at once and can't sign in until enabled again. Nothing is deleted."
          : "They can sign in again with their current password.",
      action: status === "disabled" ? "Disable" : "Enable",
      danger: status === "disabled",
      run: async () => {
        await refresh(await usersApi.update(id, { status }));
        showToast(status === "disabled" ? "User disabled" : "User enabled", "success");
      },
    });

  return (
    <>
      <PageHeader
        title={u.displayName}
        description={`${KIND_LABELS[u.kind]} · @${u.username}`}
        actions={
          <Link href="/users" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            All users
          </Link>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 max-w-6xl">
        <form onSubmit={save} className="space-y-6" noValidate>
          {error && <FormAlert>{error}</FormAlert>}
          {protectedTarget && <FormAlert tone="info">This is a Super Admin. Only another Super Admin can change their account.</FormAlert>}

          <Card className="space-y-5">
            <h2 className="text-lg font-bold text-primary">Details</h2>
            <PhotoEditor
              name={u.displayName}
              avatarUrl={u.avatarUrl}
              canEdit={canEdit}
              onUpload={async (f) => {
                await usersApi.uploadPhoto(id, f);
                await afterPhoto();
                showToast("Photo saved", "success");
              }}
              onRemove={async () => {
                await usersApi.removePhoto(id);
                await afterPhoto();
                showToast("Photo removed", "success");
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Name" value={form.displayName} error={fieldErrors.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} readOnly={!canEdit} disabled={busy} />
              <Input label="Username" value={u.username} readOnly />
              <Input label="Email" type="email" value={form.email} error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} readOnly={!canEdit} disabled={busy} />
              <Input label="Mobile" inputMode="tel" value={form.mobile} error={fieldErrors.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} readOnly={!canEdit} disabled={busy} />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-primary">Roles</h2>
            {can("role.view") ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignable.map((r) => (
                  <Checkbox
                    key={r.id}
                    checked={roleIds.includes(r.id)}
                    onChange={(on) => setRoleIds((ids) => (on ? [...ids, r.id] : ids.filter((x) => x !== r.id)))}
                    label={r.name}
                    hint={r.description ?? undefined}
                    disabled={!canEdit || busy}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm">{u.roles.map((r) => r.name).join(", ") || "No roles"}</p>
            )}
          </Card>

          {canEdit && (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || (!detailsChanged && !rolesChanged)}
                onClick={() => {
                  setForm(original);
                  setRoleIds(u.roles.map((r) => r.id));
                }}
              >
                Discard changes
              </Button>
              <div className="w-40">
                <SubmitButton busy={busy} busyLabel="Saving…" disabled={!detailsChanged && !rolesChanged} className="gradient-primary py-2.5">
                  Save
                </SubmitButton>
              </div>
            </div>
          )}
        </form>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-primary">Sign-in</h2>
            <div className="flex flex-wrap gap-1">
              {u.status === "disabled" ? <Pill tone="danger">Disabled</Pill> : <Pill tone="success">Active</Pill>}
              {u.isSuperAdmin && <Pill tone="primary">Super Admin</Pill>}
              {u.locked && <Pill tone="warning">Locked</Pill>}
              {u.mfaEnabled && <Pill tone="primary">Two-step on</Pill>}
              {u.mustChangePassword && <Pill>New password due</Pill>}
            </div>
            <Detail label="Last sign-in" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"} />
            <Detail label="Account created" value={formatDateTime(u.createdAt)} />
            {u.locked && <Detail label="Locked until" value={formatDateTime(u.lockedUntil)} />}
          </Card>

          {(canReset || canEdit) && (
            <Card className="space-y-3">
              <h2 className="text-lg font-bold text-primary">Actions</h2>
              {canReset && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: "Reset password?",
                      body: "A new one-time password is created and shown to you. They are signed out everywhere and must choose a new password at sign-in.",
                      action: "Reset password",
                      run: async () => {
                        const r = await usersApi.resetPassword(id);
                        setNewPassword(r.temporaryPassword);
                        await refresh();
                      },
                    })
                  }
                >
                  Reset password
                </Button>
              )}
              {canReset && u.locked && (
                <Button variant="secondary" className="w-full" disabled={busy} onClick={() => act(async () => { await refresh(await usersApi.unlock(id)); showToast("Account unlocked", "success"); })}>
                  Unlock account
                </Button>
              )}
              {canReset && u.mfaEnabled && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: "Turn off two-step sign-in?",
                      body: "Use this if they lost their phone. They can sign in with their password only, and turn it on again from My account.",
                      action: "Turn it off",
                      run: async () => {
                        await refresh(await usersApi.resetMfa(id));
                        showToast("Two-step sign-in turned off", "success");
                      },
                    })
                  }
                >
                  Turn off two-step sign-in
                </Button>
              )}
              {canEdit && !isMe && (
                <Button variant="secondary" className={u.status === "active" ? "w-full text-error" : "w-full"} disabled={busy} onClick={() => setStatus(u.status === "active" ? "disabled" : "active")}>
                  {u.status === "active" ? "Disable account" : "Enable account"}
                </Button>
              )}
              {isMe && <p className="text-xs text-on-surface-variant/70">This is your own account. Change your password and devices in My account.</p>}
            </Card>
          )}

          <RecordHistory entity="user" id={u.id} />
        </div>
      </div>

      <Modal isOpen={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title}>
        <p className="text-sm text-on-surface-variant leading-relaxed">{confirm?.body}</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
            Cancel
          </Button>
          <Button className={confirm?.danger ? "bg-error text-white" : ""} disabled={busy} onClick={() => confirm && act(confirm.run)}>
            {confirm?.action}
          </Button>
        </div>
      </Modal>

      {newPassword && (
        <OneTimePasswordDialog open onClose={() => setNewPassword(null)} title="New one-time password" name={u.displayName} username={u.username} password={newPassword} />
      )}
    </>
  );
}

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission permission="user.view">
      <UserDetail id={id} />
    </RequirePermission>
  );
}
