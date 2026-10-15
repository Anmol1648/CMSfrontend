"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FormAlert, SubmitButton } from "@/components/forms";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { RedirectIfSignedIn } from "@/lib/auth/guards";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return setError("Enter your email, username or mobile");
    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(identifier.trim());
      router.push(`/reset-password?identifier=${encodeURIComponent(identifier.trim())}&sent=1`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RedirectIfSignedIn>
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Forgot password</h1>
        <p className="text-on-surface-variant/60 text-sm font-medium mt-2">
          We&apos;ll email a 6-digit code to the address on your account.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-6" noValidate>
        {error && <FormAlert>{error}</FormAlert>}
        <Input
          label="Email, username or mobile"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          icon="person"
          autoComplete="username"
          autoFocus
          disabled={busy}
        />
        <SubmitButton busy={busy} busyLabel="Sending…" className="gradient-primary">
          Send code
        </SubmitButton>
        <p className="text-xs text-on-surface-variant/60 leading-relaxed">
          No email address on your account? Ask the school office to reset your password.
        </p>
        <Link href="/login" className="block text-center text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest hover:text-primary">
          Back to sign in
        </Link>
      </form>
    </RedirectIfSignedIn>
  );
}
