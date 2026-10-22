"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { todayIST } from "@/lib/api/attendance";
import { staffApi } from "@/lib/api/staff";
import { ApplyInput, dayCount, leaveApi } from "@/lib/api/leave";

interface TypeChoice {
  id: string;
  name: string;
  halfDay: boolean;
  certificateAfter: number | null;
  rules?: string[];
}

/**
 * Asking for leave (My Leave), or the office recording it for someone (approved straight away).
 * The days, the balance and any rule broken are shown as the form is filled in.
 */
export function ApplyLeave({ types, forSomeone = false, onClose, onDone }: { types: TypeChoice[]; forSomeone?: boolean; onClose: () => void; onDone: () => void }) {
  const { showToast } = useToast();
  const [staffId, setStaffId] = useState("");
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(todayIST());
  const [half, setHalf] = useState<"" | "first" | "second">("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const type = types.find((t) => t.id === typeId);
  const staff = useQuery({ queryKey: ["staff-options"], queryFn: () => staffApi.options(), enabled: forSomeone });

  const input: ApplyInput = { ...(forSomeone && staffId ? { staffId } : {}), typeId, from, to: half ? from : to, half: half || null, reason: reason.trim() || "preview", attachmentId: attachment?.id ?? null };
  const ready = !!typeId && !!from && !!to && to >= from && (!forSomeone || !!staffId);
  const preview = useQuery({ queryKey: ["leave-preview", { ...input, reason: "" }], queryFn: () => leaveApi.preview(input), enabled: ready });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setAttachment(await leaveApi.upload(file));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await leaveApi.apply({ ...input, reason: reason.trim() });
      showToast(forSomeone ? "Leave recorded and approved" : "Leave asked for. You'll see here when it is approved.", "success");
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const p = preview.data;
  return (
    <Modal isOpen onClose={onClose} title={forSomeone ? "Record leave for a staff member" : "Ask for leave"}>
      <div className="space-y-4">
        {forSomeone && (
          <Select
            label="Staff member"
            value={staffId}
            onChange={setStaffId}
            options={[{ value: "", label: staff.isLoading ? "Loading…" : "Choose…" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ""}${s.designation ? ` · ${s.designation}` : ""}` }))]}
          />
        )}
        <Select label="Leave" value={typeId} onChange={setTypeId} options={types.map((t) => ({ value: t.id, label: t.name }))} />
        {!!type?.rules?.length && <p className="text-xs text-on-surface-variant/70 -mt-2 ml-1">{type.rules.join(" · ")}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Input label={half ? "Date" : "From"} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          {!half && <Input label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />}
        </div>
        {type?.halfDay && (
          <Select
            label="Half day?"
            value={half}
            onChange={(v) => setHalf(v as "" | "first" | "second")}
            options={[
              { value: "", label: "No, full days" },
              { value: "first", label: "First half (morning)" },
              { value: "second", label: "Second half (afternoon)" },
            ]}
          />
        )}
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Fever; family function" />
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">
            Certificate or letter {type?.certificateAfter != null ? `(needed for more than ${dayCount(type.certificateAfter)})` : "(optional)"}
          </span>
          <div className="mt-2 flex items-center gap-3">
            <label className="cursor-pointer rounded-xl bg-surface-container-low px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80">
              {uploading ? "Uploading…" : attachment ? "Change" : "Choose file"}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {attachment && <span className="text-sm truncate">{attachment.name}</span>}
          </div>
        </div>
        {ready && p && (
          <FormAlert tone={p.ok ? (p.lwpDays ? "warning" : "info") : "error"}>
            {p.ok ? (
              <>
                This takes <b>{dayCount(p.days ?? 0)}</b>
                {p.available != null && <> · you have {dayCount(Math.max(0, p.available))} left</>}
                {p.lwpDays > 0 && <> · {dayCount(p.lwpDays)} beyond the balance will be without pay</>}.
              </>
            ) : (
              p.message
            )}
          </FormAlert>
        )}
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!ready || reason.trim().length < 3 || uploading || (p ? !p.ok : false)}>
            {forSomeone ? "Record leave" : "Ask for leave"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
