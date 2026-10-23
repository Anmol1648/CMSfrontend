"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { YearSelect } from "@/components/academic/YearSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Outcome, OUTCOME, promotionApi, SectionPromotion } from "@/lib/api/promotion";
import { cn } from "@/lib/utils";

type Choice = { outcome: Outcome; toSectionId: string | null };
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** One section: each student promoted / kept back / passed out / leaving, then done in one go. */
function SectionScreen({ yearId, sectionId, onBack }: { yearId: string; sectionId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["promotion-section", yearId, sectionId], queryFn: () => promotionApi.section(yearId, sectionId) });
  const [choice, setChoice] = useState<Record<string, Choice>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const v = q.data;

  useEffect(() => {
    if (!v) return;
    setChoice(Object.fromEntries(v.students.filter((s) => !s.done).map((s) => [s.id, { ...s.suggestion }])));
    setPicked(v.students.filter((s) => !s.done).map((s) => s.id));
  }, [v]);

  const pending = useMemo(() => (v?.students ?? []).filter((s) => !s.done), [v]);
  const done = useMemo(() => (v?.students ?? []).filter((s) => s.done), [v]);
  const sectionsFor = (o: Outcome, view: SectionPromotion) => (o === "promoted" ? view.targets : o === "detained" ? view.sameClassSections : []);
  const setOne = (id: string, patch: Partial<Choice>, view: SectionPromotion) =>
    setChoice((c) => {
      const next = { ...c[id], ...patch };
      if (patch.outcome) next.toSectionId = patch.outcome === "promoted" ? view.defaults.promoted : patch.outcome === "detained" ? view.defaults.detained : null;
      return { ...c, [id]: next };
    });
  const setAll = (o: Outcome, view: SectionPromotion) => setChoice((c) => Object.fromEntries(Object.entries(c).map(([id, x]) => [id, picked.includes(id) ? { outcome: o, toSectionId: o === "promoted" ? view.defaults.promoted : o === "detained" ? view.defaults.detained : null } : x])));

  const run = async () => {
    if (!v) return;
    const rows = picked.map((id) => ({ studentId: id, ...choice[id] }));
    const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length;
    const missingSection = rows.find((r) => (r.outcome === "promoted" || r.outcome === "detained") && !r.toSectionId);
    if (missingSection) return showToast("Choose a section for every student promoted or kept back", "error");
    const parts = [count("promoted") && `${count("promoted")} promoted to ${v.nextClass?.name}`, count("detained") && `${count("detained")} kept back`, count("passed_out") && `${count("passed_out")} passed out`, count("leaving") && `${count("leaving")} leaving (a TC is asked for)`].filter(Boolean);
    if (!(await confirm({ title: `${v.section.label}: ${rows.length} student${rows.length === 1 ? "" : "s"} into ${v.to?.name}?`, message: <span>{parts.join(" · ")}. Fees still due are carried to {v.to?.name} if the school chose that. It can be undone while {v.to?.name} hasn’t been used for them.</span>, confirmLabel: "Do it" }))) return;
    setBusy(true);
    try {
      const r = await promotionApi.promote({ year: yearId, section: sectionId, students: rows });
      setWarnings(r.warnings);
      showToast(`${r.promoted} promoted, ${r.detained} kept back, ${r.passedOut} passed out, ${r.leaving} leaving${r.carried ? ` · ${rupees(r.carried)} dues carried` : ""}`, "success");
      queryClient.invalidateQueries({ queryKey: ["promotion-section", yearId, sectionId] });
      queryClient.invalidateQueries({ queryKey: ["promotion-overview", yearId] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const undo = async (ids: string[]) => {
    if (!(await confirm({ title: `Undo ${ids.length} promotion${ids.length === 1 ? "" : "s"}?`, message: "They come off the new session (with any dues carried); passed-out students become active again. Not possible once the new session has their attendance or fee receipts.", confirmLabel: "Undo", danger: true }))) return;
    try {
      const r = await promotionApi.undo(yearId, ids);
      setWarnings(r.warnings);
      showToast(`${r.undone} undone`, "success");
      queryClient.invalidateQueries({ queryKey: ["promotion-section", yearId, sectionId] });
      queryClient.invalidateQueries({ queryKey: ["promotion-overview", yearId] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!v) return <PageLoader />;
  const blocked = !!v.missing;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        All sections
      </button>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-primary">{v.section.label}</h2>
          <p className="text-sm text-on-surface-variant/70">
            {v.from.name} → {v.to?.name ?? "no next session"} · {v.nextClass ? `promoted to ${v.nextClass.name}` : `${v.section.className} is the last class: students pass out`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Pill tone="neutral">{pending.length} to do</Pill>
          <Pill tone="success">{done.length} done</Pill>
        </div>
      </Card>
      {blocked && (
        <FormAlert tone="warning">
          {v.missing}{" "}
          <Link href="/academic/years" className="font-bold underline">
            Academic Years
          </Link>
        </FormAlert>
      )}
      {warnings.length > 0 && (
        <FormAlert tone="warning">
          {warnings.map((w, i) => (
            <span key={i} className="block">
              {w}
            </span>
          ))}
        </FormAlert>
      )}

      {pending.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-outline-variant/10">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">For the {picked.length} ticked:</span>
            {(Object.keys(OUTCOME) as Outcome[]).filter((o) => o !== "promoted" || v.nextClass).map((o) => (
              <button key={o} type="button" disabled={blocked || !picked.length} onClick={() => setAll(o, v)} className="rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-bold text-primary hover:bg-surface-container disabled:opacity-50">
                {OUTCOME[o].label}
              </button>
            ))}
            <Button className="ml-auto" onClick={run} loading={busy} disabled={blocked || !picked.length}>
              Do it for {picked.length}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3">
                    <input type="checkbox" aria-label="Tick all" className="h-4 w-4 accent-[#1A365D]" checked={picked.length === pending.length} onChange={(e) => setPicked(e.target.checked ? pending.map((s) => s.id) : [])} />
                  </th>
                  <th className="px-4 py-3 font-bold">Roll</th>
                  <th className="px-4 py-3 font-bold">Student</th>
                  <th className="px-4 py-3 font-bold">Attendance</th>
                  <th className="px-4 py-3 font-bold">Fees due</th>
                  <th className="px-4 py-3 font-bold">Result</th>
                  <th className="px-4 py-3 font-bold">Section in {v.to?.name ?? "next session"}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((s) => {
                  const c = choice[s.id] ?? s.suggestion;
                  const options = sectionsFor(c.outcome, v);
                  return (
                    <tr key={s.id} className={cn("border-t border-outline-variant/10", !picked.includes(s.id) && "opacity-50")}>
                      <td className="px-4 py-2">
                        <input type="checkbox" aria-label={`Tick ${s.name}`} className="h-4 w-4 accent-[#1A365D]" checked={picked.includes(s.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
                      </td>
                      <td className="px-4 py-2">{s.roll ?? "—"}</td>
                      <td className="px-4 py-2">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-[11px] text-on-surface-variant/70">
                          {s.admissionNo}
                          {s.result && <span className={cn("ml-2 font-bold", s.result === "Needs improvement" ? "text-error" : "text-emerald-700")}>· {s.result}</span>}
                        </p>
                      </td>
                      <td className={cn("px-4 py-2", s.attendance != null && s.attendance < 75 && "text-error font-bold")}>{s.attendance == null ? "—" : `${s.attendance}%`}</td>
                      <td className={cn("px-4 py-2", s.dues > 0 && "text-amber-700 font-semibold")}>{s.dues ? rupees(s.dues) : "—"}</td>
                      <td className="px-4 py-2">
                        <Select value={c.outcome} onChange={(o) => setOne(s.id, { outcome: o as Outcome }, v)} options={(Object.keys(OUTCOME) as Outcome[]).filter((o) => o !== "promoted" || v.nextClass).map((o) => ({ value: o, label: OUTCOME[o].label }))} disabled={blocked} className="w-40" />
                      </td>
                      <td className="px-4 py-2">
                        {options.length ? (
                          <Select value={c.toSectionId ?? ""} onChange={(x) => setOne(s.id, { toSectionId: x || null }, v)} options={[{ value: "", label: "Choose…" }, ...options.map((o) => ({ value: o.id, label: o.label }))]} disabled={blocked} className="w-36" />
                        ) : (
                          <span className="text-xs text-on-surface-variant/60">{c.outcome === "passed_out" ? "Leaves the school" : c.outcome === "leaving" ? "TC is asked for" : "No section yet"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {done.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Done</h3>
            <button type="button" onClick={() => undo(done.map((s) => s.id))} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
              Undo all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {done.map((s) => (
                  <tr key={s.id} className="border-t border-outline-variant/10">
                    <td className="px-5 py-2 font-semibold">{s.name}</td>
                    <td className="px-5 py-2">
                      <Pill tone={OUTCOME[s.done!.outcome].tone}>{OUTCOME[s.done!.outcome].label}</Pill>
                    </td>
                    <td className="px-5 py-2 text-xs">{s.done!.toSection ?? ""}</td>
                    <td className="px-5 py-2 text-xs text-on-surface-variant/70">{s.done!.carried ? `${rupees(s.done!.carried)} dues carried` : ""}</td>
                    <td className="px-5 py-2 text-right">
                      <button type="button" onClick={() => undo([s.id])} className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70">
                        Undo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {!v.students.length && <Card className="text-center text-on-surface-variant/70 py-12">No students in this section.</Card>}
    </div>
  );
}

function Promotion() {
  const [yearId, setYearId] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const o = useQuery({ queryKey: ["promotion-overview", yearId], queryFn: () => promotionApi.overview(yearId), enabled: !!yearId });
  const d = o.data;
  const totals = d?.sections.reduce((a, s) => ({ students: a.students + s.students, done: a.done + s.done }), { students: 0, done: 0 });
  return (
    <>
      <PageHeader
        title="Promotion"
        description="At the end of a session: promote each section to the next class, keep back, pass out the last class, or mark students leaving (a TC is asked for)."
        actions={
          <Link href="/students/tc" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Transfer certificates
          </Link>
        }
      />
      <Card className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-72">
          <YearSelect
            label="Promote from session"
            value={yearId}
            onChange={(id) => {
              setYearId(id);
              setSection(null);
            }}
          />
        </div>
        {d && (
          <p className="text-sm text-on-surface-variant">
            {d.to ? (
              <>
                into <b>{d.to.name}</b>
                {d.to.status === "closed" && <span className="text-error font-semibold"> (closed: reopen it in Academic Years)</span>}
              </>
            ) : (
              <span className="text-error font-semibold">There is no next session yet: add it in Academic Years.</span>
            )}
            {totals && ` · ${totals.done} of ${totals.students} students done`}
          </p>
        )}
      </Card>
      {o.isError && <FormAlert>{errorMessage(o.error)}</FormAlert>}
      {yearId && !d && !o.isError && <PageLoader />}
      {d && section && <SectionScreen yearId={yearId} sectionId={section} onBack={() => setSection(null)} />}
      {d && !section && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Section</th>
                  <th className="px-5 py-3 font-bold">Goes to</th>
                  <th className="px-5 py-3 font-bold">Done</th>
                  <th className="px-5 py-3 font-bold">Result</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {d.sections.map((s) => (
                  <tr key={s.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low cursor-pointer" onClick={() => setSection(s.id)}>
                    <td className="px-5 py-3 font-semibold">{s.label}</td>
                    <td className="px-5 py-3 text-xs">{s.nextClass ?? (d.to ? "Pass out" : "—")}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-surface-container overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${s.students ? (s.done / s.students) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs">
                          {s.done}/{s.students}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[11px] text-on-surface-variant/70">
                      {[s.promoted && `${s.promoted} promoted`, s.detained && `${s.detained} kept back`, s.passedOut && `${s.passedOut} passed out`, s.leaving && `${s.leaving} leaving`].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-bold uppercase tracking-widest text-primary">Open</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

export default function PromotionPage() {
  return (
    <RequirePermission permission="promotion.manage">
      <Promotion />
    </RequirePermission>
  );
}
