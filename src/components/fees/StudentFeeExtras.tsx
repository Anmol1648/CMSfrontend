"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { useToast } from "@/components/ui/ToastProvider";
import { feesApi, rupees, StudentFees } from "@/lib/api/fees";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useConfirm } from "@/components/ui/ConfirmProvider";

/** A student's concessions and one-off changes (waive a fine, an extra charge), beside their dues. */
export function StudentFeeExtras({ fees, onChange, canChange }: { fees: StudentFees; onChange: (f: StudentFees) => void; canChange: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const concessions = useQuery({ queryKey: ["fee-concessions", fees.academicYearId], queryFn: () => feesApi.concessions(fees.academicYearId), enabled: canChange });
  const config = useQuery({ queryKey: ["fee-config"], queryFn: feesApi.config });
  const [give, setGive] = useState("");
  const [giveNote, setGiveNote] = useState("");
  const [inst, setInst] = useState("");
  const [head, setHead] = useState("fine");
  const [kind, setKind] = useState<"waive" | "charge">("waive");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const manual = (concessions.data ?? []).filter((c) => !c.automatic && c.isActive && !fees.concessions.some((g) => g.concession.id === c.id));
  const instalments = fees.dues?.instalments ?? [];

  const run = async (fn: () => Promise<StudentFees>, ok: string) => {
    setBusy(true);
    setErrors({});
    try {
      onChange(await fn());
      showToast(ok, "success");
      return true;
    } catch (err) {
      showToast(errorMessage(err), "error");
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Concessions</h3>
        {fees.dues?.concessions.filter((c) => c.automatic).map((c) => (
          <p key={c.id} className="text-sm py-1">
            {c.name} <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60">automatic</span>
          </p>
        ))}
        {fees.concessions.map((g) => (
          <div key={g.id} className="flex flex-wrap items-start justify-between gap-3 py-1.5 border-t border-outline-variant/10">
            <div>
              <p className="text-sm font-semibold">{g.concession.name}</p>
              {g.note && <p className="text-xs text-on-surface-variant">{g.note}</p>}
            </div>
            {canChange && (
              <button type="button" disabled={busy} onClick={async () => (await confirm({ title: `Take "${g.concession.name}" off this student?`, message: "Their dues go back up by the concession.", confirmLabel: "Remove", danger: true })) && run(() => feesApi.removeConcession(fees.student.id, g.id), "Concession taken off")} className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error">
                Remove
              </button>
            )}
          </div>
        ))}
        {!fees.concessions.length && !fees.dues?.concessions.some((c) => c.automatic) && <p className="text-sm text-on-surface-variant/70">None.</p>}
        {canChange && manual.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-outline-variant/20 pt-4">
            <Select label="Give a concession" value={give} onChange={setGive} options={[{ value: "", label: "Choose…" }, ...manual.map((c) => ({ value: c.id, label: c.name }))]} />
            <Input label="Why (e.g. father in KVS)" value={giveNote} onChange={(e) => setGiveNote(e.target.value)} maxLength={300} />
            <div className="flex justify-end">
              <Button
                variant="secondary"
                disabled={!give || busy}
                onClick={async () => {
                  if (await run(() => feesApi.giveConcession(fees.student.id, { concessionId: give, note: giveNote.trim() || null }), "Concession given")) {
                    setGive("");
                    setGiveNote("");
                  }
                }}
              >
                Give
              </Button>
            </div>
          </div>
        )}
      </Card>

      {canChange && instalments.length > 0 && (
        <Card>
          <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Waive or charge</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="What" value={kind} onChange={(v) => setKind(v as "waive" | "charge")} options={[{ value: "waive", label: "Waive (−)" }, { value: "charge", label: "Extra charge (+)" }]} />
              <Select label="Instalment" value={inst} onChange={setInst} options={[{ value: "", label: "Choose…" }, ...instalments.map((i) => ({ value: i.id, label: i.name }))]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Head"
                value={head}
                onChange={setHead}
                options={[...(kind === "waive" ? [{ value: "fine", label: "Late fine" }] : []), ...(config.data?.heads ?? []).map((h) => ({ value: h.id, label: h.name }))]}
              />
              <Input label="Amount (₹)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
            </div>
            <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} maxLength={300} />
            <div className="flex justify-end">
              <Button
                variant="secondary"
                disabled={busy || !inst || !Number(amount) || reason.trim().length < 3 || (kind === "charge" && head === "fine")}
                onClick={async () => {
                  const n = Math.abs(Math.round(Number(amount)));
                  if (await run(() => feesApi.addAdjustment(fees.student.id, { instalmentId: inst, feeHeadId: head, amount: kind === "waive" ? -n : n, reason: reason.trim() }), "Saved")) {
                    setAmount("");
                    setReason("");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
          {fees.adjustments.length > 0 && (
            <div className="mt-4 border-t border-outline-variant/20 pt-3 space-y-2">
              {fees.adjustments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold">
                      {a.instalment} · {a.head}: <span className={a.amount < 0 ? "text-emerald-700" : "text-error"}>{a.amount < 0 ? `−${rupees(-a.amount)}` : `+${rupees(a.amount)}`}</span>
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {a.reason}
                      {a.by ? ` · ${a.by}` : ""}
                    </p>
                  </div>
                  <button type="button" disabled={busy} onClick={async () => (await confirm({ title: "Undo this change?", message: "The waiver or extra charge is removed from the dues.", confirmLabel: "Undo", danger: true })) && run(() => feesApi.removeAdjustment(fees.student.id, a.id), "Removed")} className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error">
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {!canChange && <FormAlert tone="info">Concessions and waivers need the &quot;Give concessions&quot; permission.</FormAlert>}
    </div>
  );
}
