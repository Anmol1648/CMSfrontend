"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { errorMessage } from "@/lib/api/client";
import { todayIST } from "@/lib/api/attendance";
import { studentsApi } from "@/lib/api/students";
import { Tc, tcApi } from "@/lib/api/promotion";

/** Asking for a TC for a student (search by name or admission number). */
export function AskTc({ studentId, studentName, onClose, onDone }: { studentId?: string; studentName?: string; onClose: () => void; onDone: (t: Tc) => void }) {
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState<{ id: string; label: string } | null>(studentId ? { id: studentId, label: studentName ?? "" } : null);
  const [leavingDate, setLeavingDate] = useState(todayIST());
  const [reasonId, setReasonId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const found = useQuery({ queryKey: ["tc-student-search", search], queryFn: () => studentsApi.list({ search, pageSize: 8 }), enabled: search.trim().length >= 2 && !student });
  const save = async () => {
    if (!student) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await tcApi.request({ studentId: student.id, leavingDate, reasonId: reasonId || null, remarks: remarks.trim() || null }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Ask for a transfer certificate">
      <div className="space-y-4">
        {student ? (
          <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
            <span className="font-semibold">{student.label}</span>
            {!studentId && (
              <button type="button" className="text-xs font-bold uppercase tracking-widest text-primary" onClick={() => setStudent(null)}>
                Change
              </button>
            )}
          </div>
        ) : (
          <div>
            <Input label="Student" placeholder="Name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
            <div className="mt-2 space-y-1">
              {(found.data?.items ?? []).map((s) => (
                <button key={s.id} type="button" onClick={() => setStudent({ id: s.id, label: `${s.name} · ${s.admissionNo}${s.section ? ` · ${s.section.label}` : ""}` })} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-container-low">
                  {s.name} <span className="text-xs text-on-surface-variant">· {s.admissionNo}{s.section ? ` · ${s.section.label}` : ""}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Input label="Leaving on" type="date" value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} />
        <MasterSelect master="leaving_reason" label="Reason" value={reasonId} onChange={setReasonId} placeholder="Choose…" />
        <Input label="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={300} />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!student || !leavingDate}>
            Ask for TC
          </Button>
        </div>
      </div>
    </Modal>
  );
}
