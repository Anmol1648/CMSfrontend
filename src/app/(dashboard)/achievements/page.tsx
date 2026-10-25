"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { AchievementInput, cocurricularApi, day, StudentHit, todayIso } from "@/lib/api/cocurricular";
import { LABEL, openServerFile, StudentSearch } from "@/components/cocurricular/Parts";

function Record({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const opts = useQuery({ queryKey: ["cocurricular", "comp-options"], queryFn: cocurricularApi.compOptions });
  const [student, setStudent] = useState<StudentHit | null>(null);
  const [f, setF] = useState<Omit<AchievementInput, "studentId">>({ title: "", categoryId: null, levelId: null, result: null, organiser: null, date: todayIso(), certificateId: null, points: 0 });
  const [file, setFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const ref = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!student) return;
    setError(null);
    try {
      await cocurricularApi.recordAchievement({ ...f, studentId: student.id });
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
      showToast("Achievement recorded", "success");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setFields(e instanceof ApiError ? e.fieldErrors() : {});
    }
  };
  const upload = async (x: File) => {
    try {
      setFile("Uploading…");
      const r = await cocurricularApi.upload(x);
      set("certificateId", r.id);
      setFile(r.name);
    } catch (e) {
      setFile(null);
      showToast(errorMessage(e), "error");
    }
  };
  const o = opts.data;
  return (
    <Modal isOpen onClose={onClose} title="Record an achievement" width="max-w-2xl">
      {!o ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {error && <FormAlert>{error}</FormAlert>}
          <div>
            <p className={LABEL}>Student</p>
            <div className="mt-2">
              {student ? (
                <p className="text-sm">
                  <b>{student.name}</b> {student.section} · {student.admissionNo}{" "}
                  <button type="button" onClick={() => setStudent(null)} className="ml-2 text-xs font-bold text-primary">
                    change
                  </button>
                </p>
              ) : (
                <StudentSearch onPick={setStudent} placeholder="Name or admission no" />
              )}
            </div>
          </div>
          <Input label="What" value={f.title} onChange={(e) => set("title", e.target.value)} error={fields.title} placeholder="District Chess Championship (Under-14)" maxLength={150} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Level" value={f.levelId ?? ""} onChange={(v) => set("levelId", v || null)} options={[{ value: "", label: "—" }, ...o.levels.filter((l) => !l.inSchool).map((l) => ({ value: l.id, label: l.name }))]} />
            <Select label="Category" value={f.categoryId ?? ""} onChange={(v) => set("categoryId", v || null)} options={[{ value: "", label: "—" }, ...o.categories.map((c) => ({ value: c.id, label: c.name }))]} />
            <Input label="Result" value={f.result ?? ""} onChange={(e) => set("result", e.target.value || null)} placeholder="1st / Gold medal / Selected for state" maxLength={100} />
            <Input label="Date" type="date" value={f.date} max={todayIso()} onChange={(e) => set("date", e.target.value)} error={fields.date} />
          </div>
          <Input label="Organised by" value={f.organiser ?? ""} onChange={(e) => set("organiser", e.target.value || null)} placeholder="District Chess Association" maxLength={150} />
          {o.points.achievements && (
            <Input label={`House points for ${student ? "their" : "the student’s"} house (0 = none)`} type="number" min={0} max={1000} value={String(f.points)} onChange={(e) => set("points", Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className={LABEL}>Certificate (photo or PDF)</p>
            {file ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {file}
                {f.certificateId && (
                  <button type="button" aria-label="Remove" onClick={() => (set("certificateId", null), setFile(null))}>
                    ×
                  </button>
                )}
              </span>
            ) : (
              <Button variant="tertiary" onClick={() => ref.current?.click()}>
                + Attach
              </Button>
            )}
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); e.target.value = ""; }} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!student || f.title.trim().length < 2 || file === "Uploading…"}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Achievements() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const opts = useQuery({ queryKey: ["cocurricular", "comp-options"], queryFn: cocurricularApi.compOptions });
  const [f, setF] = useState({ search: "", level: "", page: 1 });
  const q = useQuery({ queryKey: ["cocurricular", "achievements", f], queryFn: () => cocurricularApi.achievements(f) });
  const [adding, setAdding] = useState(false);
  const remove = async (id: string, title: string) => {
    if (!(await confirm({ title: "Delete this achievement?", message: `${title}. Its house points go too.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await cocurricularApi.deleteAchievement(id);
      qc.invalidateQueries({ queryKey: ["cocurricular"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const d = q.data;
  const pages = Math.max(1, Math.ceil((d?.total ?? 0) / 25));
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-3">
        <Input label="Student" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} icon="search" placeholder="Name or admission no" />
        <Select label="Level" value={f.level} onChange={(v) => setF({ ...f, level: v, page: 1 })} options={[{ value: "", label: "All" }, ...(opts.data?.levels ?? []).filter((l) => !l.inSchool).map((l) => ({ value: l.id, label: l.name }))]} />
        <div className="flex items-end justify-end">{d?.can.record && <Button onClick={() => setAdding(true)}>Record an achievement</Button>}</div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {d!.rows.map((r) => (
                <tr key={r.id} className="border-t border-outline-variant/10 first:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{day(r.date)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/students/${r.studentId}`} className="font-semibold hover:text-primary">
                      {r.student}
                    </Link>
                    <span className="block text-xs text-on-surface-variant">{r.section}</span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">🏆 {r.title}</p>
                    <p className="text-xs text-on-surface-variant">{[r.level, r.category, r.organiser].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-3">{r.result && <Pill tone="success">{r.result}</Pill>}</td>
                  <td className="px-3 py-3 text-xs font-bold text-green-700">{r.points ? `+${r.points} house pts` : ""}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {r.certificateId && (
                      <button type="button" onClick={() => openServerFile(cocurricularApi.certificatePath(r.id))} className="mr-3 text-xs font-bold text-primary hover:opacity-70">
                        Certificate
                      </button>
                    )}
                    {d!.can.record && (
                      <button type="button" onClick={() => remove(r.id, r.title)} className="text-xs font-bold text-error hover:opacity-70">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!d!.rows.length && (
                <tr>
                  <td className="px-4 py-12 text-center text-on-surface-variant">No achievements recorded this session.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="secondary" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>
            Previous
          </Button>
          <span>
            {f.page} / {pages}
          </span>
          <Button variant="secondary" disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })}>
            Next
          </Button>
        </div>
      )}
      {adding && <Record onClose={() => setAdding(false)} />}
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <RequirePermission permission={["cocurricular.view", "achievement.record"]}>
      <PageHeader title="Achievements" description="What students win outside the school: district, state and national competitions, olympiads, inter-school events. Places in the school’s own competitions are under Competitions." />
      <Achievements />
    </RequirePermission>
  );
}
