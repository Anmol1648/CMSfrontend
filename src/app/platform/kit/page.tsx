"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { platformApi } from "@/lib/api/platform";

const KIT = [
  {
    key: "prerequisites" as const,
    icon: "checklist",
    title: "Prerequisites (PDF)",
    text: "Everything a school must give us to start: school profile, classes, students and staff (with the Excel columns), fees, exams and the optional modules — each marked “needed to start”, “in the first weeks” or “if used”. Send it after the demo.",
    button: "Download PDF",
  },
  {
    key: "demo-deck" as const,
    icon: "slideshow",
    title: "Demo deck (PowerPoint)",
    text: "For the demo meeting: the problems schools have today, what the ERP is, what it solves, who uses it, a slide with a real screenshot for every part of the ERP, data safety and the four steps to go live.",
    button: "Download PowerPoint",
  },
];

export default function KitPage() {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const get = async (key: (typeof KIT)[number]["key"]) => {
    setBusy(key);
    try {
      await platformApi.kit(key);
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Sales kit</h1>
        <p className="text-sm text-on-surface-variant">What to send a school and what to show in the demo. Both are made fresh when you download them.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {KIT.map((k) => (
          <Card key={k.key} className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined shrink-0 rounded-2xl bg-primary/10 p-3 text-primary">{k.icon}</span>
              <div>
                <p className="text-lg font-extrabold">{k.title}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{k.text}</p>
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <Button onClick={() => get(k.key)} loading={busy === k.key}>
                {k.button}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-on-surface-variant">The deck’s screenshots come from the demo school. After the screens change, take them again on the server with <code>npm run demo:screens</code>.</p>
    </div>
  );
}
