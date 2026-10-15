"use client";

import { useState } from "react";
import { FormAlert, PasswordField, SubmitButton } from "@/components/forms";
import { authApi } from "@/lib/api/auth";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Current password + new password twice. On success the session continues with a fresh token. */
export function ChangePasswordForm({ onDone, submitLabel = "Change password" }: { onDone?: () => void; submitLabel?: string }) {
  const { adoptNewToken } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: Record<string, string> = {};
    if (!current) missing.currentPassword = "Enter your current password";
    if (!next) missing.newPassword = "Choose a new password";
    else if (next !== confirm) missing.confirm = "The two passwords don't match";
    setFieldErrors(missing);
    setError(null);
    setProblems([]);
    if (Object.keys(missing).length) return;

    setBusy(true);
    try {
      const token = await authApi.changePassword(current, next);
      await adoptNewToken(token.accessToken);
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === "PASSWORD_POLICY") {
        setProblems(err.details.map((d) => d.message));
        setError("Your new password doesn't meet the rules:");
      } else {
        setError(errorMessage(err));
        setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && (
        <FormAlert>
          {error}
          {problems.length > 0 && (
            <ul className="list-disc ml-5 mt-1 font-medium">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </FormAlert>
      )}
      <PasswordField label="Current password" value={current} error={fieldErrors.currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" disabled={busy} />
      <PasswordField label="New password" value={next} error={fieldErrors.newPassword} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" disabled={busy} />
      <PasswordField label="Repeat new password" value={confirm} error={fieldErrors.confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" disabled={busy} />
      <SubmitButton busy={busy} busyLabel="Saving…" className="gradient-primary">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
