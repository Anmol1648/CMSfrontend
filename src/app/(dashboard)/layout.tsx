"use client";

import { AppShell } from "@/components/layout/AppShell";
import { RequireSignedIn } from "@/lib/auth/guards";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSignedIn>
      <AppShell>{children}</AppShell>
    </RequireSignedIn>
  );
}
