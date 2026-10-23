"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { alertsApi } from "@/lib/api/alerts";

/** The provider keys for SMS and WhatsApp (kept encrypted; never shown again). */
const FIELDS: Record<string, Record<string, { key: string; label: string; help?: string }[]>> = {
  sms: {
    msg91: [
      { key: "smsKey", label: "Auth key" },
      { key: "smsTemplate", label: "DLT template (flow) id", help: "The approved template with one variable for the message." },
    ],
    twilio: [
      { key: "smsAccount", label: "Account SID" },
      { key: "smsKey", label: "Auth token" },
    ],
    fast2sms: [{ key: "smsKey", label: "API key" }],
  },
  whatsapp: {
    meta: [
      { key: "whatsappAccount", label: "Phone number id" },
      { key: "whatsappKey", label: "Access token" },
      { key: "whatsappTemplate", label: "Approved template name (one variable)", help: "Needed to message people who haven’t written to the school in 24 hours." },
    ],
    gupshup: [
      { key: "whatsappAccount", label: "App name" },
      { key: "whatsappKey", label: "API key" },
    ],
  },
};
const SAVED: Record<string, "key" | "account" | "template"> = { smsKey: "key", smsAccount: "account", smsTemplate: "template", whatsappKey: "key", whatsappAccount: "account", whatsappTemplate: "template" };

function Channels() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["alert-channels"], queryFn: alertsApi.channels });
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const c = q.data;
  if (!c) return <PageLoader />;
  const save = async () => {
    setBusy(true);
    try {
      queryClient.setQueryData(["alert-channels"], await alertsApi.saveKeys(keys));
      setKeys({});
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const block = (channel: "sms" | "whatsapp", title: string) => {
    const s = c[channel];
    const fields = FIELDS[channel][s.provider] ?? [];
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-primary">{title}</p>
          <Pill tone={s.on ? "success" : "neutral"}>{s.on ? "on" : "off"}</Pill>
        </div>
        <p className="text-xs text-on-surface-variant/70">
          Provider: <b>{s.provider}</b> (change it, and switch the channel on, in System Settings → Alerts).
        </p>
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Input label={`${f.label}${s.saved[SAVED[f.key]] ? " (saved; type to replace, “-” to remove)" : ""}`} type="password" autoComplete="new-password" value={keys[f.key] ?? ""} onChange={(e) => setKeys({ ...keys, [f.key]: e.target.value })} />
            {f.help && <p className="text-[11px] text-on-surface-variant/60 ml-1">{f.help}</p>}
          </div>
        ))}
      </Card>
    );
  };
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-primary">In-app</p>
            <Pill tone={c.inApp ? "success" : "neutral"}>{c.inApp ? "on" : "off"}</Pill>
          </div>
          <p className="text-xs text-on-surface-variant/70">The bell, for everyone with a login. Free.</p>
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-primary">Email</p>
            <Pill tone={c.email.on ? "success" : "neutral"}>{c.email.on ? "on" : "off"}</Pill>
          </div>
          <p className="text-xs text-on-surface-variant/70">{c.email.configured ? "Sent from the school’s mail account." : "The mail server isn’t set up on the server yet (SMTP)."} Test it from Configuration → Email Templates.</p>
        </Card>
      </div>
      {block("sms", "SMS")}
      {block("whatsapp", "WhatsApp")}
      <FormAlert tone="info">
        SMS and WhatsApp cost money per message and need an account with the provider (and DLT / template approval). Switch them on in{" "}
        <Link href="/settings" className="font-bold underline">
          System Settings → Alerts
        </Link>{" "}
        once the keys are in. Who may use them is set in Roles &amp; Permissions.
      </FormAlert>
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy || !Object.values(keys).some(Boolean)}>
          Save keys
        </Button>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <RequirePermission permission="alert.setup">
      <PageHeader title="Channels" description="How alerts and messages reach people: in-app, email, SMS and WhatsApp, and the provider keys." />
      <Channels />
    </RequirePermission>
  );
}
