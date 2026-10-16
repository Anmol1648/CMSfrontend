"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Detail, FormAlert, PasswordField, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { authApi, DeviceSession, MfaSetup } from "@/lib/api/auth";
import { ApiError, errorMessage } from "@/lib/api/client";
import { PhotoEditor } from "@/components/account/UserPhoto";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "Chrome on Windows" from a user-agent string (good enough for recognising one's own devices). */
const deviceName = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        {description && <p className="text-sm text-on-surface-variant/70 mt-1">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function TwoStepSignIn() {
  const { me, reloadMe } = useAuth();
  const { showToast } = useToast();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = me?.user.mfaEnabled;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (enabled) {
    return (
      <Section title="Two-step sign-in" description="On. Signing in asks for a code from your authenticator app.">
        <form
          className="space-y-4 max-w-md"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await authApi.disableMfa(password, code);
              setPassword("");
              setCode("");
              await reloadMe();
              showToast("Two-step sign-in is off", "success");
            });
          }}
        >
          {error && <FormAlert>{error}</FormAlert>}
          <p className="text-sm text-on-surface-variant">To turn it off, confirm with your password and a current code.</p>
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={busy} />
          <Input label="Code from your app" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} icon="pin" disabled={busy} />
          <SubmitButton busy={busy} disabled={!password || code.length !== 6} className="bg-error">
            Turn off two-step sign-in
          </SubmitButton>
        </form>
      </Section>
    );
  }

  return (
    <Section title="Two-step sign-in" description="Off. Turn it on so a stolen password alone isn't enough to get into your account.">
      {error && <FormAlert>{error}</FormAlert>}
      {!setup ? (
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              setSetup(await authApi.startMfaSetup());
            })
          }
        >
          Set up with an authenticator app
        </Button>
      ) : (
        <form
          className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-start"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await authApi.enableMfa(code);
              setSetup(null);
              setCode("");
              await reloadMe();
              showToast("Two-step sign-in is on", "success");
            });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrCodeDataUrl} alt="QR code to scan with your authenticator app" className="w-[200px] h-[200px] rounded-xl border border-outline-variant/30" />
          <div className="space-y-4 max-w-md">
            <ol className="list-decimal ml-5 text-sm text-on-surface-variant space-y-1">
              <li>Open Google Authenticator, Microsoft Authenticator or a similar app.</li>
              <li>Scan the QR code (or type the key below).</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            <p className="text-xs font-mono break-all bg-surface-container-low rounded-lg px-3 py-2 text-primary">{setup.secret}</p>
            <Input label="Code from your app" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} icon="pin" autoFocus disabled={busy} />
            <div className="flex gap-3">
              <SubmitButton busy={busy} disabled={code.length !== 6} className="gradient-primary">
                Turn on
              </SubmitButton>
              <Button type="button" variant="secondary" onClick={() => setSetup(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}
    </Section>
  );
}

