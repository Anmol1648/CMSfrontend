"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { examsApi, ScopeKind } from "@/lib/api/exams";
import { exams2Api } from "@/lib/api/exams2";
import { cn } from "@/lib/utils";

const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

/** A horizontal bar for a %. */
function Bar({ value, tone = "primary" }: { value: number | null; tone?: "primary" | "warn" }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-container">
      <div className={cn("h-2 rounded-full", tone === "warn" ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}

function Analysis() {
  const [yearId, setYearId] = useState("");
  const [scope, setScope] = useState("");
  const [classId, setClassId] = useState("");
  const [run, setRun] = useState<{ kind: ScopeKind; id: string; classId: string } | null>(null);
  const choices = useQuery({ queryKey: ["exams", "choices", yearId], queryFn: () => examsApi.choices(yearId), enabled: !!yearId });
  const q = useQuery({ queryKey: ["exams2", "analysis", run], queryFn: () => exams2Api.analysis(run!.kind, run!.id, run!.classId || undefined), enabled: !!run });
  const classes = Array.from(new Map((choices.data?.sections ?? []).map((s) => [s.classId, s.label.split("-")[0]])).entries());
  const scopes = [...(choices.data?.exams ?? []).map((e) => ({ value: `exam:${e.id}`, label: e.name })), ...(choices.data?.terms ?? []).map((t) => ({ value: `term:${t.id}`, label: `${t.name} (term result)` })), ...(yearId ? [{ value: `final:${yearId}`, label: "Session result so far" }] : [])];
  const d = q.data;
  const gradeTotal = d ? Object.values(d.grades).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto] items-end">
          <YearSelect value={yearId} onChange={(y) => { setYearId(y); setScope(""); setRun(null); }} />
          <Select label="Result of" value={scope} onChange={setScope} options={[{ value: "", label: "Choose…" }, ...scopes]} />
          <Select label="Classes" value={classId} onChange={setClassId} options={[{ value: "", label: "All classes" }, ...classes.map(([id, name]) => ({ value: id, label: name }))]} />
          <Button disabled={!scope} onClick={() => { const [kind, id] = scope.split(":"); setRun({ kind: kind as ScopeKind, id, classId }); }}>
            Analyse
          </Button>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">Works out every section’s result; for the whole school this can take some seconds.</p>
      </Card>
      {q.isLoading && run ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : d ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="font-extrabold mb-3">Sections</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                    <th className="py-1">Section</th>
                    <th className="text-right">Students</th>
                    <th className="w-32">Pass %</th>
                    <th className="text-right">Average</th>
                    <th className="pl-3">Top</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sections.map((s) => (
                    <tr key={s.sectionId} className="border-t border-outline-variant/15">
                      <td className="py-1.5 font-bold">{s.section}</td>
                      <td className="text-right">{s.withResult}/{s.students}</td>
                      <td className="px-2">
                        <div className="flex items-center gap-2">
                          <Bar value={s.passPercent} tone={(s.passPercent ?? 100) < 80 ? "warn" : "primary"} />
                          <span className="text-xs w-10">{pct(s.passPercent)}</span>
                        </div>
                      </td>
                      <td className="text-right">{pct(s.average)}</td>
                      <td className="pl-3 text-xs">{s.top ? `${s.top.name} (${s.top.percent}%)` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <p className="font-extrabold mb-3">Subjects across the school</p>
              <ul className="space-y-2 text-sm">
                {d.subjects.map((s) => (
                  <li key={s.subject}>
                    <div className="flex justify-between">
                      <span className="font-bold">{s.subject}</span>
                      <span className="text-xs text-on-surface-variant">
                        avg {pct(s.average)} · pass {pct(s.passPercent)} · top {s.highest}%
                      </span>
                    </div>
                    <Bar value={s.average} tone={(s.passPercent ?? 100) < 80 ? "warn" : "primary"} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <p className="font-extrabold mb-3">Grades</p>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(d.grades)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([g, n]) => (
                    <li key={g} className="flex items-center gap-2">
                      <span className="w-8 font-bold">{g}</span>
                      <Bar value={gradeTotal ? (n / gradeTotal) * 100 : 0} />
                      <span className="w-10 text-right text-xs">{n}</span>
                    </li>
                  ))}
              </ul>
            </Card>
            <Card>
              <p className="font-extrabold mb-3">Toppers</p>
              <ol className="space-y-1 text-sm">
                {d.toppers.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-5 font-bold">{i + 1}</span>
                    <span className="flex-1">
                      {t.name} <span className="text-xs text-on-surface-variant">{t.section}</span>
                    </span>
                    <b>{t.percent}%</b>
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <p className="font-extrabold mb-1">Students at risk</p>
              <p className="text-xs text-on-surface-variant mb-2">Failing 2 or more subjects.</p>
              <ul className="space-y-1 text-sm max-h-64 overflow-auto">
                {d.atRisk.map((r, i) => (
                  <li key={i}>
                    <b>{r.name}</b> <span className="text-xs text-on-surface-variant">{r.section}</span>
                    <span className="block text-xs text-error">{r.subjects.join(", ")}</span>
                  </li>
                ))}
                {!d.atRisk.length && <li className="text-on-surface-variant">None. 👍</li>}
              </ul>
            </Card>
          </div>
          {d.previous && (
            <Card>
              <p className="font-extrabold mb-1">Marks fell since {d.previous}</p>
              <p className="text-xs text-on-surface-variant mb-2">By 10% or more.</p>
              <div className="flex flex-wrap gap-2">
                {d.fell.map((f, i) => (
                  <Pill key={i} tone="warning">
                    {f.name} ({f.section}): {f.from}% → {f.to}%
                  </Pill>
                ))}
                {!d.fell.length && <span className="text-sm text-on-surface-variant">No one.</span>}
              </div>
            </Card>
          )}
          <Card padding="none">
            <p className="font-extrabold px-5 pt-4 pb-2">Subject teachers</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-5 py-1">Teacher</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th className="text-right">Students</th>
                  <th className="text-right">Average</th>
                  <th className="text-right px-5">Pass %</th>
                </tr>
              </thead>
              <tbody>
                {d.teachers.map((t, i) => (
                  <tr key={i} className="border-t border-outline-variant/15">
                    <td className="px-5 py-1.5 font-bold">{t.teacher}</td>
                    <td>{t.subject}</td>
                    <td>{t.section}</td>
                    <td className="text-right">{t.students}</td>
                    <td className="text-right">{pct(t.average)}</td>
                    <td className={cn("text-right px-5", (t.passPercent ?? 100) < 80 && "text-amber-700 font-bold")}>{pct(t.passPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default function ExamAnalysisPage() {
  return (
    <RequirePermission permission={["exam.analysis", "exam.view"]}>
      <PageHeader title="Result Analysis" description="Sections compared, subjects across the school, subject teachers’ results, the grade spread, toppers, students at risk and students whose marks fell." />
      <Analysis />
    </RequirePermission>
  );
}
