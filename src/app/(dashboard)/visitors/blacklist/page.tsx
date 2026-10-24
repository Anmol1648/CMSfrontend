"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { visitorsApi } from "@/lib/api/visitors";

function Blacklist() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["visitors", "blacklist"], queryFn: visitorsApi.blacklist });
  const [v, setV] = useState({ name: "", mobile: "", reason: "" });
  const add = async () => {
    try {
      await visitorsApi.setBlacklist({ name: v.name.trim(), mobile: v.mobile.trim(), blacklisted: true, reason: v.reason.trim() });
      setV({ name: "", mobile: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      showToast("Added: the gate is warned when this mobile number comes", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async (id: string, name: string) => {
    if (!(await confirm({ title: `Take ${name} off the blacklist?`, confirmLabel: "Take off" }))) return;
    try {
      await visitorsApi.setBlacklist({ visitorId: id, blacklisted: false });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Add someone</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <Input label="Mobile" value={v.mobile} onChange={(e) => setV({ ...v, mobile: e.target.value })} inputMode="tel" />
          <Input label="Why" value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add} disabled={!v.name.trim() || !v.mobile.trim() || !v.reason.trim()}>
            Blacklist
          </Button>
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : !q.data?.length ? (
        <FormAlert tone="info">No one is blacklisted.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/10">
            {q.data.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <AuthedPhoto path={b.photoFileId ? visitorsApi.visitorPhoto(b.id) : null} className="h-11 w-11 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {b.name} · {b.mobile}
                  </p>
                  <p className="text-xs text-error">{b.reason}</p>
                </div>
                <Button variant="tertiary" onClick={() => remove(b.id, b.name)}>
                  Take off
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function BlacklistPage() {
  return (
    <RequirePermission permission="visitor.manage">
      <PageHeader title="Blacklist" description="People not allowed in: the gate is warned (and can’t give a pass) when their mobile number is typed." />
      <Blacklist />
    </RequirePermission>
  );
}
