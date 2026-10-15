"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "This is your first sign-in";

export default function HomePage() {
  const { me } = useAuth();
  if (!me) return null;

  return (
    <>
      <PageHeader title={`Welcome, ${me.user.displayName}`} description={me.school?.legalName} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Signed in as</p>
          <p className="text-lg font-bold text-primary mt-2">{me.user.username}</p>
          <p className="text-sm text-on-surface-variant mt-1">{me.roles.map((r) => r.name).join(", ")}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Last sign-in</p>
          <p className="text-lg font-bold text-primary mt-2">{formatDate(me.user.lastLoginAt)}</p>
          <Link href="/account" className="text-xs font-bold text-primary uppercase tracking-widest mt-3 inline-block hover:opacity-70">
            See my devices
          </Link>
        </Card>
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Two-step sign-in</p>
          <p className="text-lg font-bold text-primary mt-2">{me.user.mfaEnabled ? "On" : "Off"}</p>
          {!me.user.mfaEnabled && (
            <Link href="/account" className="text-xs font-bold text-primary uppercase tracking-widest mt-3 inline-block hover:opacity-70">
              Turn it on
            </Link>
          )}
        </Card>
      </div>
      <p className="text-sm text-on-surface-variant/60 mt-10">
        More modules (academic setup, students, staff, attendance…) appear here as they are built.
      </p>
    </>
  );
}
