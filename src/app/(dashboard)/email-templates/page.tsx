"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime } from "@/components/admin/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { emailTemplatesApi, EmailTemplate } from "@/lib/api/emailTemplates";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

function Editor({ template }: { template: EmailTemplate }) {
  const { can } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = can("settings.update");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [lastField, setLastField] = useState<"subject" | "body">("body");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; problems: { field: string; message: string }[] } | null>(null);

  useEffect(() => {
    setSubject(template.subject);
    setBody(template.body);
  }, [template]);

  // Live preview of the wording as typed (debounced).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      emailTemplatesApi
        .preview(template.key, subject.trim() && body.trim() ? { subject, body } : undefined)
        .then((p) => !cancelled && setPreview(p))
        .catch(() => undefined);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [template.key, subject, body]);

  const dirty = subject !== template.subject || body !== template.body;

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const el = lastField === "subject" ? subjectRef.current : bodyRef.current;
    const value = lastField === "subject" ? subject : body;
    const setValue = lastField === "subject" ? setSubject : setBody;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    setFieldErrors({});
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(null);
    }
  };

  const refresh = async (saved: EmailTemplate) => {
    queryClient.setQueryData(["email-template", template.key], saved);
    await queryClient.invalidateQueries({ queryKey: ["email-templates"] });
  };

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-primary">
              {template.label} {template.isCustom ? <Pill tone="primary">Your wording</Pill> : <Pill>Default wording</Pill>}
            </h2>
            <p className="text-sm text-on-surface-variant/70 mt-1">{template.description}</p>
            {template.updatedAt && <p className="text-xs text-on-surface-variant/60 mt-1">Last changed {formatDateTime(template.updatedAt)}</p>}
          </div>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        {!canEdit && <FormAlert tone="info">You can see the emails. Changing them needs the “Change system settings” permission.</FormAlert>}

        <Input
          ref={subjectRef}
          label="Subject"
          value={subject}
          error={fieldErrors.subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => setLastField("subject")}
          readOnly={!canEdit}
          maxLength={200}
        />
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Message</span>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setLastField("body")}
            readOnly={!canEdit}
            rows={12}
            maxLength={5000}
            className={`w-full bg-surface-container-low rounded-xl border-none outline-none py-3.5 px-4 text-sm text-on-surface font-medium leading-relaxed focus:ring-2 focus:ring-primary/10 resize-y ${fieldErrors.body ? "ring-2 ring-error/50" : ""}`}
          />
          <span className="text-[10px] text-on-surface-variant/60 ml-1">Leave an empty line between paragraphs. {fieldErrors.body && <b className="text-error">{fieldErrors.body}</b>}</span>
        </label>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Fields: click to insert where the cursor is</p>
          <div className="flex flex-wrap gap-2">
            {template.placeholders.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={!canEdit}
                onClick={() => insert(p.key)}
                title={`${p.label}, e.g. ${p.example}`}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-primary hover:bg-surface-high disabled:opacity-60"
              >
                {`{{${p.key}}}`} <span className="font-medium text-on-surface-variant/70">{p.label}</span>
                {p.required && <span className="text-error"> *</span>}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-on-surface-variant/60">* must stay in the email.</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              disabled={!dirty || !!busy}
              onClick={() =>
                run("save", async () => {
                  await refresh(await emailTemplatesApi.save(template.key, { subject, body }));
                  showToast("Email saved", "success");
                })
              }
            >
              {busy === "save" ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" disabled={!dirty || !!busy} onClick={() => { setSubject(template.subject); setBody(template.body); setFieldErrors({}); setError(null); }}>
              Discard changes
            </Button>
            <Button
              variant="secondary"
              disabled={!!busy}
              onClick={() =>
                run("test", async () => {
                  const r = await emailTemplatesApi.sendTest(template.key, { subject, body });
                  showToast(`Test email sent to ${r.to}`, "success");
                })
              }
            >
              {busy === "test" ? "Sending…" : "Send me a test email"}
            </Button>
            {template.isCustom && (
              <Button variant="secondary" disabled={!!busy} onClick={() => setConfirmReset(true)}>
                Back to default wording
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Preview</h2>
          <span className="text-xs text-on-surface-variant/60">With example values{dirty ? " · unsaved changes" : ""}</span>
        </div>
        {preview?.problems.map((p) => (
          <FormAlert key={p.message} tone="warning">
            {p.message}
          </FormAlert>
        ))}
        <div className="rounded-xl border border-outline-variant/30 overflow-hidden">
          <div className="px-4 py-3 bg-surface-container-low text-sm">
            <span className="text-on-surface-variant/60">Subject: </span>
            <b className="text-on-surface">{preview?.subject ?? "…"}</b>
          </div>
          {/* The email's HTML in a sandbox: no scripts, no access to this page. */}
          <iframe title="Email preview" sandbox="" srcDoc={preview?.html ?? ""} className="w-full h-[640px] bg-white" />
        </div>
      </Card>

      <Modal isOpen={confirmReset} onClose={() => setConfirmReset(false)} title="Back to the default wording?">
        <p className="text-sm text-on-surface-variant">Your wording for this email is replaced by the default one.</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              run("reset", async () => {
                await refresh(await emailTemplatesApi.reset(template.key));
                setConfirmReset(false);
                showToast("Back to the default wording", "success");
              })
            }
          >
            Use default
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EmailTemplates() {
  const list = useQuery({ queryKey: ["email-templates"], queryFn: emailTemplatesApi.list });
  const [selected, setSelected] = useState<string | null>(null);
  const key = selected ?? list.data?.[0]?.key ?? null;
  const template = useQuery({ queryKey: ["email-template", key], queryFn: () => emailTemplatesApi.get(key!), enabled: !!key });

  return (
    <>
      <PageHeader title="Email Templates" description="Every email the system sends, in your school's layout (logo, name and contact details). Reword them and preview before saving." />
      {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <Card padding="none" className="overflow-hidden">
          <ul>
            {list.data?.map((t) => (
              <li key={t.key}>
                <button
                  onClick={() => setSelected(t.key)}
                  className={`w-full text-left px-5 py-4 border-b border-outline-variant/10 hover:bg-surface-container-low ${t.key === key ? "bg-surface-container-high" : ""}`}
                >
                  <p className="text-sm font-bold text-primary">{t.label}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">{t.isCustom ? "Your wording" : "Default wording"}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        {template.isLoading && <p className="text-sm text-on-surface-variant">Loading…</p>}
        {template.data && <Editor template={template.data} />}
      </div>
    </>
  );
}

export default function EmailTemplatesPage() {
  return (
    <RequirePermission permission="settings.view">
      <EmailTemplates />
    </RequirePermission>
  );
}
