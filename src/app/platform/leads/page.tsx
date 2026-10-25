"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { Lead, LeadStatus, platformApi, when } from "@/lib/api/platform";

const STATUS: { value: LeadStatus; label: string; tone: "warning" | "primary" | "success" | "danger" | "neutral" }[] = [
  { value: "new", label: "New", tone: "warning" },
  { value: "contacted", label: "Contacted", tone: "primary" },
  { value: "demo", label: "Demo done", tone: "primary" },
  { value: "won", label: "Won", tone: "success" },
  { value: "lost", label: "Lost", tone: "neutral" },
];

function Row({ l, onSaved }: { l: Lead; onSaved: () => void }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<LeadStatus>(l.status);
  const [notes, setNotes] = useState(l.notes ?? "");
  const dirty = status !== l.status || notes !== (l.notes ?? "");
  const st = STATUS.find((s) => s.value === l.status)!;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold">
            {l.school}
            {l.city ? <span className="font-normal text-on-surface-variant">, {l.city}</span> : null}
          </p>
          <p className="text-sm">
            {l.name} ·{" "}
            <a className="font-semibold text-primary" href={`tel:${l.phone}`}>
              {l.phone}
            </a>{" "}
            ·{" "}
            <a className="font-semibold text-primary" href={`https://wa.me/${l.phone.replace(/[^0-9]/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {l.email && (
              <>
                {" · "}
                <a className="text-primary" href={`mailto:${l.email}`}>
                  {l.email}
                </a>
              </>
            )}
          </p>
          <p className="text-xs text-on-surface-variant">
            {when(l.createdAt)}
            {l.students ? ` · ${l.students} students` : ""}
            {l.board ? ` · ${l.board}` : ""}
            {l.preferredTime ? ` · call: ${l.preferredTime}` : ""}
            {l.language === "hi" ? " · Hindi site" : ""}
          </p>
        </div>
        <Pill tone={st.tone}>{st.label}</Pill>
      </div>
      {l.message && <p className="rounded-xl bg-surface-container-low px-3 py-2 text-sm whitespace-pre-wrap">{l.message}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <Select className="w-40" label="Status" value={status} onChange={(v) => setStatus(v as LeadStatus)} options={STATUS.map((s) => ({ value: s.value, label: s.label }))} />
        <label className="flex min-w-[14rem] flex-1 flex-col gap-2">
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} className="rounded-xl border border-outline-variant/40 bg-transparent px-3 py-2 text-sm" placeholder="Called on…, demo fixed for…" />
        </label>
        <Button
          disabled={!dirty}
          onClick={async () => {
            try {
              await platformApi.updateLead(l.id, status, notes || null);
              onSaved();
              showToast("Saved", "success");
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<LeadStatus | "">("");
  const q = useQuery({ queryKey: ["platform", "leads", status], queryFn: () => platformApi.leads(status) });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const counts = q.data!.counts;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Leads</h1>
          <p className="text-sm text-on-surface-variant">Demo requests from the website. Each one is also emailed to you.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {[{ value: "" as const, label: "All" }, ...STATUS].map((s) => (
            <button key={s.value} type="button" onClick={() => setStatus(s.value)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${status === s.value ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {s.label}
              {s.value && counts[s.value] ? ` (${counts[s.value]})` : ""}
            </button>
          ))}
        </div>
      </div>
      {q.data!.rows.map((l) => (
        <Row key={`${l.id}-${l.status}-${l.notes ?? ""}`} l={l} onSaved={() => qc.invalidateQueries({ queryKey: ["platform", "leads"] })} />
      ))}
      {!q.data!.rows.length && <FormAlert tone="info">No demo requests{status ? " with this status" : " yet"}.</FormAlert>}
    </div>
  );
}
