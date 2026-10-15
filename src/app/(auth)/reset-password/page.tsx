"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FormAlert, PasswordField, SubmitButton } from "@/components/forms";
import { authApi } from "@/lib/api/auth";
import { ApiError, errorMessage } from "@/lib/api/client";
import { RedirectIfSignedIn } from "@/lib/auth/guards";

export default function ResetPasswordPage() {
  return (
    <RedirectIfSignedIn>
      <Suspense>
        <ResetForm />
      </Suspense>
    </RedirectIfSignedIn>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState(params.get("identifier") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems: Record<string, string> = {};
    if (!identifier.trim()) problems.identifier = "Enter your email, username or mobile";
    if (!/^\d{6}$/.test(code)) problems.code = "Enter the 6-digit code from the email";
    if (!password) problems.newPassword = "Choose a new password";
    else if (password !== confirm) problems.confirm = "The two passwords don't match";
    setFieldErrors(problems);
    setError(null);
    if (Object.keys(problems).length) return;

    setBusy(true);
    try {
      const result = await authApi.resetPassword(identifier.trim(), code, password);
      setDone(result.message);
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Password changed</h1>
        <FormAlert tone="success">{done}</FormAlert>
        <Link href="/login" className="block w-full text-center py-4 gradient-primary text-white font-bold rounded-xl shadow-premium">
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Choose a new password</h1>
        <p className="text-on-surface-variant/60 text-sm font-medium mt-2">Enter the code we emailed you and your new password.</p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {params.get("sent") && !error && (
          <FormAlert tone="info">If your account has an email address, a code is on its way. It is valid for a few minutes.</FormAlert>
        )}
        {error && <FormAlert>{error}</FormAlert>}
        <Input label="Email, username or mobile" value={identifier} error={fieldErrors.identifier} onChange={(e) => setIdentifier(e.target.value)} icon="person" disabled={busy} />
        <Input
          label="6-digit code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          error={fieldErrors.code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          icon="pin"
          autoComplete="one-time-code"
          autoFocus={!!identifier}
          disabled={busy}
        />
        <PasswordField label="New password" value={password} error={fieldErrors.newPassword} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={busy} />
        <PasswordField label="Repeat new password" value={confirm} error={fieldErrors.confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" disabled={busy} />
        <SubmitButton busy={busy} busyLabel="Saving…" className="gradient-primary">
          Change password
        </SubmitButton>
        <Link href="/forgot-password" className="block text-center text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest hover:text-primary">
          Send a new code
        </Link>
      </form>
    </>
  );
}
