"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Detail, FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { addDays, EnquiryForm, EnquiryValues, fromEnquiry, toEnquiryInput } from "@/components/admissions/EnquiryForm";
import { FollowUpDate, formatDay, StatusPill } from "@/components/admissions/EnquiryBits";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { admissionsApi, Enquiry, EnquiryFormConfig, Stage, TestResult } from "@/lib/api/admissions";
import { ApiError, errorMessage } from "@/lib/api/client";
import { rupees } from "@/lib/api/fees";
import { useCodedList, usePaymentModes } from "@/components/masters/useCodedList";
import { PageLoader } from "@/components/ui/PageLoader";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { CustomFieldsView, useFormExtras } from "@/components/forms/CustomFields";
import type { CustomValues } from "@/lib/api/forms";

const today = () => new Date().toISOString().slice(0, 10);

/** Stage dropdown: "keep the stage" plus the active stages (never "won": that is conversion). */
function StageSelect({ stages, value, onChange, current, label = "Move to stage" }: { stages: Stage[]; value: string; onChange: (v: string) => void; current: string; label?: string }) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[{ value: "", label: "Keep the stage" }, ...stages.filter((s) => s.isActive && !s.won && s.id !== current).map((s) => ({ value: s.id, label: s.lost ? `${s.name} (close)` : s.name }))]}
    />
  );
}

