"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { examsApi, ScopeKind } from "@/lib/api/exams";
import { useExamLabels } from "@/components/exams/useExamLabels";
import { cn } from "@/lib/utils";

const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function Results() {
  const labels = useExamLabels();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const [yearId, setYearId] = useState("");
  const [scope, setScope] = useState<string>("");
  const [section, setSection] = useState("");
  const [tab, setTab] = useState("students");
  const [card, setCard] = useState<{ student?: string; name: string } | null>(null);
  const choices = useQuery({ queryKey: ["exam-choices", yearId], queryFn: () => examsApi.choices(yearId), enabled: !!yearId });
  const c = choices.data;
  // scope = "exam:<id>" | "term:<id>" | "final:<year>"
  useEffect(() => {
    if (!c) return;
    if (!scope) {
      const lastPublished = [...c.exams].reverse().find((e) => e.published) ?? c.exams[c.exams.length - 1];
      if (lastPublished) setScope(`exam:${lastPublished.id}`);
    }
    if (!section && c.sections.length) setSection(c.sections[0].id);
  }, [c, scope, section]);
  const [kind, id] = scope ? (scope.split(":") as [ScopeKind, string]) : (["exam", ""] as [ScopeKind, string]);
  const r = useQuery({ queryKey: ["exam-results", scope, section], queryFn: () => examsApi.results(kind, id, section), enabled: !!scope && !!section });
  const d = r.data;
  const publishing = kind !== "exam" && can("exam.publish");
  const published = kind === "term" ? c?.terms.find((t) => t.id === id)?.published : kind === "final" ? c?.finalPublished : c?.exams.find((e) => e.id === id)?.published;
  const togglePublish = async () => {
    const on = !published;
    if (!(await confirm({ title: `${on ? "Publish" : "Unpublish"} ${d?.scope.label}?`, message: on ? "Students and parents can see this result and its report card." : "Students and parents no longer see it.", confirmLabel: on ? "Publish" : "Unpublish" }))) return;
    try {
      await examsApi.publishScope(yearId, kind as "term" | "final", kind === "term" ? id : null, on);
      queryClient.invalidateQueries({ queryKey: ["exam-choices", yearId] });
      queryClient.invalidateQueries({ queryKey: ["exam-results"] });
      showToast(on ? "Published" : "Unpublished", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const docParams = (student?: string) => ({ scope: kind, id, ...(student ? { student } : { section }) });
  return (
    <>
      <PageHeader title="Results & Report Cards" description="Results of an exam, a term (its exams by weightage) or the whole session, section by section, with the analysis and the report cards." />
      <Card className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-56">
          <YearSelect value={yearId} onChange={(y) => { setYearId(y); setScope(""); setSection(""); }} />
        </div>
        <Select
          label="Result of"
          value={scope}
          onChange={setScope}
          className="w-full sm:w-72"
          options={[
            { value: "", label: "Choose…" },
            ...(c?.exams ?? []).map((e) => ({ value: `exam:${e.id}`, label: `${e.name}${e.published ? "" : " (not published)"}` })),
            ...(c?.terms ?? []).map((t) => ({ value: `term:${t.id}`, label: `${t.name} (its exams)${t.published ? "" : " · not published"}` })),
            ...(yearId ? [{ value: `final:${yearId}`, label: `${labels.finalName} of the session${c?.finalPublished ? "" : " · not published"}` }] : []),
          ]}
        />
        <Select label="Section" value={section} onChange={setSection} className="w-full sm:w-48" options={(c?.sections ?? []).map((s) => ({ value: s.id, label: s.label }))} />
        <div className="flex flex-wrap gap-3 sm:ml-auto">
          {publishing && d && (
            <Button variant="secondary" onClick={togglePublish}>
              {published ? "Unpublish" : "Publish"} {kind === "final" ? "final result" : "term result"}
            </Button>
          )}
          <Button onClick={() => setCard({ name: d?.section.label ?? "" })} disabled={!d?.students.length}>
            Report cards ({d?.students.length ?? 0})
          </Button>
        </div>
      </Card>
      {c && !c.sections.length && <FormAlert tone="info">You see the results of the sections you teach; none in this session.</FormAlert>}
      {r.isError && <FormAlert>{errorMessage(r.error)}</FormAlert>}
      {scope && section && !d && !r.isError && <PageLoader />}
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Pass %", value: pct(d.analysis.passPercent), tone: (d.analysis.passPercent ?? 100) < 75 ? "text-error" : "text-emerald-700" },
              { label: "Average", value: pct(d.analysis.average), tone: "text-primary" },
              { label: "Results ready", value: `${d.analysis.withResult}/${d.analysis.students}`, tone: "text-primary" },
              { label: "Need support", value: String(d.analysis.needSupport.length), tone: d.analysis.needSupport.length ? "text-amber-700" : "text-emerald-700" },
            ].map((x) => (
              <Card key={x.label} padding="sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{x.label}</p>
                <p className={cn("text-2xl font-extrabold", x.tone)}>{x.value}</p>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Pill tone={d.scope.published ? "success" : "warning"}>{d.scope.published ? "Published" : "Not published"}</Pill>
            <span className="text-on-surface-variant/70">
              {d.section.label} · {d.scope.label} · {d.year}
              {d.exams.length > 1 && ` · ${d.exams.map((e) => `${e.shortName}${e.weightage ? ` ${e.weightage}%` : ""}`).join(" + ")}`}
            </span>
          </div>
          <Tabs
            tabs={[
              { id: "students", label: "Students" },
              { id: "analysis", label: "Analysis" },
            ]}
            activeTab={tab}
            onChange={setTab}
          />
          {tab === "students" && (
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                      <th className="px-3 py-3 font-bold">Roll</th>
                      <th className="px-3 py-3 font-bold">Student</th>
                      {d.subjects.map((s) => (
                        <th key={s.id} className="px-3 py-3 font-bold text-center">
                          {s.name}
                        </th>
                      ))}
                      {!d.rule.descriptive && <th className="px-3 py-3 font-bold text-center">Total</th>}
                      {!d.rule.descriptive && <th className="px-3 py-3 font-bold text-center">%</th>}
                      {!d.rule.descriptive && <th className="px-3 py-3 font-bold text-center">Grade</th>}
                      {d.rule.showRank && <th className="px-3 py-3 font-bold text-center">Rank</th>}
                      <th className="px-3 py-3 font-bold">Result</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {d.students.map((s) => (
                      <tr key={s.student.id} className="border-t border-outline-variant/10">
                        <td className="px-3 py-2 text-xs">{s.student.roll ?? "—"}</td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{s.student.name}</td>
                        {s.subjects.map((x) => (
                          <td key={x.subjectId} className={cn("px-3 py-2 text-center whitespace-nowrap", x.passed === false && "text-error font-bold")}>
                            {d.rule.descriptive ? (x.grade ?? "—") : x.percent == null ? (x.exams.find((e) => e.status !== "P" && e.status !== "none")?.status ?? "—") : `${d.exams.length === 1 ? x.exams[0]?.obtained ?? "—" : `${x.percent}%`}`}
                            {!d.rule.descriptive && x.grade && <span className="block text-[10px] text-on-surface-variant/60">{x.grade}{x.grace ? ` (+${x.grace})` : ""}</span>}
                          </td>
                        ))}
                        {!d.rule.descriptive && <td className="px-3 py-2 text-center text-xs">{s.totalMax ? `${s.totalObtained}/${s.totalMax}` : "—"}</td>}
                        {!d.rule.descriptive && <td className="px-3 py-2 text-center font-bold">{pct(s.percent)}</td>}
                        {!d.rule.descriptive && <td className="px-3 py-2 text-center font-bold">{s.grade ?? "—"}</td>}
                        {d.rule.showRank && <td className="px-3 py-2 text-center">{s.rank ?? "—"}</td>}
                        <td className="px-3 py-2 text-xs">
                          {s.result ? <Pill tone={s.failedSubjects.length ? "danger" : "success"}>{s.result}</Pill> : <span className="text-on-surface-variant/60">not ready</span>}
                          {s.promotedTo && <p className="text-[10px] text-on-surface-variant/70 mt-0.5">→ {s.promotedTo}</p>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => setCard({ student: s.student.id, name: s.student.name })} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
                            Card
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {tab === "analysis" && (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card padding="none" className="overflow-hidden">
                <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">Subjects</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                        <th className="px-5 py-2 font-bold">Subject</th>
                        <th className="px-5 py-2 font-bold">Average</th>
                        <th className="px-5 py-2 font-bold">Highest</th>
                        <th className="px-5 py-2 font-bold">Lowest</th>
                        <th className="px-5 py-2 font-bold">Pass %</th>
                        <th className="px-5 py-2 font-bold">Grades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.analysis.subjects.map((s) => (
                        <tr key={s.subject} className="border-t border-outline-variant/10">
                          <td className="px-5 py-2 font-semibold">{s.subject}</td>
                          <td className="px-5 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-surface-container overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${s.average ?? 0}%` }} />
                              </div>
                              {pct(s.average)}
                            </div>
                          </td>
                          <td className="px-5 py-2">{pct(s.highest)}</td>
                          <td className="px-5 py-2">{pct(s.lowest)}</td>
                          <td className={cn("px-5 py-2 font-bold", (s.passPercent ?? 100) < 75 ? "text-error" : "text-emerald-700")}>{pct(s.passPercent)}</td>
                          <td className="px-5 py-2 text-[11px] text-on-surface-variant/80">
                            {Object.entries(s.grades)
                              .map(([g, n]) => `${g}: ${n}`)
                              .join(" · ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-2">Toppers</h3>
                  {d.analysis.toppers.map((t, i) => (
                    <p key={t.name} className="flex justify-between text-sm py-1">
                      <span>
                        {i + 1}. {t.name}
                      </span>
                      <b>
                        {pct(t.percent)} {t.grade}
                      </b>
                    </p>
                  ))}
                  {!d.analysis.toppers.length && <p className="text-sm text-on-surface-variant/70">—</p>}
                </Card>
                <Card>
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-2">Need support</h3>
                  {d.analysis.needSupport.map((n) => (
                    <p key={n.name} className="text-sm py-1">
                      <b>{n.name}</b> <span className="text-xs text-error">{n.subjects.join(", ")}</span>
                    </p>
                  ))}
                  {!d.analysis.needSupport.length && <p className="text-sm text-emerald-700">Everyone passed. ✓</p>}
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
      {card && d && <DocumentViewer docKey="report_card" params={docParams(card.student)} title={`Report card · ${card.name}`} filename={`report-card-${card.name}.pdf`} onClose={() => setCard(null)} />}
    </>
  );
}

export default function ResultsPage() {
  return (
    <RequirePermission permission="exam.view">
      <Results />
    </RequirePermission>
  );
}
