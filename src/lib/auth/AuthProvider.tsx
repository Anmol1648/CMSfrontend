"use client";

/**
 * Who is signed in, for the whole app.
 * On page load it renews the session from the httpOnly refresh cookie (nothing is kept in
 * localStorage), then loads /auth/me. Pages read it with useAuth().
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, Me, SignedIn } from "@/lib/api/auth";
import { restoreSession, setAccessToken, setSessionEndedHandler } from "@/lib/api/client";
import { Access, accessApi } from "@/lib/api/admin";
import { APP_HOME } from "./home";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  me: Me | null;
  /** What I may do and my sidebar (null until the password has been changed). */
  access: Access | null;
  /** True if I hold the permission ("resource.action"). */
  can: (permission: string) => boolean;
  /** True until the user chooses their own password. */
  mustChangePassword: boolean;
  /** Ended because the session expired or was signed out elsewhere (shown on the sign-in page). */
  sessionExpired: boolean;
  completeSignIn: (result: SignedIn) => Promise<void>;
  /** After a password change: use the new token and reload the user. */
  adoptNewToken: (accessToken: string) => Promise<void>;
  reloadMe: () => Promise<void>;
  reloadAccess: () => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [rawAccess, setAccess] = useState<Access | null>(null);
  // The server's "Home" link is "/", which on the website address is the website: the ERP home is /home.
  const access = useMemo<Access | null>(
    () => rawAccess && { ...rawAccess, menu: rawAccess.menu.map((g) => ({ ...g, items: g.items.map((i) => (i.href === "/" ? { ...i, href: APP_HOME } : i)) })) },
    [rawAccess]
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadMe = useCallback(async () => {
    const profile = await authApi.me();
    // Until the password is changed the server allows nothing else, so access is loaded afterwards.
    setAccess(profile.mustChangePassword ? null : await accessApi.mine());
    setMe(profile);
    setStatus("signedIn");
  }, []);

  const toSignedOut = useCallback(
    (expired: boolean) => {
      setAccessToken(null);
      setMe(null);
      setAccess(null);
      setSessionExpired(expired);
      setStatus("signedOut");
      // Forget everything that belonged to the signed-in person, but keep public data (keys
      // "public-…": the school branding, the website enquiry form) that the page is showing.
      queryClient.removeQueries({ predicate: (q) => !String(q.queryKey[0]).startsWith("public-") });
    },
    [queryClient]
  );

  // Restore the session on page load: one request returns the session, who I am and my access.
  useEffect(() => {
    let cancelled = false;
    setSessionEndedHandler(() => toSignedOut(true));
    restoreSession<{ me: Me; access: Access | null }>()
      .then((r) => {
        if (cancelled) return;
        setMe(r.me);
        setAccess(r.access);
        setStatus("signedIn");
      })
      .catch(() => {
        if (!cancelled) toSignedOut(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toSignedOut]);

  const completeSignIn = useCallback(
    async (result: SignedIn) => {
      setAccessToken(result.accessToken);
      setSessionExpired(false);
      await loadMe();
    },
    [loadMe]
  );

  const adoptNewToken = useCallback(
    async (accessToken: string) => {
      setAccessToken(accessToken);
      await loadMe();
    },
    [loadMe]
  );

  const signOut = useCallback(
    async (everywhere = false) => {
      try {
        if (everywhere) await authApi.logoutAll();
        else await authApi.logout();
      } catch {
        // Signing out locally still happens if the server can't be reached.
      }
      toSignedOut(false);
    },
    [toSignedOut]
  );

  const reloadAccess = useCallback(async () => {
    setAccess(await accessApi.mine());
  }, []);

  const can = useCallback((permission: string) => !!access?.permissions[permission], [access]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      access,
      can,
      mustChangePassword: me?.mustChangePassword ?? false,
      sessionExpired,
      completeSignIn,
      adoptNewToken,
      reloadMe: loadMe,
      reloadAccess,
      signOut,
    }),
    [status, me, access, can, sessionExpired, completeSignIn, adoptNewToken, loadMe, reloadAccess, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
