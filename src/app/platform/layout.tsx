"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { platformApi, platformToken, PlatformUser } from "@/lib/api/platform";
import { PlatformCtx } from "@/components/platform/PlatformContext";

/** The platform console (Klytos staff): its own sign-in, apart from any school. */


function SignIn({ onDone }: { onDone: (u: PlatformUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<{ token: string; qr?: string; secret?: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Klytos</p>
          <h1 className="text-2xl font-extrabold">Platform console</h1>
          <p className="text-sm text-on-surface-variant">For Klytos staff. Schools sign in at their own address.</p>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        {!step ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void go(async () => {
                const r = await platformApi.login(email, password);
                setStep({ token: r.mfaToken, qr: r.qrCodeDataUrl, secret: r.secret });
              });
            }}
          >
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" loading={busy} className="w-full">
              Continue
            </Button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void go(async () => {
                const r = await platformApi.verify(step.token, code);
                platformToken.set(r.token);
                onDone(r.user);
              });
            }}
          >
            {step.qr ? (
              <div className="space-y-2 text-center">
                <p className="text-sm">Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator…). It is required for the console.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.qr} alt="Authenticator QR code" className="mx-auto h-48 w-48" />
                <p className="font-mono text-xs text-on-surface-variant break-all">{step.secret}</p>
              </div>
            ) : (
              <p className="text-sm">Enter the 6-digit code from your authenticator app.</p>
            )}
            <Input label="Code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
            <Button type="submit" loading={busy} disabled={code.length !== 6} className="w-full">
              Sign in
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-3">
        <h1 className="text-xl font-extrabold">Choose your password</h1>
        <p className="text-sm text-on-surface-variant">Replace the one-time password with your own (at least 10 characters).</p>
        {error && <FormAlert>{error}</FormAlert>}
        <Input label="One-time password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <Button
          className="w-full"
          disabled={next.length < 10}
          onClick={async () => {
            try {
              await platformApi.changePassword(current, next);
              onDone();
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Save
        </Button>
      </Card>
    </div>
  );
}

const NAV = [
  { href: "/platform", label: "Schools", owner: false },
  { href: "/platform/leads", label: "Leads", owner: false },
  { href: "/platform/plans", label: "Plans", owner: false },
  { href: "/platform/notices", label: "Notices", owner: false },
  { href: "/platform/staff", label: "Staff", owner: true },
  { href: "/platform/log", label: "Log", owner: false },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<PlatformUser | null | undefined>(undefined);
  useEffect(() => {
    if (!platformToken.get()) return setUser(null);
    platformApi
      .me()
      .then(setUser)
      .catch(() => {
        platformToken.set(null);
        setUser(null);
      });
  }, []);
  if (user === undefined) return <PageLoader />;
  if (!user) return <SignIn onDone={setUser} />;
  if (user.mustChangePassword) return <NewPassword onDone={() => setUser({ ...user, mustChangePassword: false })} />;
  const signOut = () => {
    platformToken.set(null);
    setUser(null);
  };
  return (
    <PlatformCtx.Provider value={{ user, signOut }}>
      <div className="min-h-screen bg-surface">
        <header className="sticky top-0 z-30 border-b border-outline-variant/20 bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/platform" className="font-black text-primary">
              Klytos <span className="font-semibold text-on-surface-variant">console</span>
            </Link>
            <nav className="flex flex-wrap gap-1">
              {NAV.filter((n) => !n.owner || user.role === "owner").map((n) => {
                const active = n.href === "/platform" ? pathname === "/platform" || pathname.startsWith("/platform/schools") : pathname.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", active ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container")}>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-on-surface-variant">
                {user.name} · {user.role}
              </span>
              <button type="button" onClick={signOut} className="font-semibold text-primary">
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </PlatformCtx.Provider>
  );
}
