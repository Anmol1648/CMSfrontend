"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Band, examsApi, GradeScale, ResultRule, ResultRuleInput } from "@/lib/api/exams";
import { useExamLabels } from "@/components/exams/useExamLabels";

function ScaleForm({ scale, onClose }: { scale: GradeScale | null; onClose: () => void }) {
  const { kinds } = useExamLabels();
  const queryClient = useQueryClient();
  const [v, setV] = useState<Omit<GradeScale, "id">>(scale ? { name: scale.name, kind: scale.kind, bands: scale.bands } : { name: "", kind: "marks", bands: [{ grade: "A", min: 75 }, { grade: "B", min: 50 }, { grade: "C", min: 33 }, { grade: "D", min: 0 }] });
  const [error, setError] = useState<string | null>(null);
  const setBand = (i: number, patch: Partial<Band>) => setV((x) => ({ ...x, bands: x.bands.map((b, k) => (k === i ? { ...b, ...patch } : b)) }));
  const save = async () => {
    setError(null);
    try {
      queryClient.setQueryData(["exam-scales"], await examsApi.saveScale(scale?.id ?? null, { ...v, bands: v.bands.map((b) => ({ grade: b.grade, ...(v.kind === "marks" ? { min: Number(b.min ?? 0), ...(b.point != null && String(b.point) !== "" ? { point: Number(b.point) } : {}) } : {}), ...(b.remark ? { remark: b.remark } : {}) })) }));
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={scale ? `Edit ${scale.name}` : "Add a grading scale"} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
          <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} />
          <Select label="Kind" value={v.kind} onChange={(k) => setV({ ...v, kind: k as GradeScale["kind"] })} options={[{ value: "marks", label: kinds.marks }, { value: "descriptive", label: kinds.descriptive }]} />
        </div>
        <div className="space-y-2">
          {v.bands.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_5rem_2fr_auto] gap-2 items-end">
              <Input label={i === 0 ? "Grade" : undefined} value={b.grade} onChange={(e) => setBand(i, { grade: e.target.value })} maxLength={20} />
              {v.kind === "marks" ? <Input label={i === 0 ? "From %" : undefined} type="number" min={0} max={100} value={b.min == null ? "" : String(b.min)} onChange={(e) => setBand(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} /> : <span />}
              {v.kind === "marks" ? <Input label={i === 0 ? "Point" : undefined} type="number" min={0} value={b.point == null ? "" : String(b.point)} onChange={(e) => setBand(i, { point: e.target.value === "" ? undefined : Number(e.target.value) })} /> : <span />}
              <Input label={i === 0 ? "Meaning" : undefined} value={b.remark ?? ""} onChange={(e) => setBand(i, { remark: e.target.value })} maxLength={60} />
              <button type="button" disabled={v.bands.length <= 2} onClick={() => setV({ ...v, bands: v.bands.filter((_, k) => k !== i) })} className="pb-3 text-xs font-bold uppercase tracking-widest text-error disabled:opacity-30">
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setV({ ...v, bands: [...v.bands, { grade: "", min: 0 }] })} className="text-xs font-bold uppercase tracking-widest text-primary">
            + Grade
          </button>
          {v.kind === "marks" && <p className="text-[11px] text-on-surface-variant/70">A % gets the highest grade whose “from %” it reaches; one grade must start at 0.</p>}
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={v.name.trim().length < 2}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RuleForm({ rule, scales, onClose }: { rule: ResultRule | null; scales: GradeScale[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState<ResultRuleInput>(
    rule
      ? (({ id: _id, group: _g, ...r }) => r)(rule)
      : { classGroupId: null, descriptive: false, gradeScaleId: scales.find((s) => s.kind === "marks")?.id ?? null, coScaleId: scales.find((s) => s.kind === "descriptive")?.id ?? null, passPercent: 33, passEachPart: false, graceMarks: 0, graceSubjects: 0, showRank: false, showAttendance: true }
  );
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ResultRuleInput>) => setV((x) => ({ ...x, ...patch }));
  const save = async () => {
    setError(null);
    try {
      queryClient.setQueryData(["exam-rules"], await examsApi.saveRule(rule?.id ?? null, v));
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const scaleOptions = (kind?: "marks" | "descriptive") => scales.filter((s) => !kind || s.kind === kind).map((s) => ({ value: s.id, label: s.name }));
  return (
    <Modal isOpen onClose={onClose} title={rule ? `Result rule: ${rule.group}` : "Add a result rule"} width="max-w-2xl">
      <div className="space-y-4">
        {!rule || rule.classGroupId ? (
          <MasterSelect master="class_group" label="For the class group" value={v.classGroupId ?? ""} onChange={(id) => set({ classGroupId: id || null })} placeholder="Choose…" />
        ) : (
          <p className="text-sm text-on-surface-variant">For every class whose group has no rule of its own.</p>
        )}
        <Checkbox label="Grades only, no marks (e.g. pre-primary)" checked={v.descriptive} onChange={(c) => set({ descriptive: c, gradeScaleId: scales.find((s) => s.kind === (c ? "descriptive" : "marks"))?.id ?? null })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label={v.descriptive ? "Grades for subjects" : "Grading scale for marks"} value={v.gradeScaleId ?? ""} onChange={(x) => set({ gradeScaleId: x || null })} options={scaleOptions(v.descriptive ? "descriptive" : "marks")} />
          <Select label="Grades for co-scholastic areas" value={v.coScaleId ?? ""} onChange={(x) => set({ coScaleId: x || null })} options={scaleOptions("descriptive")} />
        </div>
        {!v.descriptive && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Pass mark in a subject (%)" type="number" min={0} max={100} value={String(v.passPercent)} onChange={(e) => set({ passPercent: Number(e.target.value) })} />
              <Input label="Grace: up to marks" type="number" min={0} max={20} value={String(v.graceMarks)} onChange={(e) => set({ graceMarks: Number(e.target.value) })} />
              <Input label="Grace: in at most subjects" type="number" min={0} max={5} value={String(v.graceSubjects)} onChange={(e) => set({ graceSubjects: Number(e.target.value) })} />
            </div>
            <Checkbox label="Each part (theory, practical…) must be passed on its own" checked={v.passEachPart} onChange={(c) => set({ passEachPart: c })} />
            <Checkbox label="Show rank on report cards" checked={v.showRank} onChange={(c) => set({ showRank: c })} />
          </>
        )}
        <Checkbox label="Show attendance on report cards" checked={v.showAttendance} onChange={(c) => set({ showAttendance: c })} />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function Setup() {
  const labels = useExamLabels();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("rules");
  const scales = useQuery({ queryKey: ["exam-scales"], queryFn: examsApi.scales });
  const rules = useQuery({ queryKey: ["exam-rules"], queryFn: examsApi.rules });
  const [scale, setScale] = useState<GradeScale | "new" | null>(null);
  const [rule, setRule] = useState<ResultRule | "new" | null>(null);
  const name = (id: string | null) => scales.data?.find((s) => s.id === id)?.name ?? "—";
  const remove = async (kind: "scale" | "rule", id: string, label: string) => {
    if (!(await confirm({ title: `Delete ${label}?`, confirmLabel: "Delete", danger: true }))) return;
    try {
      if (kind === "scale") queryClient.setQueryData(["exam-scales"], await examsApi.deleteScale(id));
      else queryClient.setQueryData(["exam-rules"], await examsApi.deleteRule(id));
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <>
      <PageHeader title="Grading & Result Rules" description="How marks become grades, and how results are worked out for each class group: pass mark, grace, rank, attendance; pre-primary can use grades only." />
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: "rules", label: "Result rules" },
            { id: "scales", label: "Grading scales" },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
      </div>
      {(!scales.data || !rules.data) && <PageLoader />}
      {tab === "rules" && rules.data && scales.data && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex justify-end px-5 pt-4">
            <Button variant="secondary" onClick={() => setRule("new")}>
              Add rule for a class group
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <tbody>
                {rules.data.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10">
                    <td className="px-5 py-3">
                      <p className="font-semibold">{r.group}</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        {r.descriptive ? `Grades only (${name(r.gradeScaleId)})` : `${name(r.gradeScaleId)} · pass ${r.passPercent}%${r.passEachPart ? " in each part" : ""}${r.graceMarks ? ` · grace up to ${r.graceMarks} marks in ${r.graceSubjects} subjects` : ""}`} · co-scholastic {name(r.coScaleId)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {r.showRank && <Pill tone="primary">Rank</Pill>} {r.showAttendance && <Pill>Attendance</Pill>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setRule(r)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                        Edit
                      </button>
                      {r.classGroupId && (
                        <button type="button" onClick={() => remove("rule", r.id, `the rule for ${r.group}`)} className="ml-4 text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {tab === "scales" && scales.data && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setScale("new")}>
              Add grading scale
            </Button>
          </div>
          {scales.data.map((s) => (
            <Card key={s.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-[11px] text-on-surface-variant/70">{s.kind === "marks" ? labels.kinds.marks : labels.kinds.descriptive}</p>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setScale(s)} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove("scale", s.id, s.name)} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.bands.map((b) => (
                  <span key={b.grade} className="rounded-lg bg-surface-container-low px-3 py-1.5 text-xs">
                    <b>{b.grade}</b>
                    {b.min != null && <span className="text-on-surface-variant/70"> {b.min}%+</span>}
                    {b.remark && <span className="text-on-surface-variant/70"> · {b.remark}</span>}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      {scale && <ScaleForm scale={scale === "new" ? null : scale} onClose={() => setScale(null)} />}
      {rule && scales.data && <RuleForm rule={rule === "new" ? null : rule} scales={scales.data} onClose={() => setRule(null)} />}
    </>
  );
}

export default function ExamSetupPage() {
  return (
    <RequirePermission permission="exam.setup">
      <Setup />
    </RequirePermission>
  );
}
