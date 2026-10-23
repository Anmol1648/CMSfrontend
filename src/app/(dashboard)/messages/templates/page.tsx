"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { alertsApi, MessageTemplate } from "@/lib/api/alerts";
import { mastersApi } from "@/lib/api/masters";

function TemplateForm({ t, onClose }: { t: MessageTemplate | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState({ name: t?.name ?? "", categoryId: t?.categoryId ?? "", subject: t?.subject ?? "", body: t?.body ?? "", shortText: t?.shortText ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await alertsApi.saveTemplate(t?.id ?? null, { ...v, categoryId: v.categoryId || null, shortText: v.shortText || null });
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={t ? `Edit ${t.name}` : "Add a template"} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={fieldErrors.name} maxLength={80} />
          <MasterSelect master="message_category" label="Category" value={v.categoryId} onChange={(id) => setV({ ...v, categoryId: id })} />
        </div>
        <Input label="Subject" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} error={fieldErrors.subject} maxLength={200} />
        <TextArea label="Message" rows={8} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} error={fieldErrors.body} />
        <TextArea label="Short text for SMS / WhatsApp (optional)" rows={2} maxLength={480} value={v.shortText} onChange={(e) => setV({ ...v, shortText: e.target.value })} />
        <p className="text-[11px] text-on-surface-variant/70">
          Fields: <code>{"{{name}}"}</code>, <code>{"{{student}}"}</code>, <code>{"{{class}}"}</code>, <code>{"{{school}}"}</code>.
        </p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Templates() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["message-templates"], queryFn: alertsApi.templates });
  const cats = useQuery({ queryKey: ["master-options", "message_category"], queryFn: () => mastersApi.options("message_category"), staleTime: 5 * 60_000 });
  const [editing, setEditing] = useState<MessageTemplate | "new" | null>(null);
  if (!q.data) return <PageLoader />;
  const remove = async (t: MessageTemplate) => {
    if (!(await confirm({ title: `Delete ${t.name}?`, message: "Messages already sent are not changed.", confirmLabel: "Delete" }))) return;
    try {
      await alertsApi.deleteTemplate(t.id);
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>Add a template</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {q.data.map((t) => (
          <Card key={t.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-primary">{t.name}</p>
                <p className="text-[11px] text-on-surface-variant/70">{cats.data?.find((c) => c.id === t.categoryId)?.name ?? "No category"}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEditing(t)} aria-label="Edit" className="p-1.5 rounded-full hover:bg-surface-container-high text-primary">
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button type="button" onClick={() => remove(t)} aria-label="Delete" className="p-1.5 rounded-full hover:bg-surface-container-high text-error">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
            <p className="text-sm font-semibold">{t.subject}</p>
            <p className="text-sm text-on-surface-variant whitespace-pre-line line-clamp-4">{t.body}</p>
          </Card>
        ))}
      </div>
      {!q.data.length && <Card className="text-center text-sm text-on-surface-variant/70">No templates yet.</Card>}
      {editing && <TemplateForm t={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <RequirePermission permission="alert.templates">
      <PageHeader title="Message Templates" description="Ready messages to start from on Compose: school closed, PTM invitation, fee reminder…" />
      <Templates />
    </RequirePermission>
  );
}
