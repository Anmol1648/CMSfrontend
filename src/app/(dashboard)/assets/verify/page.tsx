"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { assetsApi, day } from "@/lib/api/assets";
import { useAssetOptions } from "@/components/assets/AssetParts";
import { CameraScan } from "@/components/library/CameraScan";
import { cn } from "@/lib/utils";

function Run({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const o = useAssetOptions();
  const q = useQuery({ queryKey: ["assets", "verification", id], queryFn: () => assetsApi.verification(id) });
  const [here, setHere] = useState("");
  const [code, setCode] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [move, setMove] = useState(true);
  const reload = () => queryClient.invalidateQueries({ queryKey: ["assets", "verification", id] });
  const found = async (input: { assetId?: string; code?: string }, yes = true) => {
    try {
      const r = await assetsApi.markFound(id, { ...input, roomId: here || null, found: yes });
      if (yes) showToast(r.misplaced ? `${r.name} (${r.code}) found here, but the register has it in another room` : `${r.name} (${r.code}) ✓`, r.misplaced ? "error" : "success");
      reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const v = q.data!;
  const open = v.status === "open";
  const misplaced = v.rooms.flatMap((r) => r.assets).filter((a) => a.foundIn).length;
  const rooms = v.rooms.filter((r) => !here || r.roomId === here);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          <span className="material-symbols-outlined text-lg">arrow_back</span> All verifications
        </Button>
        <p className="flex-1 font-extrabold">{v.name}</p>
        <Pill tone={open ? "warning" : "neutral"}>{open ? "Open" : "Closed"}</Pill>
        <span className="text-sm">
          <b>{v.foundCount}</b> of {v.expected} found{misplaced ? ` · ${misplaced} in another room` : ""}
        </span>
      </div>
      {open && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <Select label="I am checking the room" value={here} onChange={setHere} options={[{ value: "", label: "All rooms (choose one to scan)" }, ...(o.data?.rooms ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
            <form
              className="flex gap-2 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) void found({ code: code.trim() }).then(() => setCode(""));
              }}
            >
              <Input label="Type a code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AST-00012" />
              <Button type="submit" variant="secondary" disabled={!code.trim()}>
                Found
              </Button>
            </form>
            <CameraScan onScan={(c) => found({ code: c })} label="Scan labels" square />
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">Choose the room you are in, then scan each label (or tick the list). An asset found in a different room from the register is shown as misplaced.</p>
        </Card>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Checkbox checked={onlyMissing} onChange={setOnlyMissing} label="Show only what is not found yet" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rooms.map((r) => {
          const list = r.assets.filter((a) => !onlyMissing || !a.found);
          const done = r.assets.filter((a) => a.found).length;
          if (!list.length) return null;
          return (
            <Card key={r.roomId ?? "none"} padding="sm">
              <div className="flex items-center gap-2 mb-2">
                <p className="flex-1 font-bold">{r.room}</p>
                <Pill tone={done === r.assets.length ? "success" : "warning"}>
                  {done} / {r.assets.length}
                </Pill>
              </div>
              <ul className="space-y-1">
                {list.map((a) => (
                  <li key={a.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1 text-sm", a.found && "bg-emerald-50")}>
                    <input type="checkbox" className="accent-[#1A365D]" checked={a.found} disabled={!open} onChange={(e) => found({ assetId: a.id }, e.target.checked)} aria-label={`Found ${a.code}`} />
                    <span className="font-mono text-xs w-20 shrink-0">{a.code}</span>
                    <span className="flex-1 truncate">
                      {a.name}
                      {a.quantity > 1 ? ` × ${a.quantity}` : ""}
                    </span>
                    {a.foundIn && <Pill tone="warning">In {a.foundIn}</Pill>}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      {open && (
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <Checkbox checked={move} onChange={setMove} label="Move assets found in another room to that room in the register" />
            </div>
            <Button
              onClick={async () => {
                if (!(await confirm({ title: "Close this verification?", message: `${v.expected - v.foundCount} asset(s) were not found. They stay in the register; the Asset Register lets you write lost ones off.`, confirmLabel: "Close" }))) return;
                try {
                  await assetsApi.closeVerification(id, move);
                  queryClient.invalidateQueries({ queryKey: ["assets"] });
                  showToast("Closed", "success");
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Close the verification
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Verify() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["assets", "verifications"], queryFn: assetsApi.verifications });
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  if (open) return <Run id={open} onBack={() => setOpen(null)} />;
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const running = q.data!.find((v) => v.status === "open");
  return (
    <div className="space-y-4 max-w-3xl">
      {!running && (
        <Card>
          <div className="flex flex-wrap gap-3 items-end">
            <Input label="Start a verification" value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual verification 2026-27" className="flex-1" maxLength={100} />
            <Button
              onClick={async () => {
                try {
                  const v = await assetsApi.startVerification(name.trim());
                  queryClient.invalidateQueries({ queryKey: ["assets", "verifications"] });
                  setOpen(v.id);
                } catch (e) {
                  showToast(errorMessage(e), "error");
                }
              }}
            >
              Start
            </Button>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">Go room by room with a phone: scan each asset’s QR label (or tick it). At the end, what was not found is listed as missing.</p>
        </Card>
      )}
      <Card padding="none">
        <ul className="divide-y divide-outline-variant/20">
          {q.data!.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setOpen(v.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-container-low">
                <span className="flex-1">
                  <b>{v.name}</b>
                  <span className="block text-xs text-on-surface-variant">
                    Started {day(v.startedAt)}
                    {v.closedAt ? ` · closed ${day(v.closedAt)}` : ""} · {v.found} found
                  </span>
                </span>
                <Pill tone={v.status === "open" ? "warning" : "neutral"}>{v.status === "open" ? "Open" : "Closed"}</Pill>
              </button>
            </li>
          ))}
          {!q.data!.length && <li className="px-5 py-4 text-sm text-on-surface-variant">No verification yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

export default function AssetVerifyPage() {
  return (
    <RequirePermission permission="asset.manage">
      <PageHeader title="Asset Verification" description="Physical check of the register, room by room, by scanning the QR labels." />
      <Verify />
    </RequirePermission>
  );
}
