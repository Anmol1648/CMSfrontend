"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { academicApi, YearClasses } from "@/lib/api/academic";
import { cn } from "@/lib/utils";

type Row = { runs: boolean; admissionsOpen: boolean; seats: string };

/** What uses a class in the session, in words ("34 students · 2 sections · fees"). */
const usedText = (u: YearClasses["classes"][number]["used"]) =>
  [u.students && `${u.students} students`, u.sections && `${u.sections} section${u.sections === 1 ? "" : "s"}`, u.subjects && `${u.subjects} subjects`, u.fees && "fees set", u.timetable && "timetable", u.enquiries && `${u.enquiries} enquiries`].filter(Boolean).join(" · ");

/**
 * The classes a session runs: tick the ones it has (Bal Vatika can stop one year without touching
 * the others), with whether admissions are open and the seats for new admissions.
 */
export function SessionClasses({ yearId, onClose }: { yearId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["year-classes", yearId], queryFn: () => academicApi.yearClasses(yearId) });
  const [rows, setRows] = useState<Record<string, Row> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setRows(Object.fromEntries(q.data.classes.map((c) => [c.id, { runs: c.runs, admissionsOpen: c.admissionsOpen, seats: c.seats == null ? "" : String(c.seats) }])));
  }, [q.data]);
  const d = q.data;
  const closed = d?.year.status === "closed";
  const set = (id: string, patch: Partial<Row>) => setRows((r) => (r ? { ...r, [id]: { ...r[id], ...patch } } : r));
  const save = async () => {
    if (!rows) return;
    setError(null);
    setBusy(true);
    try {
      await academicApi.saveYearClasses(
        yearId,
        Object.entries(rows)
          .filter(([, r]) => r.runs)
          .map(([classId, r]) => ({ classId, admissionsOpen: r.admissionsOpen, seats: r.seats.trim() === "" ? null : Number(r.seats) }))
      );
      showToast(`${d?.year.name}: classes saved`, "success");
      for (const k of ["year-classes", "academic-classes", "academic-class-options", "academic-years"]) queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const running = rows ? Object.values(rows).filter((r) => r.runs).length : 0;
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={d ? `Classes in ${d.year.name}` : "Classes in the session"} width="max-w-3xl">
      {!d || !rows ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Tick the classes this session runs. Dropdowns of this session (admissions, fees, timetable, attendance, reports) show only these. Other sessions are not changed.
          </p>
          {closed && <FormAlert tone="info">{d.year.name} is closed: reopen it to change its classes.</FormAlert>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-3 py-2 font-bold">Runs</th>
                  <th className="px-3 py-2 font-bold">Class</th>
                  <th className="px-3 py-2 font-bold">Admissions open</th>
                  <th className="px-3 py-2 font-bold">Seats</th>
                  <th className="px-3 py-2 font-bold">In use</th>
                </tr>
              </thead>
              <tbody>
                {d.classes.map((c) => {
                  const r = rows[c.id];
                  const inUse = !!(c.used.students || c.used.sections || c.used.fees || c.used.timetable || c.used.enquiries);
                  return (
                    <tr key={c.id} className={cn("border-t border-outline-variant/10", !r.runs && "opacity-60")}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`${c.name} runs in ${d.year.name}`}
                          className="h-4 w-4 accent-[#1A365D]"
                          checked={r.runs}
                          disabled={closed || busy || (r.runs && inUse)}
                          title={r.runs && inUse ? "In use this session: remove its sections, fees and students first" : undefined}
                          onChange={(e) => set(c.id, { runs: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        {c.name}
                        {!c.classActive && <Pill>Stopped</Pill>}
                      </td>
                      <td className="px-3 py-2">{r.runs && <Checkbox label="" checked={r.admissionsOpen} disabled={closed || busy} onChange={(v) => set(c.id, { admissionsOpen: v })} />}</td>
                      <td className="px-3 py-2">
                        {r.runs && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              aria-label={`Seats in ${c.name}`}
                              value={r.seats}
                              disabled={closed || busy}
                              onChange={(e) => set(c.id, { seats: e.target.value })}
                              placeholder="—"
                              className="w-20 rounded-lg bg-surface-container-low px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                            />
                            {c.seatsLeft != null && r.seats === String(c.seats) && <span className={cn("text-[11px]", c.seatsLeft < 0 ? "text-error font-bold" : "text-on-surface-variant/70")}>{c.seatsLeft} left</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-on-surface-variant/70">{usedText(c.used) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-on-surface-variant/60">A class in use this session (students, sections, fees, timetable or enquiries) can’t be unticked until those are removed. Seats are compared with the students placed in the class.</p>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">{running} classes run in {d.year.name}</span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={save} loading={busy} disabled={closed}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
