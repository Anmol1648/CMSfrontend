"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Design, DesignInput, idCardsApi, Options } from "@/lib/api/idcards";
import { IdCardSide, sampleHolder } from "@/components/idcards/IdCard";

const BLANK: DesignInput = { name: "", kind: "student", orientation: "portrait", color: "#1A365D", textColor: "#FFFFFF", fields: ["photo", "name", "class", "admissionNo", "bloodGroup", "phone", "validUntil"], code: "qr", back: true, backFields: ["address", "emergency", "schoolAddress"], backText: "If found, please return to the school office.", signatureFileId: null, signatureLabel: "Principal", isDefault: false, isActive: true };

function FieldPicker({ label, all, value, onChange }: { label: string; all: { key: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {all.map((f) => (
          <Checkbox key={f.key} checked={value.includes(f.key)} onChange={(c) => onChange(c ? all.map((x) => x.key).filter((k) => k === f.key || value.includes(k)) : value.filter((k) => k !== f.key))} label={f.label} />
        ))}
      </div>
    </div>
  );
}

function Editor({ design, options, onClose }: { design: Design | null; options: Options; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [f, setF] = useState<DesignInput>(() => (design ? { ...BLANK, ...design } : BLANK));
  const [sigPreview, setSigPreview] = useState<string | null>(design?.signatureUrl ?? null);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof DesignInput>(k: K, v: DesignInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const all = options.fields[f.kind];
  const save = async () => {
    setErr(null);
    try {
      const { name, kind, orientation, color, textColor, fields, code, back, backFields, backText, signatureFileId, signatureLabel, isDefault, isActive } = f;
      await idCardsApi.saveDesign(design?.id ?? null, { name, kind, orientation, color, textColor, fields, code, back, backFields, backText, signatureFileId, signatureLabel, isDefault, isActive });
      queryClient.invalidateQueries({ queryKey: ["idcards"] });
      showToast("Saved", "success");
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const preview = { ...f, signatureUrl: sigPreview };
  return (
    <Modal isOpen onClose={onClose} title={design ? `Change “${design.name}”` : "New card design"} width="max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {err && <FormAlert>{err}</FormAlert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={80} placeholder="Student card 2026-27" />
            <Select label="For" value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v as DesignInput["kind"], fields: x.fields.filter((k) => options.fields[v as DesignInput["kind"]].some((y) => y.key === k)), backFields: x.backFields.filter((k) => options.fields[v as DesignInput["kind"]].some((y) => y.key === k)) }))} options={[{ value: "student", label: "Students" }, { value: "staff", label: "Staff" }]} />
            <Select label="Layout" value={f.orientation} onChange={(v) => set("orientation", v as DesignInput["orientation"])} options={[{ value: "portrait", label: "Portrait (upright)" }, { value: "landscape", label: "Landscape (wide)" }]} />
            <Select label="Code on the card" value={f.code} onChange={(v) => set("code", v as DesignInput["code"])} options={[{ value: "qr", label: "QR code (scan with any phone)" }, { value: "barcode", label: "Barcode" }, { value: "none", label: "None" }]} />
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="color" value={f.color} onChange={(e) => set("color", e.target.value.toUpperCase())} className="h-10 w-14 rounded" /> Header colour
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="color" value={f.textColor} onChange={(e) => set("textColor", e.target.value.toUpperCase())} className="h-10 w-14 rounded" /> Text on the header
            </label>
          </div>
          <FieldPicker label="Front of the card" all={all} value={f.fields} onChange={(v) => set("fields", v)} />
          <Checkbox checked={f.back} onChange={(c) => set("back", c)} label="The card has a back side" />
          {f.back && (
            <>
              <FieldPicker label="Back of the card" all={all.filter((x) => x.key !== "photo" && x.key !== "name")} value={f.backFields} onChange={(v) => set("backFields", v)} />
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Text on the back</span>
                <textarea value={f.backText ?? ""} onChange={(e) => set("backText", e.target.value || null)} rows={3} maxLength={500} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 items-end">
                <Input label="Signature line" value={f.signatureLabel ?? ""} onChange={(e) => set("signatureLabel", e.target.value || null)} maxLength={60} placeholder="Principal" />
                <div className="flex items-center gap-2 pb-1">
                  <Button variant="secondary" onClick={() => file.current?.click()}>
                    <span className="material-symbols-outlined text-lg">draw</span> {f.signatureFileId ? "Change signature" : "Upload signature"}
                  </Button>
                  {f.signatureFileId && (
                    <button type="button" className="text-xs font-bold text-error" onClick={() => { set("signatureFileId", null); setSigPreview(null); }}>
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={file}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const x = e.target.files?.[0];
                    e.target.value = "";
                    if (!x) return;
                    try {
                      const r = await idCardsApi.uploadImage(x);
                      set("signatureFileId", r.id);
                      setSigPreview(idCardsApi.imagePath(r.id));
                    } catch (er) {
                      showToast(errorMessage(er), "error");
                    }
                  }}
                />
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-6">
            <Checkbox checked={f.isDefault} onChange={(c) => set("isDefault", c)} label={`The usual design for ${f.kind === "staff" ? "staff" : "students"}`} hint="Chosen first when printing, and shown on My ID Card." />
            <Checkbox checked={f.isActive} onChange={(c) => set("isActive", c)} label="In use" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={f.name.trim().length < 2}>
              Save
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Preview (real size)</p>
          <div className={f.orientation === "portrait" ? "flex gap-3" : "space-y-3"}>
            <IdCardSide design={preview} holder={sampleHolder(f.kind)} school={options.school} side="front" />
            {f.back && <IdCardSide design={preview} holder={sampleHolder(f.kind)} school={options.school} side="back" />}
          </div>
          <p className="text-xs text-on-surface-variant max-w-xs">Logo and school name come from School Profile. A sample person is shown; long fields wrap.</p>
        </div>
      </div>
    </Modal>
  );
}

function Designs() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const o = useQuery({ queryKey: ["idcards", "options"], queryFn: idCardsApi.options });
  const q = useQuery({ queryKey: ["idcards", "designs"], queryFn: idCardsApi.designs });
  const [edit, setEdit] = useState<Design | null | undefined>(undefined);
  if (q.isLoading || o.isLoading) return <PageLoader />;
  if (q.error || o.error) return <FormAlert>{errorMessage(q.error ?? o.error)}</FormAlert>;
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["idcards"] });
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEdit(null)}>
          <span className="material-symbols-outlined text-lg">add</span> New design
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {q.data!.map((d) => (
          <Card key={d.id} padding="sm">
            <div className="flex items-start gap-2 mb-3">
              <div className="flex-1">
                <p className="font-bold">{d.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {d.kind === "staff" ? "Staff" : "Students"} · {d.orientation} · {d.cards ?? 0} card(s)
                </p>
              </div>
              {d.isDefault && <Pill tone="primary">Usual</Pill>}
              {!d.isActive && <Pill>Not in use</Pill>}
            </div>
            <div className="flex justify-center rounded-xl bg-surface-container-low p-3 overflow-hidden">
              <IdCardSide design={d} holder={sampleHolder(d.kind)} school={o.data!.school} side="front" />
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="tertiary" onClick={() => act(() => idCardsApi.copyDesign(d.id), "Copied")}>
                Copy
              </Button>
              <Button variant="tertiary" onClick={async () => (await confirm({ title: `Remove “${d.name}”?`, message: d.cards ? "Cards were printed with it, so it is only marked not in use." : undefined, confirmLabel: "Remove", danger: true })) && act(() => idCardsApi.deleteDesign(d.id), "Removed")}>
                Remove
              </Button>
              <Button variant="secondary" onClick={() => setEdit(d)}>
                Change
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {edit !== undefined && <Editor design={edit} options={o.data!} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

export default function IdCardDesignsPage() {
  return (
    <RequirePermission permission="idcard.design">
      <PageHeader title="Card Designs" description="What each ID card shows on the front and back, its colours and the code. Copy a design to start a new one." />
      <Designs />
    </RequirePermission>
  );
}
