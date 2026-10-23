"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { academicApi } from "@/lib/api/academic";
import { examsApi } from "@/lib/api/exams";
import { mastersApi } from "@/lib/api/masters";
import { alertsApi, Audience, Channel, CHANNEL_LABEL, ComposeInput, ComposePreview, NO_AUDIENCE } from "@/lib/api/alerts";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const toggle = <T,>(list: T[], x: T, on: boolean) => (on ? (list.includes(x) ? list : [...list, x]) : list.filter((y) => y !== x));

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold pl-3 pr-1 py-1">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove" className="rounded-full p-0.5 hover:bg-primary/20">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </span>
  );
}

function Compose() {
  const router = useRouter();
  const { showToast } = useToast();
  const [a, setA] = useState<Audience>(NO_AUDIENCE);
  const [picked, setPicked] = useState<{ kind: "student" | "staff"; id: string; label: string }[]>([]);
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [cc, setCc] = useState("");
  const [v, setV] = useState({ subject: "", body: "", shortText: "", categoryId: "", priority: "normal" });
  const [channels, setChannels] = useState<Channel[]>(["in_app", "email"]);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [card, setCard] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [preview, setPreview] = useState<ComposePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const opts = useQuery({ queryKey: ["compose-options"], queryFn: () => alertsApi.pickerOptions() });
  const found = useQuery({ queryKey: ["compose-search", search], queryFn: () => alertsApi.pickerOptions(search), enabled: search.trim().length >= 2 });
  const templates = useQuery({ queryKey: ["message-templates"], queryFn: alertsApi.templates });
  const priorities = useQuery({ queryKey: ["master-options", "alert_priority"], queryFn: () => mastersApi.options("alert_priority"), staleTime: 5 * 60_000 });
  const years = useQuery({ queryKey: ["academic-year-options"], queryFn: academicApi.yearOptions });
  const yearId = years.data?.find((y) => y.isCurrent)?.id ?? "";
  const p = opts.data?.powers;
  const choices = useQuery({ queryKey: ["exam-choices", yearId], queryFn: () => examsApi.choices(yearId), enabled: !!yearId && !!p?.documents });
  useEffect(() => {
    if (p && !p.paidChannels) setChannels((c) => c.filter((x) => x === "in_app" || x === "email"));
  }, [p]);

  if (!opts.data || !p) return <PageLoader />;
  const o = opts.data;
  const set = (patch: Partial<Audience>) => setA((x) => ({ ...x, ...patch }));
  const emails = (s: string) => s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  const input = (): ComposeInput => {
    const [scope, id] = card ? (card.split(":") as ["exam" | "term" | "final", string]) : [null, null];
    return {
      audience: { ...a, studentIds: picked.filter((x) => x.kind === "student").map((x) => x.id), staffIds: picked.filter((x) => x.kind === "staff").map((x) => x.id), emails: emails(typed) },
      subject: v.subject,
      body: v.body,
      shortText: v.shortText || null,
      channels,
      categoryId: v.categoryId || null,
      priority: v.priority,
      cc: emails(cc),
      attachmentIds: files.map((f) => f.id),
      reportCard: scope && id ? { scope, id } : null,
      sendAt: sendAt ? new Date(sendAt).toISOString() : null,
    };
  };
  const fail = (err: unknown) => {
    setError(errorMessage(err));
    setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
  };
  const doPreview = async () => {
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      setPreview(await alertsApi.preview(input()));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    setBusy(true);
    try {
      const m = await alertsApi.send(input());
      showToast(m.status === "scheduled" ? "Scheduled" : "Sent", "success");
      router.push(`/messages?open=${m.id}`);
    } catch (err) {
      setPreview(null);
      fail(err);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    try {
      const f = await alertsApi.upload(file);
      setFiles((x) => [...x, f]);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const pickTemplate = (id: string) => {
    const t = templates.data?.find((x) => x.id === id);
    if (t) setV((x) => ({ ...x, subject: t.subject, body: t.body, shortText: t.shortText ?? "", categoryId: t.categoryId ?? x.categoryId }));
  };
  const pickGroup = (id: string, on: boolean) => set({ groupIds: toggle(a.groupIds, id, on) });
  const saveGroup = async () => {
    if (!groupName?.trim()) return;
    try {
      await alertsApi.saveGroup(groupName.trim(), input().audience);
      showToast("Group saved", "success");
      setGroupName(null);
      opts.refetch();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const families = a.sectionIds.length > 0 || a.classIds.length > 0 || picked.some((x) => x.kind === "student");
  const anyone = families || a.allParents || a.allStudents || a.allStaff || a.roleIds.length > 0 || a.groupIds.length > 0 || picked.length > 0 || emails(typed).length > 0;
  const short = channels.includes("sms") || channels.includes("whatsapp");

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Card className="space-y-4">
          <p className={label}>To</p>
          {p.assigned && <FormAlert tone="info">You can message the students and parents of the sections you teach.</FormAlert>}
          {p.groups && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Checkbox label="All parents" checked={a.allParents} onChange={(c) => set({ allParents: c })} />
              <Checkbox label="All students" checked={a.allStudents} onChange={(c) => set({ allStudents: c })} />
              <Checkbox label="All staff" checked={a.allStaff} onChange={(c) => set({ allStaff: c })} />
            </div>
          )}
          {p.groups && !a.allStaff && !!o.roles.length && (
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant/70">Staff with these roles</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {o.roles.map((r) => (
                  <Checkbox key={r.id} label={r.name} checked={a.roleIds.includes(r.id)} onChange={(c) => set({ roleIds: toggle(a.roleIds, r.id, c) })} />
                ))}
              </div>
            </div>
          )}
          {!a.allParents && !a.allStudents && (
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant/70">Classes and sections</p>
              {!!o.classes.length && (
                <div className="flex flex-wrap gap-2">
                  {o.classes.map((c) => (
                    <button key={c.id} type="button" onClick={() => set({ classIds: toggle(a.classIds, c.id, !a.classIds.includes(c.id)) })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", a.classIds.includes(c.id) ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high")}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {o.sections.map((s) => (
                  <button key={s.id} type="button" onClick={() => set({ sectionIds: toggle(a.sectionIds, s.id, !a.sectionIds.includes(s.id)) })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", a.sectionIds.includes(s.id) ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {families && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs text-on-surface-variant/70">For the students picked:</span>
              <Checkbox label="Parents" checked={a.who.includes("parent")} onChange={(c) => set({ who: toggle(a.who, "parent", c) })} />
              <Checkbox label="Students" checked={a.who.includes("student")} onChange={(c) => set({ who: toggle(a.who, "student", c) })} />
            </div>
          )}
          <div className="space-y-2">
            <Input label="Add people (type a name or admission / employee no.)" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Manish" />
            {search.trim().length >= 2 && (
              <div className="rounded-xl border border-outline-variant/20 max-h-56 overflow-y-auto">
                {[...(found.data?.students ?? []).map((x) => ({ ...x, kind: "student" as const })), ...(found.data?.staff ?? []).map((x) => ({ ...x, kind: "staff" as const }))].map((x) => (
                  <button key={`${x.kind}${x.id}`} type="button" onClick={() => { setPicked((list) => (list.some((y) => y.id === x.id) ? list : [...list, x])); setSearch(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">{x.kind === "staff" ? "badge" : "school"}</span>
                    {x.label}
                  </button>
                ))}
                {found.data && !found.data.students.length && !found.data.staff.length && <p className="px-3 py-2 text-sm text-on-surface-variant/70">Nobody found.</p>}
              </div>
            )}
            {!!picked.length && (
              <div className="flex flex-wrap gap-2">
                {picked.map((x) => (
                  <Chip key={x.id} onRemove={() => setPicked((l) => l.filter((y) => y.id !== x.id))}>
                    {x.label.split(" · ")[0]}
                  </Chip>
                ))}
              </div>
            )}
          </div>
          {!!o.groups.length && (
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant/70">Saved groups</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {o.groups.map((g) => (
                  <Checkbox key={g.id} label={g.name} hint={g.label} checked={a.groupIds.includes(g.id)} onChange={(c) => pickGroup(g.id, c)} />
                ))}
              </div>
            </div>
          )}
          {!p.assigned && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Other email addresses (optional)" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="name@example.com, …" />
              <Input label="CC (optional)" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="principal@school.in" />
            </div>
          )}
          {anyone && (
            <button type="button" onClick={() => setGroupName("")} className="text-xs font-bold text-primary hover:opacity-70">
              Save these as a group…
            </button>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Start from a template" value="" onChange={pickTemplate} options={[{ value: "", label: templates.data?.length ? "Choose…" : "No templates" }, ...(templates.data ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
            <MasterSelect master="message_category" label="Category" value={v.categoryId} onChange={(id) => setV({ ...v, categoryId: id })} />
            <Select label="Priority" value={v.priority} onChange={(x) => setV({ ...v, priority: x })} options={(priorities.data ?? [{ id: "n", code: "normal", name: "Normal" }]).map((x) => ({ value: x.code ?? x.name, label: x.name }))} />
          </div>
          <Input label="Subject" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} error={fieldErrors.subject} maxLength={200} />
          <TextArea label="Message" rows={9} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} error={fieldErrors.body} />
          <p className="text-[11px] text-on-surface-variant/70">
            Personal fields: <code>{"{{name}}"}</code> (the person), <code>{"{{student}}"}</code> and <code>{"{{class}}"}</code> (the child, for parents and students), <code>{"{{school}}"}</code>. A blank line starts a new paragraph.
          </p>
          <div className="space-y-2">
            <p className={label}>Send by</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(["in_app", "email", "sms", "whatsapp"] as Channel[]).map((c) => (
                <Checkbox key={c} label={CHANNEL_LABEL[c]} checked={channels.includes(c)} disabled={(c === "sms" || c === "whatsapp") && !p.paidChannels} onChange={(on) => setChannels(toggle(channels, c, on))} />
              ))}
            </div>
            {fieldErrors.channels && <p className="text-xs text-error">{fieldErrors.channels}</p>}
          </div>
          {short && <TextArea label="Short text for SMS / WhatsApp (optional; else the message is shortened)" rows={2} maxLength={480} value={v.shortText} onChange={(e) => setV({ ...v, shortText: e.target.value })} />}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="space-y-3">
          <p className={label}>Attachments (email)</p>
          {files.map((f) => (
            <Chip key={f.id} onRemove={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>
              {f.name}
            </Chip>
          ))}
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={files.length >= 10}>
            Attach a file
          </Button>
          {p.documents && choices.data && (
            <Select
              label="Attach each child’s report card"
              value={card}
              onChange={setCard}
              options={[
                { value: "", label: "No report card" },
                ...choices.data.exams.filter((e) => e.published).map((e) => ({ value: `exam:${e.id}`, label: e.name })),
                ...choices.data.terms.filter((t) => t.published).map((t) => ({ value: `term:${t.id}`, label: t.name })),
                ...(choices.data.finalPublished ? [{ value: `final:${yearId}`, label: "Final result" }] : []),
              ]}
            />
          )}
        </Card>
        {p.schedule && (
          <Card className="space-y-2">
            <p className={label}>Send later (optional)</p>
            <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Send at" />
            {sendAt && (
              <button type="button" onClick={() => setSendAt("")} className="text-xs font-bold text-primary">
                Send now instead
              </button>
            )}
          </Card>
        )}
        {error && <FormAlert>{error}</FormAlert>}
        <Button className="w-full" onClick={doPreview} disabled={busy || !anyone || !v.subject.trim() || !v.body.trim() || !channels.length}>
          Check and send
        </Button>
      </div>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Ready to send?" width="max-w-xl">
        {preview && (
          <div className="space-y-4 text-sm">
            <p>
              <b>{preview.people}</b> {preview.people === 1 ? "person" : "people"}: {preview.audience}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.byKind).map(([k, n]) => (
                <Pill key={k}>
                  {n} {k}
                </Pill>
              ))}
            </div>
            <ul className="space-y-1">
              {preview.channels.map((c) => (
                <li key={c.channel}>
                  {CHANNEL_LABEL[c.channel]}: {c.on ? `${c.reach} can get it` : "switched off (System Settings → Alerts)"}
                </li>
              ))}
            </ul>
            {!!preview.unreachable && <FormAlert tone="warning">{preview.unreachable} can’t be reached on the chosen channels (no login, email or mobile); they get it on another channel if possible.</FormAlert>}
            {preview.sample && (
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-1">What {preview.sample.to} will see</p>
                <p className="font-bold">{preview.sample.subject}</p>
                <p className="whitespace-pre-line mt-1 text-on-surface-variant">{preview.sample.body}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button onClick={send} disabled={busy || !preview.people}>
                {sendAt ? "Schedule" : "Send now"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal isOpen={groupName !== null} onClose={() => setGroupName(null)} title="Save as a group">
        <div className="space-y-4">
          <Input label="Group name" value={groupName ?? ""} onChange={(e) => setGroupName(e.target.value)} placeholder="Sports team parents" maxLength={80} autoFocus />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setGroupName(null)}>
              Cancel
            </Button>
            <Button onClick={saveGroup} disabled={!groupName?.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ComposePage() {
  return (
    <RequirePermission permission="message.send">
      <PageHeader title="Compose" description="A message to parents, students or staff: in the app, by email, SMS or WhatsApp; now or later." />
      <Compose />
    </RequirePermission>
  );
}
