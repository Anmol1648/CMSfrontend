"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { ApiError, errorMessage } from "@/lib/api/client";
import { academicApi } from "@/lib/api/academic";
import { AUDIENCE, Audience, feedbackApi, Form, Question, QuestionKind, ROUND_STATUS, RoundInput, RoundRow } from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const plus = (n: number) => new Date(Date.now() + 5.5 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);

function RoundForm({ forms, onClose }: { forms: Form[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const defaults = useQuery({ queryKey: ["feedback", "defaults"], queryFn: feedbackApi.roundDefaults });
  const years = useQuery({ queryKey: ["academic", "years"], queryFn: academicApi.years });
  const yearId = years.data?.find((y) => y.isCurrent)?.id;
  const sections = useQuery({ queryKey: ["academic", "section-options", yearId], queryFn: () => academicApi.sectionOptions(yearId!), enabled: !!yearId });
  const active = forms.filter((f) => f.isActive);
  const [v, setV] = useState<RoundInput>({ formId: active[0]?.id ?? "", name: "", audience: (active[0]?.audience === "parent" ? "parent" : "student") as Audience, sectionIds: [], anonymous: true, mustFill: false, opensOn: today(), closesOn: plus(10) });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    if (defaults.data) setV((x) => ({ ...x, anonymous: defaults.data.anonymous, mustFill: defaults.data.mustFill }));
  }, [defaults.data]);
  const set = (p: Partial<RoundInput>) => setV((x) => ({ ...x, ...p }));
  const form = forms.find((f) => f.id === v.formId);
  const save = async () => {
    try {
      await feedbackApi.saveRound(null, v);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      showToast("Round saved as a draft: open it when ready", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="New feedback round" width="max-w-2xl">
      <div className="space-y-4">
        <Select label="Question set" value={v.formId} onChange={(id) => { const f = forms.find((x) => x.id === id); set({ formId: id, audience: f?.audience === "both" ? v.audience : (f?.audience as Audience) }); }} options={active.map((f) => ({ value: f.id, label: `${f.name} (${AUDIENCE[f.audience]})` }))} />
        <Input label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={fields.name} placeholder="Student feedback on teachers: Term 2" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Who fills it" value={v.audience} onChange={(a) => set({ audience: a as Audience })} options={(form?.audience === "both" ? (["student", "parent", "both"] as Audience[]) : [form?.audience ?? "student"]).map((a) => ({ value: a, label: AUDIENCE[a as Audience] }))} />
          <Input label="Opens" type="date" value={v.opensOn} onChange={(e) => set({ opensOn: e.target.value })} />
          <Input label="Closes" type="date" value={v.closesOn} onChange={(e) => set({ closesOn: e.target.value })} error={fields.closesOn} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className={label}>Sections ({v.sectionIds.length})</p>
            <button type="button" className="text-xs font-bold text-primary" onClick={() => set({ sectionIds: v.sectionIds.length ? [] : (sections.data ?? []).map((s) => s.id) })}>
              {v.sectionIds.length ? "Clear" : "All sections"}
            </button>
          </div>
          {fields.sectionIds && <p className="text-xs text-error">{fields.sectionIds}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {(sections.data ?? []).map((s) => (
              <button key={s.id} type="button" onClick={() => set({ sectionIds: v.sectionIds.includes(s.id) ? v.sectionIds.filter((x) => x !== s.id) : [...v.sectionIds, s.id] })} className={cn("rounded-full px-3 py-1 text-xs font-bold border", v.sectionIds.includes(s.id) ? "bg-primary text-white border-primary" : "border-outline-variant/30 text-on-surface-variant")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Checkbox checked={v.anonymous} onChange={(a) => set({ anonymous: a })} label="Anonymous (recommended)" hint="No one, not even the principal, sees who wrote what." />
        <Checkbox checked={v.mustFill} onChange={(m) => set({ mustFill: m })} label="Must be filled before using the app" hint="While the round is open, students / parents with forms left are taken to Teacher Feedback from any page until every teacher is done." />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!v.formId || !v.name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function FormEditor({ form, onClose }: { form: Form | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState(form?.name ?? "");
  const [audience, setAudience] = useState<Audience>(form?.audience ?? "student");
  const [qs, setQs] = useState<Question[]>(form?.questions ?? [{ id: "q1", kind: "rating", text: "", required: true }]);
  const [active, setActive] = useState(form?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const nextId = () => `q${Math.max(0, ...qs.map((q) => Number(q.id.replace(/\D/g, "")) || 0)) + 1}`;
  const upd = (i: number, p: Partial<Question>) => setQs((x) => x.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const save = async () => {
    try {
      await feedbackApi.saveForm(form?.id ?? null, { name, audience, questions: qs, isActive: active });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={form ? "Edit question set" : "New question set"} width="max-w-3xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="For" value={audience} onChange={(a) => setAudience(a as Audience)} options={(["student", "parent", "both"] as Audience[]).map((a) => ({ value: a, label: AUDIENCE[a] }))} />
        </div>
        {form && form.rounds > 0 && <FormAlert tone="info">This set has been used: you can add questions or reword them, but not remove them.</FormAlert>}
        <ol className="space-y-2">
          {qs.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
              <span className="w-6 text-xs font-bold text-primary">{i + 1}</span>
              <input value={q.text} onChange={(e) => upd(i, { text: e.target.value })} placeholder="The question" className="flex-1 min-w-[12rem] rounded-lg bg-white px-3 py-2 text-sm outline-none" aria-label={`Question ${i + 1}`} />
              <select value={q.kind} onChange={(e) => upd(i, { kind: e.target.value as QuestionKind })} className="rounded-lg bg-white px-2 py-2 text-xs" aria-label="Kind">
                <option value="rating">Rating</option>
                <option value="yesno">Yes / no</option>
                <option value="text">Comment</option>
              </select>
              <label className="text-xs inline-flex items-center gap-1">
                <input type="checkbox" checked={!!q.required} onChange={(e) => upd(i, { required: e.target.checked })} className="accent-[#1A365D]" /> Must answer
              </label>
              <button type="button" disabled={i === 0} onClick={() => setQs((x) => { const y = [...x]; [y[i - 1], y[i]] = [y[i], y[i - 1]]; return y; })} className="p-1 disabled:opacity-30" aria-label="Up">
                <span className="material-symbols-outlined text-base">arrow_upward</span>
              </button>
              <button type="button" onClick={() => setQs((x) => x.filter((_, j) => j !== i))} className="p-1 text-error" aria-label="Remove">
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </li>
          ))}
        </ol>
        <Button variant="tertiary" onClick={() => setQs((x) => [...x, { id: nextId(), kind: "rating", text: "", required: true }])}>
          Add a question
        </Button>
        <Checkbox checked={active} onChange={setActive} label="In use" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim() || !qs.length}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Screening({ round, onClose }: { round: RoundRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["feedback", "comments", round.id], queryFn: () => feedbackApi.comments(round.id) });
  const { showToast } = useToast();
  const mark = async (ids: string[], status: "shown" | "hidden") => {
    try {
      await feedbackApi.screen(ids, status);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const pending = (q.data ?? []).filter((c) => c.status === "pending");
  return (
    <Modal isOpen onClose={onClose} title={`Screen comments: ${round.name}`} width="max-w-3xl">
      {q.isLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">Show the comments teachers may read; hide rude or personal ones. The writers stay anonymous.</p>
          {pending.length > 0 && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => mark(pending.map((c) => c.id), "shown")}>
                Show all {pending.length} waiting
              </Button>
            </div>
          )}
          {!q.data?.length && <FormAlert tone="info">No comments waiting or hidden.</FormAlert>}
          <ul className="space-y-2">
            {q.data?.map((c) => (
              <li key={c.id} className={cn("rounded-xl px-4 py-2.5", c.status === "hidden" ? "bg-error/5" : "bg-amber-50")}>
                <p className="text-xs font-bold text-on-surface-variant">
                  About {c.teacher} · from a {c.kind}
                </p>
                {c.texts.map((t, i) => (
                  <p key={i} className="text-sm">
                    “{t}”
                  </p>
                ))}
                <div className="mt-1 flex justify-end gap-2">
                  <Button variant="tertiary" onClick={() => mark([c.id], "hidden")} disabled={c.status === "hidden"}>
                    Hide
                  </Button>
                  <Button variant="tertiary" onClick={() => mark([c.id], "shown")}>
                    Show
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function Rounds() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"rounds" | "forms">("rounds");
  const rounds = useQuery({ queryKey: ["feedback", "rounds"], queryFn: feedbackApi.rounds });
  const forms = useQuery({ queryKey: ["feedback", "forms"], queryFn: feedbackApi.forms });
  const [adding, setAdding] = useState(false);
  const [editForm, setEditForm] = useState<Form | null | "new">(null);
  const [screening, setScreening] = useState<RoundRow | null>(null);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["rounds", "forms"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-sm font-bold", tab === t ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant")}>
            {t === "rounds" ? "Rounds" : "Question sets"}
          </button>
        ))}
        <div className="ml-auto">{tab === "rounds" ? <Button onClick={() => setAdding(true)} disabled={!forms.data}>New round</Button> : <Button onClick={() => setEditForm("new")}>New question set</Button>}</div>
      </div>
      {tab === "rounds" ? (
        rounds.isLoading ? (
          <PageLoader />
        ) : !rounds.data?.length ? (
          <FormAlert tone="info">No rounds yet.</FormAlert>
        ) : (
          rounds.data.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[14rem]">
                  <p className="font-extrabold">{r.name}</p>
                  <p className="text-xs text-on-surface-variant/70">
                    {r.form} · {AUDIENCE[r.audience]} · {r.sections} sections · {r.opensOn} – {r.closesOn} · {r.anonymous ? "anonymous" : "named"}{r.mustFill ? " · must fill before using the app" : ""}
                  </p>
                </div>
                <Pill tone={ROUND_STATUS[r.status].tone}>{ROUND_STATUS[r.status].label}</Pill>
              </div>
              <div className="mt-3">
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${r.expected ? Math.min(100, (r.filled / r.expected) * 100) : 0}%` }} />
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {r.filled} of {r.expected} forms filled ({r.expected ? Math.round((r.filled / r.expected) * 100) : 0}%) · {r.people} people asked
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(r.status === "draft" || r.status === "closed") && <Button onClick={async () => (await confirm({ title: `Open “${r.name}”?`, message: "Those asked are told and can fill it in until the closing day.", confirmLabel: "Open" })) && act(() => feedbackApi.open(r.id), "Opened: people are told")}>Open</Button>}
                {r.status === "open" && <Button variant="secondary" onClick={() => act(() => feedbackApi.close(r.id), "Closed")}>Close now</Button>}
                {(r.status === "draft" || r.status === "open") && (
                  <Button variant="tertiary" onClick={() => act(() => feedbackApi.setMustFill(r.id, !r.mustFill), r.mustFill ? "No longer required before using the app" : "Now required before using the app")}>
                    {r.mustFill ? "Don’t require before using the app" : "Require before using the app"}
                  </Button>
                )}
                {r.status !== "draft" && (
                  <Button variant="tertiary" onClick={() => setScreening(r)}>
                    Screen comments
                  </Button>
                )}
                {r.status === "closed" && <Button variant="secondary" onClick={async () => (await confirm({ title: "Release the results to the teachers?", message: "Each teacher sees their own results (and the shown comments) on My Feedback.", confirmLabel: "Release" })) && act(() => feedbackApi.release(r.id), "Released: teachers are told")}>Release to teachers</Button>}
                {r.status !== "draft" && (
                  <Link href={`/feedback/results?round=${r.id}`} className="inline-flex items-center px-3 text-sm font-bold text-primary">
                    Results →
                  </Link>
                )}
                {r.status === "draft" && (
                  <Button variant="tertiary" onClick={async () => (await confirm({ title: "Delete this draft?", confirmLabel: "Delete", danger: true })) && act(() => feedbackApi.deleteRound(r.id), "Deleted")}>
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))
        )
      ) : forms.isLoading ? (
        <PageLoader />
      ) : (
        forms.data?.map((f) => (
          <Card key={f.id} className={f.isActive ? "" : "opacity-60"}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-extrabold">{f.name}</p>
                <p className="text-xs text-on-surface-variant/70">
                  For {AUDIENCE[f.audience].toLowerCase()} · {f.questions.length} questions · used in {f.rounds} round{f.rounds === 1 ? "" : "s"}
                </p>
                <ol className="mt-2 list-decimal pl-5 text-sm text-on-surface-variant space-y-0.5">
                  {f.questions.map((q) => (
                    <li key={q.id}>
                      {q.text} <span className="text-xs">({q.kind === "rating" ? "rating" : q.kind === "yesno" ? "yes / no" : "comment"})</span>
                    </li>
                  ))}
                </ol>
              </div>
              <Button variant="secondary" onClick={() => setEditForm(f)}>
                Edit
              </Button>
            </div>
          </Card>
        ))
      )}
      {adding && forms.data && <RoundForm forms={forms.data} onClose={() => setAdding(false)} />}
      {editForm && <FormEditor form={editForm === "new" ? null : editForm} onClose={() => setEditForm(null)} />}
      {screening && <Screening round={screening} onClose={() => setScreening(null)} />}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <RequirePermission permission="feedback.manage">
      <PageHeader title="Teacher Feedback" description="Question sets and feedback rounds: open a round for some sections, screen the comments, then release the results to the teachers." />
      <Rounds />
    </RequirePermission>
  );
}
