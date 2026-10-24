"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { errorMessage } from "@/lib/api/client";
import { platformApi, PlatformRole, Staff, when } from "@/lib/api/platform";
import { usePlatformUser } from "@/components/platform/PlatformContext";

export default function StaffPage() {
  const { user } = usePlatformUser();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["platform", "staff"], queryFn: platformApi.staff, enabled: user.role === "owner" });
  const [f, setF] = useState({ email: "", name: "", role: "support" as PlatformRole });
  const [pw, setPw] = useState<{ email: string; password: string } | null>(null);
  if (user.role !== "owner") return <FormAlert tone="info">Only platform owners manage console users.</FormAlert>;
  if (q.isLoading) return <PageLoader />;
  const save = async (s: Staff, change: Partial<Staff>) => {
    try {
      await platformApi.saveStaff(s.id, { email: s.email, name: s.name, role: s.role, status: s.status, ...change });
      qc.invalidateQueries({ queryKey: ["platform", "staff"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Console users</h1>
        <p className="text-sm text-on-surface-variant">Owners can do everything. Support can see schools and reset a school admin’s password, but not add, change, suspend or delete schools.</p>
      </div>
      <Card className="grid items-end gap-3 sm:grid-cols-4">
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Select label="Role" value={f.role} onChange={(v) => setF({ ...f, role: v as PlatformRole })} options={[{ value: "support", label: "Support" }, { value: "owner", label: "Owner" }]} />
        <Button
          disabled={f.name.trim().length < 2 || !f.email.includes("@")}
          onClick={async () => {
            try {
              const r = await platformApi.saveStaff(null, { ...f, status: "active" });
              setPw({ email: f.email, password: r.password ?? "" });
              setF({ email: "", name: "", role: "support" });
              qc.invalidateQueries({ queryKey: ["platform", "staff"] });
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Add
        </Button>
      </Card>
      <Card padding="none">
        {(q.data ?? []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 px-5 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {s.name} <span className="text-sm font-normal text-on-surface-variant">{s.email}</span>
              </p>
              <p className="text-xs text-on-surface-variant">
                last sign-in {when(s.lastLoginAt)} · {s.mfaEnabled ? "authenticator on" : "authenticator not set up yet"}
              </p>
            </div>
            {s.status === "disabled" && <Pill tone="danger">Switched off</Pill>}
            <Select className="w-32" value={s.role} onChange={(v) => save(s, { role: v as PlatformRole })} options={[{ value: "support", label: "Support" }, { value: "owner", label: "Owner" }]} />
            <Button variant="tertiary" onClick={() => save(s, { status: s.status === "active" ? "disabled" : "active" })}>
              {s.status === "active" ? "Switch off" : "Switch on"}
            </Button>
            <Button
              variant="tertiary"
              onClick={async () => {
                if (!(await confirm({ title: `Reset ${s.name}?`, message: "A new one-time password, and the authenticator is set up again at the next sign-in.", confirmLabel: "Reset" }))) return;
                try {
                  const r = await platformApi.resetStaff(s.id);
                  setPw({ email: s.email, password: r.password });
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Reset
            </Button>
          </div>
        ))}
      </Card>
      {pw && (
        <Modal isOpen onClose={() => setPw(null)} title="One-time password">
          <div className="space-y-2 text-sm">
            <p>
              {pw.email}: <b className="font-mono">{pw.password}</b>
            </p>
            <FormAlert tone="info">Shown only now. At the first sign-in they choose a password and set up an authenticator app.</FormAlert>
            <div className="flex justify-end">
              <Button onClick={() => setPw(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
