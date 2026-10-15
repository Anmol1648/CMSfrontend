"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FormAlert, PasswordField, SubmitButton } from "@/components/forms";
import { authApi } from "@/lib/api/auth";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { RedirectIfSignedIn, safeNext } from "@/lib/auth/guards";

export default function LoginPage() {
  return (
    <RedirectIfSignedIn>
      <Suspense>
        <LoginForm />
      </Suspense>
    </RedirectIfSignedIn>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { completeSignIn, sessionExpired } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const finish = async (result: Parameters<typeof completeSignIn>[0]) => {
    await completeSignIn(result);
    router.replace(result.mustChangePassword ? "/change-password" : safeNext(params.get("next")));
  };

  const fail = (err: unknown) => {
    setError(errorMessage(err));
    setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: Record<string, string> = {};
    if (!identifier.trim()) missing.identifier = "Enter your email, username or mobile";
    if (!password) missing.password = "Enter your password";
    setFieldErrors(missing);
    setError(null);
    if (Object.keys(missing).length) return;

    setBusy(true);
    try {
      const result = await authApi.login(identifier.trim(), password, rememberMe);
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setPassword("");
      } else {
        await finish(result);
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await finish(await authApi.verifyMfa(mfaToken, code));
    } catch (err) {
      if (err instanceof ApiError && err.code === "AUTH_INVALID_TOKEN") {
        // The 5-minute step expired: back to the password.
        setMfaToken(null);
        setCode("");
      }
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (mfaToken) {
    return (
      <>
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Two-step sign-in</h1>
          <p className="text-on-surface-variant/60 text-sm font-medium mt-2">Enter the 6-digit code from your authenticator app.</p>
        </div>
        <form onSubmit={submitCode} className="space-y-6" noValidate>
          {error && <FormAlert>{error}</FormAlert>}
          <Input
            label="Code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-2xl font-black tracking-[0.5em] text-center py-5"
            autoFocus
            autoComplete="one-time-code"
            disabled={busy}
          />
          <SubmitButton busy={busy} busyLabel="Checking…" disabled={code.length !== 6} className="gradient-primary">
            Verify and sign in
          </SubmitButton>
          <button
            type="button"
            onClick={() => {
              setMfaToken(null);
              setCode("");
              setError(null);
            }}
            className="w-full text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest hover:text-primary transition-colors"
          >
            Back
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Sign in</h1>
        <p className="text-on-surface-variant/60 text-sm font-medium mt-2">Use your email, username or mobile number.</p>
      </div>

      <form onSubmit={submitPassword} className="space-y-6" noValidate>
        {sessionExpired && !error && <FormAlert tone="info">Your session ended. Please sign in again.</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}

        <Input
          label="Email, username or mobile"
          id="login-identifier"
          placeholder="e.g. riya.sharma"
          value={identifier}
          error={fieldErrors.identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          icon="person"
          autoComplete="username"
          autoFocus
          disabled={busy}
        />

        <PasswordField
          label="Password"
          id="login-password"
          placeholder="Your password"
          value={password}
          error={fieldErrors.password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={busy}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-[#1A365D]"
            />
            <span className="text-sm text-on-surface-variant/70 font-medium">Keep me signed in</span>
          </label>
          <Link href="/forgot-password" className="text-[11px] font-bold text-primary hover:text-primary/70 uppercase tracking-widest">
            Forgot password?
          </Link>
        </div>

        <SubmitButton busy={busy} busyLabel="Signing in…" className="gradient-primary">
          Sign in
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </SubmitButton>
      </form>
    </>
  );
}
