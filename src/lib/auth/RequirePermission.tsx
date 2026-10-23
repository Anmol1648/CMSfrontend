"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

/** Shows the page only to people holding the permission (any of them, for a list); others get a friendly "no access" page. */
export function RequirePermission({ permission, children }: { permission: string | string[]; children: React.ReactNode }) {
  const { can } = useAuth();
  if ((Array.isArray(permission) ? permission : [permission]).some((p) => can(p))) return <>{children}</>;
  return (
    <div className="max-w-lg mx-auto text-center mt-20 space-y-4">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">lock</span>
      <h1 className="text-2xl font-extrabold text-on-surface">You don&apos;t have access to this page</h1>
      <p className="text-sm text-on-surface-variant/70">If you need it for your work, ask your school&apos;s administrator to give your role this permission.</p>
      <Link href="/" className="inline-block text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
        Back to home
      </Link>
    </div>
  );
}