function FollowUpForm({ e, config, onSaved }: { e: Enquiry; config: EnquiryFormConfig; onSaved: (e: Enquiry) => void }) {
  const [date, setDate] = useState(today());
  const [outcomeId, setOutcomeId] = useState("");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(addDays(today(), config.followUpDays));
  const [stageId, setStageId] = useState("");
  const [lostReasonId, setLostReasonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const closing = config.stages.find((s) => s.id === stageId)?.lost ?? false;

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const r = await admissionsApi.addFollowUp(e.id, {
        date,
        outcomeId: outcomeId || null,
        note: note.trim() || null,
        nextDate: closing ? null : nextDate || null,
        ...(stageId ? { stageId, lostReasonId: lostReasonId || null } : {}),
      });
      setOutcomeId("");
      setNote("");
      setStageId("");
      setLostReasonId("");
      setNextDate(addDays(today(), config.followUpDays));
      onSaved(r);
    } catch (err) {
      setError(errorMessage(err));
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Date" type="date" max={today()} value={date} onChange={(ev) => setDate(ev.target.value)} error={errors.date} />
        <MasterSelect master="follow_up_outcome" label="Outcome" value={outcomeId} onChange={setOutcomeId} placeholder="Choose…" error={errors.outcomeId} />
        {!closing && <Input label="Next follow-up" type="date" min={date} value={nextDate} onChange={(ev) => setNextDate(ev.target.value)} error={errors.nextDate} />}
      </div>
      <TextArea label="What was said" rows={2} maxLength={1000} value={note} onChange={(ev) => setNote(ev.target.value)} error={errors.note} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <StageSelect stages={config.stages} value={stageId} onChange={setStageId} current={e.stage.id} />
        {closing && <MasterSelect master="enquiry_lost_reason" label="Why lost *" value={lostReasonId} onChange={setLostReasonId} error={errors.lostReasonId} />}
        <div className="md:col-start-3 flex justify-end">
          <Button type="submit" disabled={busy || (!note.trim() && !outcomeId)}>
            {busy ? "Saving…" : "Save follow-up"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-on-surface-variant/60">Leave “Next follow-up” empty if no further call is planned.</p>
    </form>
  );
}

function RegistrationCard({ e, config, canManage, onSaved }: { e: Enquiry; config: EnquiryFormConfig; canManage: boolean; onSaved: (e: Enquiry) => void }) {
  const [date, setDate] = useState(today());
  const [stageId, setStageId] = useState("");
  const [fee, setFee] = useState(config.registrationFee ? String(config.registrationFee) : "");
  const modes = usePaymentModes();
  const [mode, setMode] = useState("cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  if (!config.registration && !e.registrationNo) return null;
  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Registration</h3>
      {e.registrationNo ? (
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Registration no" value={<span className="font-mono">{e.registrationNo}</span>} />
          <Detail label="Date" value={formatDay(e.registrationDate)} />
          <Detail label="Registration fee" value={e.registrationFee ? `${rupees(e.registrationFee)} · ${modes.nameOf(e.registrationFeeMode ?? "cash")}` : "Not taken"} />
          {e.registrationFeeRef && <Detail label="Reference" value={<span className="font-mono text-xs">{e.registrationFeeRef}</span>} />}
        </div>
      ) : canManage && e.status === "open" ? (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">Not registered yet. Registering gives the next number ({config.numbers.registrationNo}).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Registration date" type="date" max={today()} value={date} onChange={(ev) => setDate(ev.target.value)} />
            <StageSelect stages={config.stages.filter((s) => !s.lost)} value={stageId} onChange={setStageId} current={e.stage.id} />
            <Input label="Registration fee received (₹)" type="number" min={0} value={fee} onChange={(ev) => setFee(ev.target.value)} placeholder="0 = none" />
            <Select label="Paid by" value={mode} onChange={setMode} options={modes.counter} />
            {Number(fee) > 0 && modes.needsReference(mode) && <Input label="Cheque / transaction no *" value={reference} onChange={(ev) => setReference(ev.target.value)} maxLength={60} />}
          </div>
          <div className="flex justify-end">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const amount = Math.max(0, Math.round(Number(fee) || 0));
                  const r = await admissionsApi.register(e.id, { registrationDate: date, ...(stageId ? { stageId } : {}), ...(amount ? { fee: { amount, mode, reference: reference.trim() || null } } : {}) });
                  showToast(`Registered as ${r.registrationNo}`, "success");
                  onSaved(r);
                } catch (err) {
                  showToast(errorMessage(err), "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Registering…" : "Register"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant/70">Not registered.</p>
      )}
    </Card>
  );
}

function TestCard({ e, config, canManage, onSaved }: { e: Enquiry; config: EnquiryFormConfig; canManage: boolean; onSaved: (e: Enquiry) => void }) {
  const [testDate, setTestDate] = useState(e.testDate ?? "");
  const [testScore, setTestScore] = useState(e.testScore ?? "");
  const results = useCodedList("admission_test_result");
  const [testResult, setTestResult] = useState<TestResult>(e.testResult === "not_needed" ? "pending" : e.testResult);
  const [stageId, setStageId] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  if (!config.test && e.testResult === "not_needed") return null;
  const editable = canManage && config.test && !e.student;
  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Entrance test / interaction</h3>
      {editable ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Date" type="date" value={testDate} onChange={(ev) => setTestDate(ev.target.value)} />
            <Input label="Score" maxLength={40} placeholder="e.g. 42/50" value={testScore} onChange={(ev) => setTestScore(ev.target.value)} />
            <Select label="Result" value={testResult} onChange={setTestResult} options={results.options} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            {e.status === "open" ? <StageSelect stages={config.stages.filter((s) => !s.lost)} value={stageId} onChange={setStageId} current={e.stage.id} /> : <span />}
            <div className="flex justify-end">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    onSaved(await admissionsApi.setTest(e.id, { testDate: testDate || null, testScore: testScore.trim() || null, testResult, ...(stageId ? { stageId } : {}) }));
                    setStageId("");
                    showToast("Test result saved", "success");
                  } catch (err) {
                    showToast(errorMessage(err), "error");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving…" : "Save result"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Detail label="Date" value={formatDay(e.testDate)} />
          <Detail label="Score" value={e.testScore} />
          <Detail label="Result" value={results.nameOf(e.testResult)} />
        </div>
      )}
    </Card>
  );
}

function EnquiryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canManage = can("enquiry.manage");
  const enquiry = useQuery({ queryKey: ["enquiry", id], queryFn: () => admissionsApi.get(id) });
  const config = useQuery({ queryKey: ["enquiry-form-config"], queryFn: admissionsApi.formConfig });
  const [editing, setEditing] = useState<EnquiryValues | null>(null);
  const [editCustom, setEditCustom] = useState<CustomValues>({});
  const extras = useFormExtras("enquiry");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reopen, setReopen] = useState("");

  const saved = (e: Enquiry) => {
    queryClient.setQueryData(["enquiry", id], e);
    queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    queryClient.invalidateQueries({ queryKey: ["enquiry-summary"] });
  };

  if (enquiry.isError) return <FormAlert>{errorMessage(enquiry.error)}</FormAlert>;
  if (!enquiry.data || !config.data) return <PageLoader />;
  const e = enquiry.data;
  const cfg = config.data;
  const canConvert = can("enquiry.convert") && can("student.create") && e.status !== "lost" && !e.student;

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setEditErrors({});
    setEditError(null);
    try {
      saved(await admissionsApi.update(e.id, { ...toEnquiryInput(editing, { includeFollowUp: false }), custom: editCustom }));
      setEditing(null);
      showToast("Saved", "success");
    } catch (err) {
      setEditError(errorMessage(err));
      setEditErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={[e.studentFirstName, e.studentLastName].filter(Boolean).join(" ")}
        description={`${e.enquiryNo} · ${e.class.name} · ${e.academicYear.name} · enquired ${formatDay(e.enquiryDate)}${e.online ? " (website)" : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admissions" className="px-4 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              All enquiries
            </Link>
            {canManage && !e.student && (
              <Button variant="secondary" onClick={() => (setEditing(fromEnquiry(e)), setEditCustom(e.custom ?? {}))}>
                Edit
              </Button>
            )}
            {canConvert && (
              <Link href={`/students/new?enquiry=${e.id}`} className="px-6 py-2.5 font-bold rounded-md bg-primary text-white hover:opacity-90 transition-all">
                Convert to admission
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {e.student && (
            <FormAlert tone="success">
              Admitted as{" "}
              <Link href={`/students/${e.student.id}`} className="underline">
                {e.student.name} ({e.student.admissionNo})
              </Link>
              {e.convertedAt ? ` on ${new Date(e.convertedAt).toLocaleDateString("en-IN")}` : ""}.
            </FormAlert>
          )}
          {e.status === "lost" && (
            <FormAlert tone="warning">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Closed as lost{e.lostReason ? `: ${e.lostReason.name}` : ""}.</span>
                {canManage && (
                  <span className="flex items-center gap-2">
                    <select value={reopen} onChange={(ev) => setReopen(ev.target.value)} className="rounded-lg bg-white/70 px-2 py-1 text-xs font-bold">
                      <option value="">Reopen at…</option>
                      {cfg.stages.filter((s) => s.isActive && !s.won && !s.lost).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={!reopen}
                      onClick={async () => {
                        try {
                          saved(await admissionsApi.setStage(e.id, { stageId: reopen, note: "Reopened" }));
                          setReopen("");
                        } catch (err) {
                          showToast(errorMessage(err), "error");
                        }
                      }}
                    >
                      Reopen
                    </Button>
                  </span>
                )}
              </div>
            </FormAlert>
          )}

          {canManage && e.status === "open" && (
            <Card>
              <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Log a follow-up</h3>
              <FollowUpForm e={e} config={cfg} onSaved={saved} />
            </Card>
          )}

          <Card>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">History</h3>
            {e.followUps.length ? (
              <ol className="space-y-4">
                {e.followUps.map((f) => (
                  <li key={f.id} className="flex gap-4 border-l-2 border-primary/20 pl-4">
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                        {formatDay(f.date)}
                        {f.outcome && <span className="ml-2 text-primary">{f.outcome.name}</span>}
                        {f.by && <span className="ml-2 normal-case tracking-normal font-semibold">by {f.by}</span>}
                      </p>
                      {f.note && <p className="text-sm mt-1 whitespace-pre-line">{f.note}</p>}
                      {f.nextDate && <p className="text-xs text-on-surface-variant/70 mt-1">Next follow-up: {formatDay(f.nextDate)}</p>}
                    </div>
                    {canManage && !e.student && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await confirm({ title: "Remove this follow-up?", message: "The note and its next follow-up date are deleted.", confirmLabel: "Remove", danger: true }))) return;
                          try {
                            saved(await admissionsApi.removeFollowUp(e.id, f.id));
                          } catch (err) {
                            showToast(errorMessage(err), "error");
                          }
                        }}
                        className="self-start text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-on-surface-variant/70">No follow-ups yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <StatusPill e={e} />
              <div className="text-right text-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Next follow-up</p>
                <FollowUpDate e={e} />
              </div>
            </div>
            {canManage && e.status === "open" && (
              <div className="mb-4">
                <Select
                  label="Stage"
                  value={e.stage.id}
                  onChange={async (stageId) => {
                    const to = cfg.stages.find((s) => s.id === stageId);
                    if (to?.lost) {
                      showToast("To close it as lost, log a follow-up with the Lost stage and the reason", "info");
                      return;
                    }
                    try {
                      saved(await admissionsApi.setStage(e.id, { stageId }));
                    } catch (err) {
                      showToast(errorMessage(err), "error");
                    }
                  }}
                  options={cfg.stages.filter((s) => (s.isActive && !s.won && !s.lost) || s.id === e.stage.id).map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Parent" value={`${e.parentName}${e.relation ? ` (${e.relation.name})` : ""}`} />
              <Detail label="Mobile" value={<a href={`tel:${e.mobile}`} className="font-mono text-primary underline">{e.mobile}</a>} />
              <Detail label="Email" value={e.email} />
              <Detail label="Area" value={e.area} />
              <Detail label="Date of birth" value={e.dateOfBirth ? formatDay(e.dateOfBirth) : null} />
              <Detail label="Gender" value={e.gender?.name} />
              <Detail label="Current school" value={e.currentSchool} />
              <Detail label="Source" value={e.source?.name} />
              <Detail label="Followed up by" value={e.assignedTo?.name} />
            </div>
            {e.remarks && (
              <div className="mt-4">
                <Detail label="Remarks" value={<span className="whitespace-pre-line font-normal">{e.remarks}</span>} />
              </div>
            )}
          </Card>
          {extras.data && <CustomFieldsView fields={extras.data.custom} values={e.custom ?? {}} />}
          <RegistrationCard e={e} config={cfg} canManage={canManage} onSaved={saved} />
          <TestCard key={`${e.testResult}-${e.testDate}-${e.testScore}`} e={e} config={cfg} canManage={canManage} onSaved={saved} />
          {canManage && !e.student && (
            <div className="text-right">
              <button
                type="button"
                onClick={async () => {
                  if (!(await confirm({ title: `Delete enquiry ${e.enquiryNo}?`, message: "Its follow-ups are deleted with it. This can't be undone.", confirmLabel: "Delete", danger: true }))) return;
                  try {
                    await admissionsApi.remove(e.id);
                    queryClient.invalidateQueries({ queryKey: ["enquiries"] });
                    queryClient.invalidateQueries({ queryKey: ["enquiry-summary"] });
                    router.push("/admissions");
                  } catch (err) {
                    showToast(errorMessage(err), "error");
                  }
                }}
                className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error"
              >
                Delete enquiry
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`Edit ${e.enquiryNo}`} width="max-w-5xl">
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {editError && <FormAlert>{editError}</FormAlert>}
            <EnquiryForm values={editing} onChange={setEditing} errors={editErrors} showFollowUp={false} custom={editCustom} onCustomChange={setEditCustom} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={saveEdit}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function EnquiryDetailPage() {
  return (
    <RequirePermission permission="enquiry.view">
      <EnquiryPage />
    </RequirePermission>
  );
}