function Devices() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sessions = useQuery({ queryKey: ["my-sessions"], queryFn: authApi.sessions });
  const end = useMutation({
    mutationFn: (s: DeviceSession) => authApi.endSession(s.id),
    onSuccess: () => {
      showToast("That device has been signed out", "success");
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (err) => showToast(errorMessage(err), "error"),
  });

  return (
    <Section title="My devices" description="Where you are signed in right now. Sign out any device you don't recognise.">
      {sessions.isLoading && <p className="text-sm text-on-surface-variant">Loading…</p>}
      {sessions.isError && <FormAlert>{errorMessage(sessions.error)}</FormAlert>}
      <ul className="divide-y divide-outline-variant/20">
        {sessions.data?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-6 py-4">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-2xl text-primary/70">{/Android|iPhone/.test(s.userAgent ?? "") ? "smartphone" : "computer"}</span>
              <div>
                <p className="text-sm font-bold text-on-surface">
                  {deviceName(s.userAgent)}
                  {s.current && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">This device</span>}
                </p>
                <p className="text-xs text-on-surface-variant/70 mt-0.5">
                  Last active {when(s.lastUsedAt)} · signed in {when(s.createdAt)}
                  {s.ip ? ` · ${s.ip}` : ""}
                </p>
              </div>
            </div>
            {!s.current && (
              <Button variant="secondary" disabled={end.isPending} onClick={() => end.mutate(s)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const KIND: Record<string, string> = { admin: "Administrator", staff: "Staff", student: "Student", guardian: "Parent / guardian" };

function MyDetails() {
  const { me, reloadMe } = useAuth();
  const { showToast } = useToast();
  const u = me!.user;
  const allowed = new Set(me!.selfEdit);
  const original = { displayName: u.displayName, email: u.email ?? "", mobile: u.mobile ?? "" };
  const [form, setForm] = useState(original);
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const changed = (Object.keys(form) as (keyof typeof form)[]).filter((k) => form[k].trim() !== original[k]);
  const needsPassword = changed.includes("email") || changed.includes("mobile");
  const anyEditable = allowed.has("name") || allowed.has("email") || allowed.has("mobile");
  const locked = (["name", "email", "mobile"] as const).filter((f) => !allowed.has(f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await authApi.updateMe({ ...Object.fromEntries(changed.map((k) => [k, form[k].trim()])), ...(needsPassword ? { currentPassword } : {}) });
      setCurrentPassword("");
      await reloadMe();
      showToast("Details saved", "success");
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  // After a save, start from what was stored.
  useEffect(() => {
    setForm({ displayName: u.displayName, email: u.email ?? "", mobile: u.mobile ?? "" });
  }, [u.displayName, u.email, u.mobile]);

  return (
    <Section title="Details">
      <PhotoEditor
        name={u.displayName}
        avatarUrl={u.avatarUrl}
        canEdit={allowed.has("photo")}
        note="To change your photo, ask the school office."
        onUpload={async (f) => {
          await authApi.uploadMyPhoto(f);
          await reloadMe();
          showToast("Photo saved", "success");
        }}
        onRemove={async () => {
          await authApi.removeMyPhoto();
          await reloadMe();
          showToast("Photo removed", "success");
        }}
      />

      <form onSubmit={save} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {allowed.has("name") ? (
            <Input label="Name" value={form.displayName} error={fieldErrors.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} disabled={busy} maxLength={120} />
          ) : (
            <Detail label="Name" value={u.displayName} />
          )}
          <Detail label="Username" value={u.username} />
          {allowed.has("email") ? (
            <Input label="Email" type="email" value={form.email} error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={busy} autoComplete="email" />
          ) : (
            <Detail label="Email" value={u.email} />
          )}
          {allowed.has("mobile") ? (
            <Input label="Mobile" inputMode="tel" value={form.mobile} error={fieldErrors.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} disabled={busy} autoComplete="tel" />
          ) : (
            <Detail label="Mobile" value={u.mobile} />
          )}
          <Detail label="Type" value={KIND[u.kind] ?? u.kind} />
          <Detail label="Roles" value={me!.roles.map((r) => r.name).join(", ") || "—"} />
        </div>

        {needsPassword && (
          <div className="max-w-md">
            <PasswordField
              label="Current password (needed to change email or mobile)"
              value={currentPassword}
              error={fieldErrors.currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </div>
        )}

        {anyEditable && (
          <div className="flex flex-wrap gap-3">
            <div className="w-40">
              <SubmitButton busy={busy} busyLabel="Saving…" disabled={!changed.length || (needsPassword && !currentPassword)} className="py-2.5">
                Save details
              </SubmitButton>
            </div>
            <Button type="button" variant="secondary" disabled={busy || !changed.length} onClick={() => { setForm(original); setFieldErrors({}); setError(null); }}>
              Discard changes
            </Button>
          </div>
        )}
        {locked.length > 0 && (
          <p className="text-xs text-on-surface-variant/60">
            To change your {locked.map((f) => (f === "name" ? "name" : f === "email" ? "email" : "mobile")).join(", ").replace(/, ([^,]*)$/, " or $1")}, ask the school office.
          </p>
        )}
      </form>
    </Section>
  );
}

export default function AccountPage() {
  const { me } = useAuth();
  const { showToast } = useToast();
  if (!me) return null;
  const u = me.user;

  return (
    <>
      <PageHeader title="My account" description="Your sign-in details, password, two-step sign-in and devices." />
      <div className="space-y-6 max-w-4xl">
        <MyDetails />

        <Section title="Password" description="Changing it signs you out on your other devices.">
          <div className="max-w-md">
            <ChangePasswordForm onDone={() => showToast("Password changed. Your other devices have been signed out.", "success")} />
          </div>
        </Section>

        <TwoStepSignIn />
        <Devices />
      </div>
    </>
  );
}
