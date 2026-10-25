"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { FormAlert } from "@/components/forms";
import { FullPageLoader } from "@/components/ui/FullPageLoader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { APP_HOME } from "@/lib/auth/home";

/** Shown right after signing in with a one-time (or expired) password. */
export default function ChangePasswordPage() {
  const { status, me, mustChangePassword, signOut } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
    else if (status === "signedIn" && !mustChangePassword) router.replace(APP_HOME);
  }, [status, mustChangePassword, router]);

  if (status !== "signedIn" || !mustChangePassword) return <FullPageLoader />;

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Choose your password</h1>
        <p className="text-on-surface-variant/60 text-sm font-medium mt-2">
          Hello {me?.user.displayName}. Before you continue, replace the password you were given with one only you know.
        </p>
      </div>
      <FormAlert tone="info">Your current password is the one-time password you signed in with.</FormAlert>
      <ChangePasswordForm
        submitLabel="Save and continue"
        onDone={() => {
          showToast("Password saved", "success");
          router.replace(APP_HOME);
        }}
      />
      <button
        type="button"
        onClick={() => signOut()}
        className="w-full text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest hover:text-primary"
      >
        Sign out
      </button>
    </>
  );
}
