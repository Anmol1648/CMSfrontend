"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { RecordHistory } from "@/components/admin/RecordHistory";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AcademicYear, academicApi } from "@/lib/api/academic";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

const showDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function YearDialog({ year, years, onClose, onSaved }: { year: AcademicYear | null; years: AcademicYear[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(year?.name ?? "");
  const [startDate, setStartDate] = useState(year?.startDate ?? "");
  const [endDate, setEndDate] = useState(year?.endDate ?? "");
  const [isCurrent, setIsCurrent] = useState(false);
  const [copyFrom, setCopyFrom] = useState(year ? "" : years.find((y) => y.isCurrent)?.id ?? years[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // A new year starts from the suggestion: right after the latest year.
  useEffect(() => {
    if (year) return;
    academicApi
      .suggestYear()
      .then((s) => {
        setName((n) => n || s.name);
        setStartDate((d) => d || s.startDate);
        setEndDate((d) => d || s.endDate);
      })
      .catch(() => undefined);
  }, [year]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      if (year) {
        await academicApi.updateYear(year.id, { name, startDate, endDate });
        onSaved(`${name} saved`);
      } else {
        await academicApi.createYear({ name, startDate, endDate, isCurrent, ...(copyFrom ? { copyFromYearId: copyFrom } : {}) });
        onSaved(`${name} added`);
      }
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors() : {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={year ? `Edit ${year.name}` : "Add academic year"} width="max-w-xl">
      <form onSubmit={save} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} maxLength={40} disabled={busy} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Starts on" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={fieldErrors.startDate} disabled={busy} />
          <Input label="Ends on" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} error={fieldErrors.endDate} disabled={busy} />
        </div>
        {!year && (
          <>
            {years.length > 0 && (
              <Select
                label="Copy classes' sections and subjects from"
                value={copyFrom}
                onChange={setCopyFrom}
                options={[{ value: "", label: "Don't copy (start empty)" }, ...years.map((y) => ({ value: y.id, label: y.name }))]}
                disabled={busy}
              />
            )}
            <Checkbox label="Make it the current year now" hint="Screens open on the current year. You can switch later." checked={isCurrent} onChange={setIsCurrent} disabled={busy} />
          </>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <div className="w-32">
            <SubmitButton busy={busy} busyLabel="Saving…" disabled={!name.trim() || !startDate || !endDate} className="py-2.5">
              {year ? "Save" : "Add"}
            </SubmitButton>
          </div>
        </div>
      </form>
      {year && (
        <div className="mt-6 -mx-2">
          <RecordHistory entity="academic_year" id={year.id} />
        </div>
      )}
    </Modal>
  );
}

function CopyDialog({ target, years, onClose, onDone }: { target: AcademicYear; years: AcademicYear[]; onClose: () => void; onDone: (message: string) => void }) {
  const sources = years.filter((y) => y.id !== target.id);
  const [from, setFrom] = useState(sources[0]?.id ?? "");
  const [sections, setSections] = useState(true);
  const [subjects, setSubjects] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await academicApi.copyYear(target.id, from, { sections, subjects });
      onDone(`Copied ${r.sections} section${r.sections === 1 ? "" : "s"} and ${r.subjects} class subject${r.subjects === 1 ? "" : "s"} into ${target.name}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Copy set-up into ${target.name}`} width="max-w-xl">
      <div className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <Select label="From" value={from} onChange={setFrom} options={sources.map((y) => ({ value: y.id, label: y.name }))} disabled={busy} />
        <Checkbox label="Sections" hint="With stream, capacity, room and class teacher (teachers who have left are not copied)." checked={sections} onChange={setSections} disabled={busy} />
        <Checkbox label="Subjects of each class" checked={subjects} onChange={setSubjects} disabled={busy} />
        <p className="text-xs text-on-surface-variant/70">Classes that already have sections or subjects in {target.name} are left as they are.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={copy} disabled={busy || !from || (!sections && !subjects)}>
            {busy ? "Copying…" : "Copy"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Years() {
  const { can } = useAuth();
  const canManage = can("academic.manage");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const years = useQuery({ queryKey: ["academic-years"], queryFn: academicApi.years });
  const [editing, setEditing] = useState<AcademicYear | "new" | null>(null);
  const [copying, setCopying] = useState<AcademicYear | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; label: string; run: () => Promise<unknown>; done: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    await queryClient.invalidateQueries({ queryKey: ["academic-year-options"] });
    await queryClient.invalidateQueries({ queryKey: ["academic-classes"] });
  };
  const saved = async (message: string) => {
    setEditing(null);
    setCopying(null);
    showToast(message, "success");
    await refresh();
  };
  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.run();
      showToast(confirm.done, "success");
      await refresh();
      setConfirm(null);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const list = years.data ?? [];

  return (
    <>
      <PageHeader
        title="Academic Years"
        description="Sessions of the school. The current year is the one every screen opens on; a closed year can no longer be changed."
        actions={canManage && <Button onClick={() => setEditing("new")}>Add academic year</Button>}
      />
      {years.isError && <FormAlert>{errorMessage(years.error)}</FormAlert>}
      <Card padding="none" className="overflow-hidden max-w-5xl">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-6 py-3 font-bold">Year</th>
              <th className="px-6 py-3 font-bold">Dates</th>
              <th className="px-6 py-3 font-bold">Set up</th>
              <th className="px-6 py-3 font-bold">Status</th>
              {canManage && <th className="px-6 py-3" />}
            </tr>
          </thead>
          <tbody>
            {list.map((y) => (
              <tr key={y.id} onClick={canManage ? () => setEditing(y) : undefined} className={`border-t border-outline-variant/10 hover:bg-surface-container-low/60 ${canManage ? "cursor-pointer" : ""}`}>
                <td className="px-6 py-4 font-bold text-primary whitespace-nowrap">{y.name}</td>
                <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                  {showDate(y.startDate)} – {showDate(y.endDate)}
                </td>
                <td className="px-6 py-4 text-on-surface-variant">
                  {y.sections} section{y.sections === 1 ? "" : "s"} · {y.classSubjects} class subject{y.classSubjects === 1 ? "" : "s"}
                </td>
                <td className="px-6 py-4 space-x-1">
                  {y.isCurrent && <Pill tone="primary">Current</Pill>}
                  {y.status === "closed" ? <Pill>Closed</Pill> : <Pill tone="success">Open</Pill>}
                </td>
                {canManage && (
                  <td className="px-6 py-4 text-right whitespace-nowrap space-x-4" onClick={(e) => e.stopPropagation()}>
                    {!y.isCurrent && y.status === "open" && (
                      <button
                        className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70"
                        onClick={() => setConfirm({ title: `Make ${y.name} the current year?`, text: "Screens will open on this year from now on.", label: "Make current", run: () => academicApi.setCurrent(y.id), done: `${y.name} is now the current year` })}
                      >
                        Make current
                      </button>
                    )}
                    {list.length > 1 && y.status === "open" && (
                      <button className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => setCopying(y)}>
                        Copy set-up
                      </button>
                    )}
                    {y.status === "open" && !y.isCurrent && (
                      <button
                        className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70"
                        onClick={() => setConfirm({ title: `Close ${y.name}?`, text: "Its sections and subjects can no longer be changed. You can reopen it later.", label: "Close year", run: () => academicApi.closeYear(y.id), done: `${y.name} closed` })}
                      >
                        Close
                      </button>
                    )}
                    {y.status === "closed" && (
                      <button className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => setConfirm({ title: `Reopen ${y.name}?`, text: "Its sections and subjects can be changed again.", label: "Reopen", run: () => academicApi.reopenYear(y.id), done: `${y.name} reopened` })}>
                        Reopen
                      </button>
                    )}
                    {!y.isCurrent && !y.sections && !y.classSubjects && (
                      <button className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70" onClick={() => setConfirm({ title: `Delete ${y.name}?`, text: "It has nothing set up, so nothing else is affected.", label: "Delete", run: () => academicApi.deleteYear(y.id), done: `${y.name} deleted` })}>
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {years.data && !list.length && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant/70">
                  No academic years yet. Add the current one to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>

      {editing && <YearDialog year={editing === "new" ? null : editing} years={list} onClose={() => setEditing(null)} onSaved={saved} />}
      {copying && <CopyDialog target={copying} years={list} onClose={() => setCopying(null)} onDone={saved} />}
      {confirm && (
        <Modal isOpen onClose={() => !busy && setConfirm(null)} title={confirm.title}>
          <p className="text-sm text-on-surface-variant">{confirm.text}</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runConfirm} disabled={busy}>
              {busy ? "Working…" : confirm.label}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function AcademicYearsPage() {
  return (
    <RequirePermission permission="academic.view">
      <Years />
    </RequirePermission>
  );
}
