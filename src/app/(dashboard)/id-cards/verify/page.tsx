"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { idCardsApi, Verify, VERIFY } from "@/lib/api/idcards";
import { CameraScan } from "@/components/library/CameraScan";
import { cn } from "@/lib/utils";

const TONE = { success: "bg-emerald-600", danger: "bg-red-600", warning: "bg-amber-500" };

function Check() {
  const [code, setCode] = useState("");
  const [r, setR] = useState<Verify | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const check = async (c: string) => {
    setErr(null);
    setR(null);
    try {
      setR(await idCardsApi.verify(c.trim()));
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const v = r ? VERIFY[r.status] : null;
  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <CameraScan onScan={check} label="Scan the card" square />
          <form
            className="flex flex-1 gap-2 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) void check(code);
            }}
          >
            <Input label="Or type the card no / admission no / employee code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="submit" disabled={!code.trim()}>
              Check
            </Button>
          </form>
        </div>
      </Card>
      {err && <FormAlert>{err}</FormAlert>}
      {r && v && (
        <Card padding="none">
          <div className={cn("px-5 py-4 text-white text-lg font-extrabold flex items-center gap-2", TONE[v.tone])}>
            <span className="material-symbols-outlined">{v.tone === "success" ? "verified" : v.tone === "danger" ? "block" : "warning"}</span>
            {v.label}
          </div>
          <div className="flex gap-4 p-5">
            <AuthedPhoto path={r.holder.photo} className="w-28 h-36 rounded-xl object-cover" />
            <div className="space-y-1 text-sm">
              <p className="text-xl font-extrabold">{r.holder.name}</p>
              <p>
                {r.holder.type === "staff" ? "Staff" : "Student"} · {r.holder.sub}
              </p>
              {r.holder.bloodGroup && <p>Blood group: {r.holder.bloodGroup}</p>}
              {r.holder.transport && <p>Bus: {r.holder.transport}</p>}
              {r.cardNo && (
                <p className="text-xs text-on-surface-variant">
                  Card {r.cardNo}
                  {r.validUntil ? ` · valid till ${new Date(`${r.validUntil}T00:00:00`).toLocaleDateString("en-IN")}` : ""}
                </p>
              )}
              {r.status === "replaced" && r.current && <p className="text-xs font-bold">Their current card is {r.current}.</p>}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function IdCardVerifyPage() {
  return (
    <RequirePermission permission="idcard.verify">
      <PageHeader title="Check an ID Card" description="Scan the QR (or barcode) on a card: shows the person’s photo and whether the card is valid, replaced, cancelled or expired." />
      <Check />
    </RequirePermission>
  );
}
