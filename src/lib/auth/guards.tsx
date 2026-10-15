"use client";

/**
 * Page guards (the server checks every API call anyway; these only decide which screen to show).
 * - RequireSignedIn: app pages. Not signed in → /login; must change password → /change-password.
 * - RedirectIfSignedIn: sign-in pages. Already signed in → home.
 */
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { FullPageLoader } from "@/components/ui/FullPageLoader";

export function RequireSignedIn({ children }: { children: React.ReactNode }) {
  const { status, mustChangePassword } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signedOut") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "signedIn" && mustChangePassword) router.replace("/change-password");
  }, [status, mustChangePassword, router, pathname]);

  if (status !== "signedIn" || mustChangePassword) return <FullPageLoader />;
  return <>{children}</>;
}

export function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { status, mustChangePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedIn") router.replace(mustChangePassword ? "/change-password" : "/");
  }, [status, mustChangePassword, router]);

  if (status !== "signedOut") return <FullPageLoader />;
  return <>{children}</>;
}

/** Returns the safe in-app path from ?next= (never another site). */
export const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
