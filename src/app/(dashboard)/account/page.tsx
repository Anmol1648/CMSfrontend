"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Detail, FormAlert, PasswordField, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { authApi, DeviceSession, MfaSetup } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
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

export default function AccountPage() {
  const { me } = useAuth();
  const { showToast } = useToast();
  if (!me) return null;
  const u = me.user;

  return (
    <>
      <PageHeader title="My account" description="Your sign-in details, password, two-step sign-in and devices." />
      <div className="space-y-6 max-w-4xl">
        <Section title="Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Detail label="Name" value={u.displayName} />
            <Detail label="Username" value={u.username} />
            <Detail label="Type" value={u.kind} />
            <Detail label="Email" value={u.email} />
            <Detail label="Mobile" value={u.mobile} />
            <Detail label="Roles" value={me.roles.map((r) => r.name).join(", ") || "—"} />
          </div>
          <p className="text-xs text-on-surface-variant/60">To change your name, email or mobile, ask the school office.</p>
        </Section>

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
