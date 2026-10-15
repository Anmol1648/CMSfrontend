"use client";

/**
 * Who is signed in, for the whole app.
 * On page load it renews the session from the httpOnly refresh cookie (nothing is kept in
 * localStorage), then loads /auth/me. Pages read it with useAuth().
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, Me, SignedIn } from "@/lib/api/auth";
import { renewSession, setAccessToken, setSessionEndedHandler } from "@/lib/api/client";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  me: Me | null;
  /** True until the user chooses their own password. */
  mustChangePassword: boolean;
  /** Ended because the session expired or was signed out elsewhere (shown on the sign-in page). */
  sessionExpired: boolean;
  completeSignIn: (result: SignedIn) => Promise<void>;
  /** After a password change: use the new token and reload the user. */
  adoptNewToken: (accessToken: string) => Promise<void>;
  reloadMe: () => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadMe = useCallback(async () => {
    const profile = await authApi.me();
    setMe(profile);
    setStatus("signedIn");
  }, []);

  const toSignedOut = useCallback(
    (expired: boolean) => {
      setAccessToken(null);
      setMe(null);
      setSessionExpired(expired);
      setStatus("signedOut");
      queryClient.clear();
    },
    [queryClient]
  );

  // Restore the session on page load.
  useEffect(() => {
    let cancelled = false;
    setSessionEndedHandler(() => toSignedOut(true));
    renewSession()
      .then(() => (cancelled ? undefined : loadMe()))
      .catch(() => {
        if (!cancelled) toSignedOut(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadMe, toSignedOut]);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      mustChangePassword: me?.mustChangePassword ?? false,
      sessionExpired,
      completeSignIn,
      adoptNewToken,
      reloadMe: loadMe,
      signOut,
    }),
    [status, me, sessionExpired, completeSignIn, adoptNewToken, loadMe, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
