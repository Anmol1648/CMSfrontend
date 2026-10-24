"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { CameraScan } from "@/components/library/CameraScan";
import { hostelApi, when, type Leave } from "@/lib/api/hostel";

function Gate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [last, setLast] = useState<{ action: "out" | "in"; leave: Leave } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const out = useQuery({ queryKey: ["hostel", "gate-out"], queryFn: hostelApi.out, refetchInterval: 60_000 });
  const scan = async (c: string) => {
    const t = c.trim().split(/[/=?#]/).filter(Boolean).pop() ?? "";
    if (!t) return;
    setError(null);
    try {
      const r = await hostelApi.scan(t);
      setLast(r);
      showToast(r.action === "out" ? `${r.leave.student} went out` : `${r.leave.student} is back${r.leave.late ? " (late)" : ""}`, r.leave.late ? "warning" : "success");
      qc.invalidateQueries({ queryKey: ["hostel", "gate-out"] });
    } catch (e) {
      setLast(null);
      setError(errorMessage(e));
    } finally {
      setCode("");
      box.current?.focus();
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <p className="mb-3 font-bold">Scan or type the pass code</p>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void scan(code);
            }}
          >
            <Input ref={box} autoFocus className="flex-1" placeholder="e.g. 4F9A21C0" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <Button type="submit" disabled={code.trim().length < 4}>
              Check
            </Button>
          </form>
          <div className="mt-3">
            <CameraScan onScan={(c) => void scan(c)} label="Scan the pass QR" square />
          </div>
        </Card>
        {error && <FormAlert>{error}</FormAlert>}
        {last && (
          <Card className={last.leave.late ? "border-2 border-amber-500" : last.action === "out" ? "border-2 border-primary" : "border-2 border-emerald-600"}>
            <div className="flex items-center gap-4">
              <AuthedPhoto path={last.leave.photo} className="h-20 w-20 rounded-2xl" />
              <div>
                <p className="text-xl font-extrabold">{last.leave.student}</p>
                <p className="text-sm text-on-surface-variant">
                  {last.leave.admissionNo} · {last.leave.hostel}
                </p>
                <p className="mt-1 text-lg font-bold">{last.action === "out" ? "GOING OUT" : last.leave.late ? "BACK — LATE" : "BACK"}</p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              {when(last.leave.fromAt)} → {when(last.leave.toAt)} · {last.leave.reason}
            </p>
            {last.leave.escort && <p className="text-sm">With: {last.leave.escort}</p>}
          </Card>
        )}
      </div>
      <Card padding="none">
        <p className="border-b border-outline-variant/15 px-5 py-3 font-bold">Boarders out now ({out.data?.length ?? 0})</p>
        {(out.data ?? []).map((l) => {
          const overdue = new Date(l.toAt) < new Date();
          return (
            <div key={l.id} className="flex items-center gap-3 border-b border-outline-variant/10 px-5 py-2">
              <AuthedPhoto path={l.photo} className="h-9 w-9 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{l.student}</p>
                <p className="text-xs text-on-surface-variant">
                  {l.hostel} · back by {when(l.toAt)}
                </p>
              </div>
              {overdue && <Pill tone="danger">Overdue</Pill>}
            </div>
          );
        })}
        {out.data && !out.data.length && <p className="px-5 py-6 text-center text-sm text-on-surface-variant">No one is out.</p>}
      </Card>
    </div>
  );
}

export default function HostelGatePage() {
  return (
    <RequirePermission permission="hostel.gate">
      <PageHeader title="Hostel Gate" description="Scan a boarder’s leave pass when they go out and again when they come back. Parents are told both times; a late return is flagged." />
      <Gate />
    </RequirePermission>
  );
}
