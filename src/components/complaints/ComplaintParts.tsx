"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ApiError, authedImageUrl, errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { Complaint, complaintsApi, PRIORITY, RaiseInput, STATUS, when } from "@/lib/api/complaints";
import { cn } from "@/lib/utils";
import { CustomFieldsForm, CustomValuesInline, useFormExtras } from "@/components/forms/CustomFields";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

/** Picks files to attach (uploaded at once). */
function FilePicker({ files, onChange, max }: { files: { id: string; name: string }[]; onChange: (f: { id: string; name: string }[]) => void; max: number }) {
  const { showToast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!max) return null;
  const upload = async (file: File) => {
    setBusy(true);
    try {
      onChange([...files, await complaintsApi.upload(file)]);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {files.map((f) => (
        <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold pl-3 pr-1 py-1">
          {f.name}
          <button type="button" onClick={() => onChange(files.filter((x) => x.id !== f.id))} aria-label="Remove" className="rounded-full p-0.5 hover:bg-primary/20">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </span>
      ))}
      <input ref={ref} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      {files.length < max && (
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="inline-flex items-center gap-1 text-sm font-bold text-primary disabled:opacity-50">
          <span className="material-symbols-outlined text-lg">attach_file</span>
          {busy ? "Uploading…" : "Attach a photo or PDF"}
        </button>
      )}
    </div>
  );
}

function FileLinks({ complaintId, ids }: { complaintId: string; ids: string[] }) {
  const { showToast } = useToast();
  if (!ids.length) return null;
  const open = async (fileId: string) => {
    try {
      window.open(await authedImageUrl(complaintsApi.filePath(complaintId, fileId)), "_blank", "noopener");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {ids.map((f, i) => (
        <button key={f} type="button" onClick={() => open(f)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">
          <span className="material-symbols-outlined text-sm">attach_file</span> File {i + 1}
        </button>
      ))}
    </div>
  );
}

/** Raising a complaint (also at the office for a walk-in or a call). */
export function RaiseForm({ onClose, office = false }: { onClose: (id?: string) => void; office?: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const opts = useQuery({ queryKey: ["complaints", "options"], queryFn: complaintsApi.options });
  const extras = useFormExtras("complaint");
  const [v, setV] = useState<RaiseInput>({ categoryId: "", subject: "", details: "", priority: "normal", anonymous: false, studentId: null, attachmentIds: [], contactName: null, contactMobile: null });
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (p: Partial<RaiseInput>) => setV((x) => ({ ...x, ...p }));
  const cat = opts.data?.categories.find((c) => c.id === v.categoryId);
  const save = async () => {
    setError(null);
    try {
      const r = await complaintsApi.raise({ ...v, anonymous: !!cat?.anonymous && v.anonymous, attachmentIds: files.map((f) => f.id), ...(office ? {} : { contactName: null, contactMobile: null }) });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      showToast(`Complaint ${r.ticketNo} raised${r.handler ? `: ${r.handler} will look into it` : ""}`, "success");
      onClose(r.id);
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={() => onClose()} title={office ? "Take a complaint (walk-in / call)" : "Raise a complaint"} width="max-w-2xl">
      {!opts.data ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {office && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name of the person" value={v.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value || null })} />
              <Input label="Their mobile" value={v.contactMobile ?? ""} onChange={(e) => set({ contactMobile: e.target.value || null })} inputMode="tel" />
            </div>
          )}
          <Select label="About" value={v.categoryId} onChange={(c) => set({ categoryId: c, anonymous: false })} options={[{ value: "", label: "Choose…" }, ...opts.data.categories.map((c) => ({ value: c.id, label: c.name }))]} />
          {cat?.urgent && <FormAlert tone="warning">This is treated as urgent: the principal is told at once.</FormAlert>}
          {!office && opts.data.students.length > 0 && <Select label="Child (if it is about them)" value={v.studentId ?? ""} onChange={(s) => set({ studentId: s || null })} options={[{ value: "", label: "Not about a child" }, ...opts.data.students.map((s) => ({ value: s.id, label: s.name }))]} />}
          <Input label="Subject" value={v.subject} onChange={(e) => set({ subject: e.target.value })} error={fields.subject} maxLength={150} placeholder="Bus comes late every day" />
          <label className="flex flex-col gap-2">
            <span className={label}>Details</span>
            <textarea value={v.details} onChange={(e) => set({ details: e.target.value })} rows={5} maxLength={4000} placeholder="What happened, when, where…" className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
            {fields.details && <span className="text-xs text-error">{fields.details}</span>}
          </label>
          {!!extras.data?.custom.length && <CustomFieldsForm fields={extras.data.custom} values={v.custom ?? {}} onChange={(c) => set({ custom: c })} errors={fields} />}
          <FilePicker files={files} onChange={setFiles} max={opts.data.maxFiles} />
          <div className="flex flex-wrap gap-6">
            {!cat?.urgent && <Checkbox checked={v.priority === "high"} onChange={(h) => set({ priority: h ? "high" : "normal" })} label="It is serious (high priority)" />}
            {cat?.anonymous && !office && <Checkbox checked={v.anonymous} onChange={(a) => set({ anonymous: a })} label="Raise it anonymously" hint="The school won’t see your name; you still follow it here." />}
          </div>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!v.categoryId || (office && !v.contactName)}>
              Raise
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`} className={cn("material-symbols-outlined text-3xl", n <= value ? "text-amber-500" : "text-on-surface-variant/30")} style={{ fontVariationSettings: n <= value ? "'FILL' 1" : undefined }}>
          star
        </button>
      ))}
    </div>
  );
}

/** One complaint: details, the thread, and what this person can do (reply, note, assign, resolve, accept, reopen, rate). */
export function ComplaintDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["complaints", "one", id], queryFn: () => complaintsApi.get(id) });
  const c = q.data;
  const snippets = useQuery({ queryKey: ["master-options", "complaint_snippet"], queryFn: () => mastersApi.options("complaint_snippet"), enabled: !!c?.can.note, staleTime: 5 * 60_000 });
  const handlers = useQuery({ queryKey: ["complaints", "handlers"], queryFn: complaintsApi.handlers, enabled: !!c?.can.assign });
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [mode, setMode] = useState<"resolve" | "reopen" | "accept" | "rate" | null>(null);
  const [extra, setExtra] = useState("");
  const [stars, setStars] = useState(0);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      showToast(done, "success");
      return true;
    } catch (err) {
      showToast(errorMessage(err), "error");
      return false;
    }
  };
  const send = async () => {
    if (!text.trim() || !c) return;
    if (await act(() => (internal ? complaintsApi.note(c.id, text.trim()) : complaintsApi.reply(c.id, text.trim(), files.map((f) => f.id))), internal ? "Note saved" : "Reply sent")) {
      setText("");
      setFiles([]);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={c ? `${c.ticketNo} · ${c.subject}` : "Complaint"} width="max-w-3xl">
      {!c ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
            <Pill tone={PRIORITY[c.priority].tone}>{PRIORITY[c.priority].label}</Pill>
            {c.overdue && <Pill tone="danger">Overdue</Pill>}
            {c.escalation > 0 && <Pill tone="danger">Escalated ×{c.escalation}</Pill>}
            {c.anonymous && <Pill>Anonymous</Pill>}
            {c.rating && <Pill tone="success">Rated {c.rating}/5</Pill>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs text-on-surface-variant">
            <p>
              <b>About:</b> {c.category}
              {c.student ? ` · ${c.student}` : ""}
              {c.route ? ` · ${c.route}` : ""}
            </p>
            <p>
              <b>Raised by:</b> {c.raisedBy} · {when(c.createdAt)}
            </p>
            <p>
              <b>Handler:</b> {c.handler || "Not assigned"}
            </p>
            <p>
              <b>Reply by:</b> {when(c.respondBy)} · <b>resolve by:</b> {when(c.resolveBy)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-4 py-3">
            <p className="text-sm whitespace-pre-line">{c.details}</p>
            <CustomValuesInline formKey="complaint" values={c.custom} />
            <FileLinks complaintId={c.id} ids={c.attachmentIds} />
          </div>
          {c.resolution && <FormAlert tone="success">Resolution: {c.resolution}</FormAlert>}
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {c.messages.map((m) =>
              m.kind === "event" ? (
                <li key={m.id} className="text-center text-[11px] text-on-surface-variant/70">
                  {m.text} · {m.author} · {when(m.at)}
                </li>
              ) : (
                <li key={m.id} className={cn("rounded-xl px-4 py-2.5 max-w-[85%]", m.kind === "note" ? "bg-amber-50 border border-amber-200 mx-auto" : m.fromRaiser ? "bg-surface-container-high" : "bg-primary/10 ml-auto")}>
                  <p className="text-[11px] font-bold text-on-surface-variant">
                    {m.kind === "note" ? "Internal note · " : ""}
                    {m.author} · {when(m.at)}
                  </p>
                  <p className="text-sm whitespace-pre-line">{m.text}</p>
                  <FileLinks complaintId={c.id} ids={m.attachmentIds} />
                </li>
              )
            )}
          </ul>
          {c.can.reply && (
            <div className="space-y-2">
              {c.can.note && (snippets.data ?? []).length > 0 && (
                <select value="" onChange={(e) => e.target.value && setText((t) => (t ? `${t}\n${e.target.value}` : e.target.value))} className="rounded-lg bg-surface-container-low px-3 py-1.5 text-xs" aria-label="Insert a ready reply">
                  <option value="">Insert a ready reply…</option>
                  {snippets.data!.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name.slice(0, 70)}
                    </option>
                  ))}
                </select>
              )}
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} placeholder={internal ? "Internal note (only staff see it)" : "Write a reply"} className={cn("w-full rounded-xl px-4 py-3 text-sm outline-none", internal ? "bg-amber-50" : "bg-surface-container-low")} aria-label="Reply" />
              <div className="flex flex-wrap items-center gap-3">
                {!internal && <FilePicker files={files} onChange={setFiles} max={3} />}
                {c.can.note && <Checkbox checked={internal} onChange={setInternal} label="Internal note" />}
                <Button className="ml-auto" onClick={send} disabled={!text.trim()}>
                  {internal ? "Save note" : "Send"}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-outline-variant/20 pt-3">
            {c.can.assign && (
              <select value={c.assignedTo ?? ""} onChange={(e) => e.target.value && act(() => complaintsApi.assign(c.id, e.target.value), "Assigned")} className="rounded-xl bg-surface-container-low px-3 py-2 text-sm" aria-label="Assign to">
                <option value="">Assign to…</option>
                {(handlers.data ?? []).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
            {c.can.work && <Button onClick={() => { setMode("resolve"); setExtra(""); }}>Mark resolved</Button>}
            {c.can.close && <Button variant="tertiary" onClick={async () => (await confirm({ title: "Close this complaint?", message: "The complainant can’t reply or reopen it any more.", confirmLabel: "Close" })) && act(() => complaintsApi.close(c.id), "Closed")}>Close</Button>}
            {c.can.accept && <Button onClick={() => { setMode("accept"); setStars(0); setExtra(""); }}>Yes, it’s solved</Button>}
            {c.can.reopen && <Button variant="secondary" onClick={() => { setMode("reopen"); setExtra(""); }}>Not solved: reopen</Button>}
            {c.can.rate && !c.can.accept && <Button variant="secondary" onClick={() => { setMode("rate"); setStars(0); setExtra(""); }}>Rate</Button>}
          </div>
          {mode && (
            <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
              {(mode === "accept" || mode === "rate") && (
                <>
                  <p className="text-sm font-bold">How was it handled?</p>
                  <Stars value={stars} onChange={setStars} />
                </>
              )}
              <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} placeholder={mode === "resolve" ? "What was done (the complainant sees this)" : mode === "reopen" ? "What is still wrong?" : "A comment (optional)"} className="w-full rounded-xl bg-white px-4 py-2 text-sm outline-none" aria-label="Details" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setMode(null)}>
                  Back
                </Button>
                <Button
                  onClick={async () => {
                    const ok =
                      mode === "resolve"
                        ? await act(() => complaintsApi.resolve(c.id, extra.trim()), "Resolved: the complainant is told")
                        : mode === "reopen"
                          ? await act(() => complaintsApi.reopen(c.id, extra.trim()), "Reopened")
                          : mode === "accept"
                            ? await act(() => complaintsApi.accept(c.id, stars || null, extra.trim() || null), "Thank you: closed")
                            : await act(() => complaintsApi.rate(c.id, stars, extra.trim() || null), "Thank you for rating");
                    if (ok) setMode(null);
                  }}
                  disabled={(mode === "resolve" || mode === "reopen") ? extra.trim().length < 5 : mode === "rate" ? !stars : false}
                >
                  {mode === "resolve" ? "Resolve" : mode === "reopen" ? "Reopen" : mode === "accept" ? "Close it" : "Rate"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
